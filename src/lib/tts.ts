import { get, set } from 'idb-keyval'
import { supabase } from './supabase'

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const FALLBACK_SPEECH_RATE = 0.85
const DEFAULT_VOICE = 'ar-XA-Neural2-A'

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
  stopCurrentAudio()
  speechSynthesis.cancel()
}

export async function playArabicTTS(
  text: string,
  voice: string = DEFAULT_VOICE,
  onPlayStart?: () => void,
): Promise<void> {
  // Stop any currently playing audio immediately
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

    if (!res.ok) throw new Error(`TTS proxy error: ${res.status}`)

    const blob = await res.blob()

    // Save to cache (fire-and-forget)
    set(key, { blob, timestamp: Date.now() }).catch(() => {})

    await playBlob(blob, onPlayStart)
  } catch (err) {
    console.warn('Google TTS failed, falling back to Web Speech API', err)
    fallbackWebSpeech(text, onPlayStart)
  }
}
