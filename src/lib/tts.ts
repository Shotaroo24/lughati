import { get, set } from 'idb-keyval'

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
const FALLBACK_SPEECH_RATE = 0.85

interface CachedAudio {
  blob: Blob
  timestamp: number
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
  audioUrl: string | null,
  text: string,
  onPlayStart?: () => void,
): Promise<void> {
  // Stop any currently playing audio and cancel in-flight fetches
  stopArabicTTS()

  if (!audioUrl) {
    fallbackWebSpeech(text, onPlayStart)
    return
  }

  // Check IndexedDB cache (keyed by audioUrl)
  try {
    const cached = await get<CachedAudio>(audioUrl)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      await playBlob(cached.blob, onPlayStart)
      return
    }
  } catch {
    // Cache read failure is non-fatal
  }

  // Fetch the pre-generated MP3 directly from Supabase Storage
  try {
    currentFetchController = new AbortController()
    const res = await fetch(audioUrl, { signal: currentFetchController.signal })
    currentFetchController = null

    if (!res.ok) {
      throw new Error(`Audio fetch ${res.status}`)
    }

    const blob = await res.blob()

    // Save to cache (fire-and-forget)
    set(audioUrl, { blob, timestamp: Date.now() }).catch(() => {})

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
  audioUrl: string | null,
  _text: string,
): Promise<void> {
  if (!audioUrl) return

  // Skip if already cached and fresh
  try {
    const cached = await get<CachedAudio>(audioUrl)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) return
  } catch {
    // ignore
  }

  try {
    const res = await fetch(audioUrl)
    if (!res.ok) return // silent failure — prefetch is best-effort
    const blob = await res.blob()
    set(audioUrl, { blob, timestamp: Date.now() }).catch(() => {})
  } catch {
    // silent failure — prefetch must never affect UI
  }
}
