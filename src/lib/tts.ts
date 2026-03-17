import { get, set } from 'idb-keyval'
import { supabase } from './supabase'

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

interface CachedAudio {
  blob: Blob
  timestamp: number
}

function cacheKey(voice: string, text: string): string {
  return `tts:${voice}:${text}`
}

async function getSession(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

function playBlob(blob: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audio.onended = () => { URL.revokeObjectURL(url); resolve() }
    audio.onerror = () => { URL.revokeObjectURL(url); reject(new Error('audio play failed')) }
    audio.play().catch(reject)
  })
}

function fallbackWebSpeech(text: string): void {
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'ar'
  utterance.rate = 0.85
  speechSynthesis.speak(utterance)
}

export async function playArabicTTS(
  text: string,
  voice: string = 'ar-XA-Wavenet-A',
): Promise<void> {
  const key = cacheKey(voice, text)

  // Check IndexedDB cache
  try {
    const cached = await get<CachedAudio>(key)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      await playBlob(cached.blob)
      return
    }
  } catch {
    // Cache read failure is non-fatal
  }

  // Fetch from proxy
  try {
    const token = await getSession()
    if (!token) throw new Error('no auth token')

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text, voice }),
      },
    )

    if (!res.ok) throw new Error(`TTS proxy error: ${res.status}`)

    const blob = await res.blob()

    // Save to cache (fire-and-forget)
    set(key, { blob, timestamp: Date.now() }).catch(() => {})

    await playBlob(blob)
  } catch (err) {
    console.warn('Google TTS failed, falling back to Web Speech API', err)
    fallbackWebSpeech(text)
  }
}
