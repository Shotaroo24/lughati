import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GOOGLE_TTS_API_KEY = Deno.env.get('GOOGLE_TTS_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

// In-memory rate limiter: userId -> { count, windowStart }
const rateLimitMap = new Map<string, { count: number; windowStart: number }>()
const RATE_LIMIT = 50       // requests
const RATE_WINDOW_MS = 60_000 // per minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)

  if (!entry || now - entry.windowStart >= RATE_WINDOW_MS) {
    rateLimitMap.set(userId, { count: 1, windowStart: now })
    return true
  }

  if (entry.count >= RATE_LIMIT) return false

  entry.count++
  return true
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS })
  }

  // ── JWT検証 ───────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('認証エラー', { status: 401, headers: CORS_HEADERS })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  // Allow anon key access for guest users
  const authToken = authHeader.replace(/^Bearer\s+/i, '')
  const isAnonAccess = !user && authToken === SUPABASE_ANON_KEY

  if ((authError || !user) && !isAnonAccess) {
    return new Response('認証エラー', { status: 401, headers: CORS_HEADERS })
  }

  // ── レート制限 ────────────────────────────────────────────────────────────
  const rateLimitKey = user?.id ?? 'anon'
  if (!checkRateLimit(rateLimitKey)) {
    return new Response('レート制限超過', { status: 429, headers: CORS_HEADERS })
  }

  // ── リクエスト解析 ────────────────────────────────────────────────────────
  let text: string
  let voice: string
  try {
    const body = await req.json()
    text = body.text
    voice = body.voice ?? 'ar-XA-Wavenet-A'
  } catch {
    return new Response('リクエスト解析エラー', { status: 400, headers: CORS_HEADERS })
  }

  if (!text || typeof text !== 'string' || text.trim() === '') {
    return new Response('テキストが必要です', { status: 400, headers: CORS_HEADERS })
  }

  if (!GOOGLE_TTS_API_KEY) {
    return new Response('サーバー設定エラー', { status: 500, headers: CORS_HEADERS })
  }

  // ── Google Cloud TTS呼び出し ──────────────────────────────────────────────
  try {
    const ttsRes = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: text.trim() },
          voice: { languageCode: 'ar-XA', name: voice },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 0.85,
            pitch: 0.0,
          },
        }),
      },
    )

    if (!ttsRes.ok) {
      const errText = await ttsRes.text()
      console.error('Google TTS error:', ttsRes.status, errText)
      return new Response('TTS APIエラー', { status: 500, headers: CORS_HEADERS })
    }

    const { audioContent } = await ttsRes.json()
    if (!audioContent) {
      return new Response('音声データなし', { status: 500, headers: CORS_HEADERS })
    }

    // Base64 → バイナリ
    const audioBytes = Uint8Array.from(atob(audioContent), (c) => c.charCodeAt(0))

    return new Response(audioBytes, {
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=2592000', // 30日
      },
    })
  } catch (err) {
    console.error('TTS unexpected error:', err)
    return new Response('サーバーエラー', { status: 500, headers: CORS_HEADERS })
  }
})
