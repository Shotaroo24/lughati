import { get, set } from 'idb-keyval'
import { supabase } from './supabase'

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const FALLBACK_SPEECH_RATE = 0.85
const DEFAULT_VOICE = 'ar-XA-Wavenet-A'

interface CachedAudio {
  blob: Blob
  timestamp: number
}

function cacheKey(voice: string, text: string): string {
  return `tts:${voice}:${text}`
}

async function getSession(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

// Module-level audio instance — only one plays at a time
let currentAudio: HTMLAudioElement | null = null
// Module-level fetch controller — abort in-flight requests when moving to next card
let currentFetchController: AbortController | null = null

function stopCurrentAudio(): void {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }
}

function playBlob(blob: Blob, onStart?: () => void): Promise<void> {
  return new Promise((resolve, reject) => {
    stopCurrentAudio()
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    currentAudio = audio
    onStart?.()
    audio.onended = () => { URL.revokeObjectURL(url); currentAudio = null; resolve() }
    audio.onerror = () => { URL.revokeObjectURL(url); currentAudio = null; reject(new Error('audio play failed')) }
    audio.play().catch(reject)
  })
}

function fallbackWebSpeech(text: string, onStart?: () => void): void {
  speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'ar'
  utterance.rate = FALLBACK_SPEECH_RATE
  onStart?.()
  speechSynthesis.speak(utterance)
}

export function stopArabicTTS(): void {
  currentFetchController?.abort()
  currentFetchController = null
  stopCurrentAudio()
  speechSynthesis.cancel()
}

export async function playArabicTTS(
  text: string,
  voice: string = DEFAULT_VOICE,
  onPlayStart?: () => void,
): Promise<void> {
  // Stop any currently playing audio and cancel in-flight fetches
  stopArabicTTS()

  const key = cacheKey(voice, text)

  // Check IndexedDB cache
  try {
    const cached = await get<CachedAudio>(key)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      await playBlob(cached.blob, onPlayStart)
      return
    }
  } catch {
    // Cache read failure is non-fatal
  }

  // Fetch from proxy
  try {
    const token = await getSession()
    // Use session token for authenticated users, anon key for guests
    const bearerToken = token ?? SUPABASE_ANON_KEY

    currentFetchController = new AbortController()
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({ text, voice }),
        signal: currentFetchController.signal,
      },
    )
    currentFetchController = null

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error(`[TTS] HTTP ${res.status}:`, errText)
      throw new Error(`TTS ${res.status}: ${errText}`)
    }

    const blob = await res.blob()

    // Save to cache (fire-and-forget)
    set(key, { blob, timestamp: Date.now() }).catch(() => {})

    await playBlob(blob, onPlayStart)
  } catch (err) {
    // AbortError means the user navigated away — don't fall back to browser TTS
    if (err instanceof Error && err.name === 'AbortError') return
    console.error('[TTS] failed, falling back to Web Speech API:', err)
    fallbackWebSpeech(text, onPlayStart)
  }
}

// Silently pre-fetch and cache audio for a card without playing it.
// Used to warm the cache for adjacent cards so auto-play has no loading delay.
export async function prefetchArabicTTS(
  text: string,
  voice: string = DEFAULT_VOICE,
): Promise<void> {
  const key = cacheKey(voice, text)

  // Skip if already cached and fresh
  try {
    const cached = await get<CachedAudio>(key)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) return
  } catch {
    // ignore
  }

  try {
    const token = await getSession()
    const bearerToken = token ?? SUPABASE_ANON_KEY

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({ text, voice }),
      },
    )

    if (!res.ok) return // silent failure — prefetch is best-effort
    const blob = await res.blob()
    set(key, { blob, timestamp: Date.now() }).catch(() => {})
  } catch {
    // silent failure — prefetch must never affect UI
  }
}
