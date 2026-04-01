/**
 * Pre-generate Arabic TTS audio for a specific deck or folder via ElevenLabs.
 *
 * Usage:
 *   npx tsx scripts/generate-tts-deck.ts --folder="Words From Book (Fusuha)" [--limit=500]
 *   npx tsx scripts/generate-tts-deck.ts --deck="Part 1" [--limit=500]
 *
 * Required env vars (in .env):
 *   ELEVENLABS_API_KEY
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
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
  console.error('❌  ELEVENLABS_API_KEY が見つかりません。.env に ELEVENLABS_API_KEY=... を追加してください。')
  process.exit(1)
}
if (!SUPABASE_URL) {
  console.error('❌  VITE_SUPABASE_URL が見つかりません。.env を確認してください。')
  process.exit(1)
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌  SUPABASE_SERVICE_ROLE_KEY が見つかりません。.env に追加してください。')
  process.exit(1)
}

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const deckArg = process.argv.find(a => a.startsWith('--deck='))
const folderArg = process.argv.find(a => a.startsWith('--folder='))
const limitArg = process.argv.find(a => a.startsWith('--limit='))

if (!deckArg && !folderArg) {
  console.error('❌  --folder="フォルダ名" または --deck="デッキ名" を指定してください。')
  console.error('    例: npx tsx scripts/generate-tts-deck.ts --folder="Words From Book (Fusuha)" --limit=500')
  process.exit(1)
}

const DECK_TITLE = deckArg ? deckArg.split('=').slice(1).join('=').replace(/^["']|["']$/g, '') : null
const FOLDER_NAME = folderArg ? folderArg.split('=').slice(1).join('=').replace(/^["']|["']$/g, '') : null
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined

// ---------------------------------------------------------------------------
// ElevenLabs config
// ---------------------------------------------------------------------------

const ELEVENLABS_VOICE_ID = 'a1KZUXKFVFDOb33I1uqr'
const ELEVENLABS_MODEL = 'eleven_multilingual_v2'
const TTS_BUCKET = 'tts'
const DELAY_MS = 300

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
  console.log(`🎙  ElevenLabs TTS pre-generation スタート`)

  let deckIds: string[]

  if (FOLDER_NAME) {
    // 1a. Find folder by name, then get all deck IDs in that folder
    console.log(`📁  対象フォルダ: "${FOLDER_NAME}"\n`)

    const { data: folders, error: folderError } = await supabase
      .from('folders')
      .select('id, name')
      .eq('name', FOLDER_NAME)

    if (folderError) {
      console.error('❌  フォルダ取得エラー:', folderError.message)
      process.exit(1)
    }
    if (!folders || folders.length === 0) {
      console.error(`❌  フォルダが見つかりません: "${FOLDER_NAME}"`)
      process.exit(1)
    }

    const folderIds = folders.map(f => f.id)
    const { data: decks, error: deckError } = await supabase
      .from('decks')
      .select('id, title')
      .in('folder_id', folderIds)
      .order('created_at', { ascending: true })

    if (deckError) {
      console.error('❌  デッキ取得エラー:', deckError.message)
      process.exit(1)
    }
    if (!decks || decks.length === 0) {
      console.error(`❌  フォルダ内にデッキが見つかりません: "${FOLDER_NAME}"`)
      process.exit(1)
    }

    deckIds = decks.map(d => d.id)
    console.log(`✅  フォルダ内デッキ (${decks.length}件): ${decks.map(d => d.title).join(', ')}\n`)
  } else {
    // 1b. Find deck by title
    console.log(`📚  対象デッキ: "${DECK_TITLE}"\n`)

    const { data: decks, error: deckError } = await supabase
      .from('decks')
      .select('id, title')
      .eq('title', DECK_TITLE)

    if (deckError) {
      console.error('❌  デッキ取得エラー:', deckError.message)
      process.exit(1)
    }
    if (!decks || decks.length === 0) {
      console.error(`❌  デッキが見つかりません: "${DECK_TITLE}"`)
      process.exit(1)
    }

    deckIds = decks.map(d => d.id)
    console.log(`✅  デッキID: ${deckIds.join(', ')}\n`)
  }

  // 2. Fetch all cards in those decks with pagination
  const allCards: Card[] = []
  const PAGE_SIZE = 1000
  let offset = 0

  while (true) {
    const { data, error: fetchError } = await supabase
      .from('cards')
      .select('id, arabic, audio_url')
      .in('deck_id', deckIds)
      .order('position', { ascending: true })
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

  const alreadyDone = allCards.filter(c => c.audio_url)
  const pending = allCards.filter(c => !c.audio_url)
  const toProcess = LIMIT ? pending.slice(0, LIMIT) : pending

  // Pre-run summary
  console.log(`📊  デッキ内カード総数:  ${allCards.length} 件`)
  console.log(`✅  スキップ (済み):    ${alreadyDone.length} 件`)
  console.log(`⏳  未処理:            ${pending.length} 件`)
  console.log(`🎯  今回処理:          ${toProcess.length} 件${LIMIT ? ` (--limit=${LIMIT})` : ''}`)
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

  // Final summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`成功:     ${succeeded} 件`)
  console.log(`失敗:     ${failed} 件`)
  console.log(`スキップ: ${alreadyDone.length} 件 (既にaudio_urlあり)`)

  if (pending.length > toProcess.length) {
    const remaining = pending.length - toProcess.length
    console.log(`\n⏭  残り ${remaining} 件あります。次回は同じコマンドを --limit なしで実行してください。`)
  }

  if (failedList.length > 0) {
    console.log('\n❌  失敗リスト (要リトライ):')
    failedList.forEach(f => console.log('  -', f))
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
