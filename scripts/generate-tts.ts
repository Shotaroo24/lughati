/**
 * Pre-generate Arabic TTS audio via OpenAI TTS and upload to Supabase Storage.
 *
 * Usage: npx tsx scripts/generate-tts.ts
 *
 * Required env vars (in .env):
 *   OPENAI_API_KEY
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// ---------------------------------------------------------------------------
// Load .env manually (no dotenv dependency required — tsx resolves from CWD)
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

const OPENAI_API_KEY = env['OPENAI_API_KEY'] ?? process.env['OPENAI_API_KEY']
const SUPABASE_URL = env['VITE_SUPABASE_URL'] ?? process.env['VITE_SUPABASE_URL']
const SUPABASE_SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'] ?? process.env['SUPABASE_SERVICE_ROLE_KEY']

if (!OPENAI_API_KEY) {
  console.error('❌  OPENAI_API_KEY が見つかりません。')
  console.error('    .env に以下を追加してください:')
  console.error('    OPENAI_API_KEY=sk-...')
  process.exit(1)
}
if (!SUPABASE_URL) {
  console.error('❌  VITE_SUPABASE_URL が見つかりません。.env を確認してください。')
  process.exit(1)
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌  SUPABASE_SERVICE_ROLE_KEY が見つかりません。.env に追加してください。')
  console.error('    Supabase Dashboard → Project Settings → API → service_role key')
  process.exit(1)
}

// ---------------------------------------------------------------------------
// OpenAI TTS config
// ---------------------------------------------------------------------------

const OPENAI_TTS_MODEL = 'gpt-4o-mini-tts'
const OPENAI_TTS_VOICE = 'shimmer'
const OPENAI_TTS_INSTRUCTIONS = 'Speak this Arabic phrase warmly and naturally, as if gently telling it to a friend. Sound soft, kind, and effortlessly fluent — like a native speaker in everyday conversation. Do not over-enunciate. Let the words flow together smoothly and naturally.'
const TTS_BUCKET = 'tts'
const DELAY_MS = 500  // rate-limit buffer between requests

// ---------------------------------------------------------------------------
// Supabase client (service role — bypasses RLS)
// ---------------------------------------------------------------------------

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function generateAudio(text: string): Promise<Buffer> {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_TTS_MODEL,
      voice: OPENAI_TTS_VOICE,
      input: text,
      instructions: OPENAI_TTS_INSTRUCTIONS,
      speed: 1.6,
      response_format: 'mp3',
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`OpenAI TTS API ${res.status}: ${errText}`)
  }

  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

async function uploadToStorage(cardId: string, audioBuffer: Buffer): Promise<string> {
  const filePath = `${cardId}.mp3`

  const { error: uploadError } = await supabase.storage
    .from(TTS_BUCKET)
    .upload(filePath, audioBuffer, {
      contentType: 'audio/mpeg',
      upsert: true,
    })

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`)
  }

  const { data } = supabase.storage.from(TTS_BUCKET).getPublicUrl(filePath)
  return data.publicUrl
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface Card {
  id: string
  arabic: string
  audio_url: string | null
}

async function main() {
  console.log('🎙  OpenAI TTS pre-generation スタート\n')

  // Fetch all cards with pagination (Supabase default limit is 1000)
  const allCards: Card[] = []
  const PAGE_SIZE = 1000
  let offset = 0
  while (true) {
    const { data, error: fetchError } = await supabase
      .from('cards')
      .select('id, arabic, audio_url')
      .order('created_at', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)

    if (fetchError) {
      console.error('❌  カード取得エラー:', fetchError.message)
      process.exit(1)
    }
    if (!data || data.length === 0) break
    allCards.push(...(data as Card[]))
    if (data.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  if (allCards.length === 0) {
    console.log('カードが見つかりません。')
    return
  }

  const cards = allCards
  const alreadyDone = cards.filter(c => c.audio_url)
  const pending = cards.filter(c => !c.audio_url)

  const limitArg = process.argv.find(a => a.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined
  const toProcess = limit ? pending.slice(0, limit) : pending

  // ── Pre-run summary ──
  const estimatedChars = toProcess.reduce((sum, c) => sum + c.arabic.length, 0)
  const estimatedCost = ((estimatedChars / 1_000_000) * 15).toFixed(4) // $15 per 1M chars
  console.log(`📊  カード総数:      ${cards.length} 件`)
  console.log(`✅  スキップ (済み): ${alreadyDone.length} 件`)
  console.log(`⏳  未処理:         ${pending.length} 件`)
  console.log(`🎯  今回処理:       ${toProcess.length} 件`)
  console.log(`📝  推定文字数:     ${estimatedChars.toLocaleString()} 文字`)
  console.log(`💰  推定コスト:     $${estimatedCost} (tts-1 $15/1M chars)`)
  console.log('')

  if (toProcess.length === 0) {
    console.log('処理対象のカードがありません。全件完了済みです。')
    return
  }

  let succeeded = 0
  let failed = 0
  const failedList: string[] = []

  for (let i = 0; i < toProcess.length; i++) {
    const card = toProcess[i]
    process.stdout.write(`[${i + 1}/${toProcess.length}] ${card.arabic.padEnd(20)}  `)

    try {
      const audioBuffer = await generateAudio(card.arabic)
      const publicUrl = await uploadToStorage(card.id, audioBuffer)

      const { error: updateError } = await supabase
        .from('cards')
        .update({ audio_url: publicUrl })
        .eq('id', card.id)

      if (updateError) throw new Error(`DB update failed: ${updateError.message}`)

      console.log('✅ OK')
      succeeded++
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.log(`❌ FAIL: ${message}`)
      failed++
      failedList.push(`${card.arabic} [${card.id.slice(0, 8)}]: ${message}`)
    }

    if (i < toProcess.length - 1) {
      await sleep(DELAY_MS)
    }
  }

  // ── Final summary ──
  const skipped = alreadyDone.length
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`成功:     ${succeeded} 件`)
  console.log(`失敗:     ${failed} 件`)
  console.log(`スキップ: ${skipped} 件 (既にaudio_urlあり)`)

  if (failedList.length > 0) {
    console.log('\n❌  失敗リスト (要リトライ):')
    failedList.forEach(f => console.log('  -', f))
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
