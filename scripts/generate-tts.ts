/**
 * Pre-generate Arabic TTS audio via ElevenLabs and upload to Supabase Storage.
 *
 * Usage: npx tsx scripts/generate-tts.ts
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

const ELEVENLABS_API_KEY = env['ELEVENLABS_API_KEY'] ?? process.env['ELEVENLABS_API_KEY']
const SUPABASE_URL = env['VITE_SUPABASE_URL'] ?? process.env['VITE_SUPABASE_URL']
const SUPABASE_SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'] ?? process.env['SUPABASE_SERVICE_ROLE_KEY']

if (!ELEVENLABS_API_KEY) {
  console.error('❌  ELEVENLABS_API_KEY が見つかりません。.env を確認してください。')
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
// ElevenLabs config
// ---------------------------------------------------------------------------

const VOICE_ID = 'kdUY91gH5xyDHapxlthT' // Hana - Casual & Relatable
const MODEL_ID = 'eleven_multilingual_v2'
const OUTPUT_FORMAT = 'mp3_44100_128'
const TTS_BUCKET = 'tts'
const DELAY_MS = 500 // rate-limit buffer between requests

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
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=${OUTPUT_FORMAT}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
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
}

async function main() {
  console.log('🎙  ElevenLabs TTS pre-generation スタート\n')

  // Fetch all cards
  const { data: cards, error: fetchError } = await supabase
    .from('cards')
    .select('id, arabic')
    .order('created_at', { ascending: true })

  if (fetchError) {
    console.error('❌  カード取得エラー:', fetchError.message)
    process.exit(1)
  }

  if (!cards || cards.length === 0) {
    console.log('カードが見つかりません。')
    return
  }

  console.log(`📋  ${cards.length} 件のカードを処理します\n`)

  const failed: string[] = []

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i] as Card
    process.stdout.write(`Processing ${i + 1}/${cards.length}  [${card.id.slice(0, 8)}]  ${card.arabic}  ...  `)

    try {
      // Generate audio
      const audioBuffer = await generateAudio(card.arabic)

      // Upload to Supabase Storage
      const publicUrl = await uploadToStorage(card.id, audioBuffer)

      // Update cards table
      const { error: updateError } = await supabase
        .from('cards')
        .update({ audio_url: publicUrl })
        .eq('id', card.id)

      if (updateError) {
        throw new Error(`DB update failed: ${updateError.message}`)
      }

      console.log('✅')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.log(`❌  ${message}`)
      failed.push(`${card.id} (${card.arabic}): ${message}`)
    }

    // Rate-limit buffer (skip delay after last item)
    if (i < cards.length - 1) {
      await sleep(DELAY_MS)
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅  完了: ${cards.length - failed.length}/${cards.length} 件成功`)

  if (failed.length > 0) {
    console.log(`\n❌  失敗した ${failed.length} 件 (要リトライ):`)
    failed.forEach(f => console.log('  -', f))
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
