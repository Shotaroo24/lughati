import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const GOOGLE_TTS_API_KEY = Deno.env.get('GOOGLE_TTS_API_KEY')

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

// Decode JWT payload without network call (no signature verification needed for rate-limiting)
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = payload + '='.repeat((4 - payload.length % 4) % 4)
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
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

  // ── 認証チェック ──────────────────────────────────────────────────────────
  // Require either a valid Bearer JWT or a valid apikey header
  const authHeader = req.headers.get('Authorization')
  const apikeyHeader = req.headers.get('apikey')

  console.log('[tts] auth header present:', !!authHeader)
  console.log('[tts] apikey header present:', !!apikeyHeader)

  if (!authHeader && !apikeyHeader) {
    console.log('[tts] 401: no auth headers')
    return new Response('認証エラー', { status: 401, headers: CORS_HEADERS })
  }

  // Extract user ID from JWT for rate limiting (no network call)
  // For authenticated users: use their user ID (sub) so each user has their own bucket.
  // For guests: use the client IP so multiple users don't share one 'anon' bucket.
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  let rateLimitKey = `ip:${clientIp}`
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const payload = decodeJwtPayload(token)
    console.log('[tts] jwt payload role:', payload?.role, 'sub:', payload?.sub)
    if (payload?.sub) {
      rateLimitKey = payload.sub as string
    }
  }

  // ── レート制限 ────────────────────────────────────────────────────────────
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
            speakingRate: 1.05,
            pitch: 0.0,
          },
        }),
      },
    )

    if (!ttsRes.ok) {
      const errText = await ttsRes.text()
      console.error('[TTS] Google API error', ttsRes.status, errText)
      // Pass the Google error body through so the client can log the real cause
      return new Response(`Google TTS ${ttsRes.status}: ${errText}`, { status: 500, headers: CORS_HEADERS })
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
