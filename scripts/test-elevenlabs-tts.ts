/**
 * ElevenLabs TTS テスト — 1件だけ生成してSupabaseに保存し、URLを表示する
 *
 * Usage: npx tsx scripts/test-elevenlabs-tts.ts
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
// ElevenLabs config
// ---------------------------------------------------------------------------

const ELEVENLABS_VOICE_ID = 'a1KZUXKFVFDOb33I1uqr'
const ELEVENLABS_MODEL = 'eleven_multilingual_v2'
const TTS_BUCKET = 'tts'
const TEST_CASES = [
  { text: 'مرحبا، كيف حالك؟',    key: '__test-el-1__.mp3' },
  { text: 'المدرسة كبيرة',        key: '__test-el-2__.mp3' },
  { text: 'وش تسوي اليوم؟',      key: '__test-el-3__.mp3' },
]

// ---------------------------------------------------------------------------
// Supabase client
// ---------------------------------------------------------------------------

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ---------------------------------------------------------------------------
// Arabic text normalization
// ---------------------------------------------------------------------------

/**
 * Strip tashkeel (harakat) from Arabic text so ElevenLabs doesn't misread
 * taa marbuta (ة) as "ta" and doesn't over-enunciate vowel marks.
 * Removes: fatha, damma, kasra, tanwin variants, sukun, shadda (U+064B–U+0652)
 */
function stripTashkeel(text: string): string {
  return text.replace(/[\u064B-\u0652]/g, '')
}

// ---------------------------------------------------------------------------
// ElevenLabs TTS
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('🎙  ElevenLabs TTS テスト開始')
  console.log(`   Voice ID: ${ELEVENLABS_VOICE_ID}`)
  console.log(`   Model:    ${ELEVENLABS_MODEL}`)
  console.log(`   Settings: stability=0.3, similarity_boost=0.5, style=0.7\n`)

  for (let i = 0; i < TEST_CASES.length; i++) {
    const { text, key } = TEST_CASES[i]
    const normalized = stripTashkeel(text)
    console.log(`[${i + 1}/3] "${text}"${normalized !== text ? ` → タシュキール除去: "${normalized}"` : ''}`)

    const audioBuffer = await generateAudio(text)

    const { error: uploadError } = await supabase.storage
      .from(TTS_BUCKET)
      .upload(key, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true,
      })

    if (uploadError) {
      throw new Error(`Storage upload failed (${key}): ${uploadError.message}`)
    }

    const { data } = supabase.storage.from(TTS_BUCKET).getPublicUrl(key)
    console.log(`    ✅  ${audioBuffer.byteLength.toLocaleString()} bytes`)
    console.log(`    🔊  ${data.publicUrl}\n`)
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('全3件完了。OKなら全件生成に進んでください。')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
