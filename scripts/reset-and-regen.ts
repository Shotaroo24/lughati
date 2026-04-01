/**
 * Full TTS reset and regeneration:
 *   Step 1: UPDATE cards SET audio_url = NULL
 *   Step 2: Delete all files in tts Supabase Storage bucket
 *   Step 3: Re-generate all cards via ElevenLabs
 *
 * Usage: npx tsx scripts/reset-and-regen.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// ---------------------------------------------------------------------------
// Load .env manually
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env')

function loadEnv(path: string): Record<string, string> {
  try {
    const raw = readFileSync(path, 'utf-8')
    const vars: Record<string, string> = {}
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
      vars[key] = value
    }
    return vars
  } catch {
    return {}
  }
}

const env = loadEnv(envPath)

const ELEVENLABS_API_KEY = env['ELEVENLABS_API_KEY'] ?? process.env['ELEVENLABS_API_KEY']
const SUPABASE_URL = env['VITE_SUPABASE_URL'] ?? process.env['VITE_SUPABASE_URL']
const SUPABASE_SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'] ?? process.env['SUPABASE_SERVICE_ROLE_KEY']

if (!ELEVENLABS_API_KEY) {
  console.error('❌  ELEVENLABS_API_KEY が見つかりません')
  process.exit(1)
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌  SUPABASE 環境変数が不足しています')
  process.exit(1)
}

const ELEVENLABS_VOICE_ID = 'a1KZUXKFVFDOb33I1uqr'
const ELEVENLABS_MODEL = 'eleven_multilingual_v2'
const TTS_BUCKET = 'tts'
const DELAY_MS = 300

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

function now() {
  return new Date().toLocaleTimeString('ja-JP')
}

function stripTashkeel(text: string): string {
  return text.replace(/[\u064B-\u0652]/g, '')
}

async function generateAudio(text: string): Promise<Buffer> {
  const normalized = stripTashkeel(text)
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY!,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text: normalized,
      model_id: ELEVENLABS_MODEL,
      voice_settings: {
        stability: 0.3,
        similarity_boost: 0.5,
        style: 0.7,
        use_speaker_boost: true,
      },
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`ElevenLabs API ${res.status}: ${errText}`)
  }

  return Buffer.from(await res.arrayBuffer())
}

// ---------------------------------------------------------------------------
// Step 1: DB reset
// ---------------------------------------------------------------------------

async function resetDatabase() {
  console.log(`\n[${now()}] ━━ Step 1: DB リセット ━━`)
  console.log('⏳  cards.audio_url を全件 NULL に更新中...')

  const { error, count } = await supabase
    .from('cards')
    .update({ audio_url: null })
    .not('id', 'is', null)
    .select('id', { count: 'exact', head: true })

  if (error) {
    throw new Error(`DB reset failed: ${error.message}`)
  }

  console.log(`✅  DB リセット完了 (${count ?? '?'} 件更新)`)
}

// ---------------------------------------------------------------------------
// Step 2: Storage wipe
// ---------------------------------------------------------------------------

async function wipeStorage() {
  console.log(`\n[${now()}] ━━ Step 2: Storage 全削除 ━━`)

  let totalDeleted = 0
  const LIST_LIMIT = 1000

  while (true) {
    const { data: files, error: listError } = await supabase.storage
      .from(TTS_BUCKET)
      .list('', { limit: LIST_LIMIT, offset: 0 })

    if (listError) throw new Error(`Storage list failed: ${listError.message}`)
    if (!files || files.length === 0) break

    // Filter out test files and folders
    const paths = files
      .filter(f => f.name && !f.id?.includes('/'))
      .map(f => f.name)

    if (paths.length === 0) break

    const { error: removeError } = await supabase.storage
      .from(TTS_BUCKET)
      .remove(paths)

    if (removeError) throw new Error(`Storage remove failed: ${removeError.message}`)

    totalDeleted += paths.length
    process.stdout.write(`\r⏳  削除中... ${totalDeleted} 件`)
  }

  console.log(`\n✅  Storage 全削除完了 (${totalDeleted} ファイル削除)`)
}

// ---------------------------------------------------------------------------
// Step 3: Re-generate all cards
// ---------------------------------------------------------------------------

interface Card {
  id: string
  arabic: string
  audio_url: string | null
}

async function regenerateAll() {
  console.log(`\n[${now()}] ━━ Step 3: ElevenLabs 全件再生成 ━━`)

  // Fetch all cards with pagination
  const allCards: Card[] = []
  const PAGE_SIZE = 1000
  let offset = 0

  while (true) {
    const { data, error } = await supabase
      .from('cards')
      .select('id, arabic, audio_url')
      .order('created_at', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)

    if (error) throw new Error(`Card fetch failed: ${error.message}`)
    if (!data || data.length === 0) break
    allCards.push(...(data as Card[]))
    if (data.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  const toProcess = allCards.filter(c => !c.audio_url)
  const startTime = Date.now()

  console.log(`📊  カード総数: ${allCards.length} 件`)
  console.log(`🎯  処理対象:  ${toProcess.length} 件\n`)

  let succeeded = 0
  let failed = 0
  const failedList: string[] = []

  for (let i = 0; i < toProcess.length; i++) {
    const card = toProcess[i]
    const progress = `[${i + 1}/${toProcess.length}]`

    // Progress report every 50 cards
    if (i > 0 && i % 50 === 0) {
      const elapsed = (Date.now() - startTime) / 1000
      const rate = i / elapsed
      const remaining = (toProcess.length - i) / rate
      const eta = new Date(Date.now() + remaining * 1000).toLocaleTimeString('ja-JP')
      console.log(`\n[${now()}] 📈  進捗: ${i}/${toProcess.length} 件 (✅${succeeded} ❌${failed}) — 残り約${Math.ceil(remaining / 60)}分 (ETA ${eta})\n`)
    }

    process.stdout.write(`${progress} ${card.arabic.slice(0, 18).padEnd(18)}  `)

    try {
      const audioBuffer = await generateAudio(card.arabic)

      const filePath = `${card.id}.mp3`
      const { error: uploadError } = await supabase.storage
        .from(TTS_BUCKET)
        .upload(filePath, audioBuffer, { contentType: 'audio/mpeg', upsert: true })

      if (uploadError) throw new Error(`Upload: ${uploadError.message}`)

      const { data: urlData } = supabase.storage.from(TTS_BUCKET).getPublicUrl(filePath)

      const { error: dbError } = await supabase
        .from('cards')
        .update({ audio_url: urlData.publicUrl })
        .eq('id', card.id)

      if (dbError) throw new Error(`DB update: ${dbError.message}`)

      console.log(`✅ ${audioBuffer.byteLength.toLocaleString()} bytes`)
      succeeded++
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.log(`❌ ${message}`)
      failed++
      failedList.push(`${card.arabic} [${card.id.slice(0, 8)}]: ${message}`)
    }

    if (i < toProcess.length - 1) {
      await sleep(DELAY_MS)
    }
  }

  const totalSec = Math.round((Date.now() - startTime) / 1000)
  const totalMin = Math.floor(totalSec / 60)

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅  成功: ${succeeded} 件`)
  console.log(`❌  失敗: ${failed} 件`)
  console.log(`⏱  所要時間: ${totalMin}分${totalSec % 60}秒`)

  if (failedList.length > 0) {
    console.log('\n❌  失敗リスト (要リトライ):')
    failedList.forEach(f => console.log('  -', f))
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('═══════════════════════════════════════════════════════')
  console.log('  Lughati TTS 全リセット＆再生成 (ElevenLabs)')
  console.log(`  開始: ${now()}`)
  console.log('═══════════════════════════════════════════════════════')

  await resetDatabase()
  await wipeStorage()
  await regenerateAll()

  console.log(`\n[${now()}] 🎉 全処理完了！`)
}

main().catch(err => {
  console.error(`\n[${now()}] Fatal error:`, err)
  process.exit(1)
})
