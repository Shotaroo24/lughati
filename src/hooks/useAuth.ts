import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { createElement } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null
  isGuest: boolean
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  continueAsGuest: () => void
  deleteAccount: () => Promise<{ error: string | null }>
}

// ── Context ────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

// ── Provider ───────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isGuest, setIsGuest] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Guest mode stored in localStorage
    if (localStorage.getItem('lughati_guest') === 'true') {
      setIsGuest(true)
      setLoading(false)
      return
    }

    if (!supabase) {
      // Supabase not configured yet — stay on login page
      setLoading(false)
      return
    }

    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabase が設定されていません' }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signUp = async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabase が設定されていません' }
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error?.message ?? null }
  }

  const signOut = async () => {
    localStorage.removeItem('lughati_guest')
    setIsGuest(false)
    if (supabase) await supabase.auth.signOut()
    setUser(null)
  }

  const continueAsGuest = () => {
    localStorage.setItem('lughati_guest', 'true')
    setIsGuest(true)
  }

  const deleteAccount = async (): Promise<{ error: string | null }> => {
    if (!supabase || !user) return { error: '認証されていません' }
    const { error } = await supabase.rpc('delete_account')
    if (error) return { error: error.message }
    await signOut()
    return { error: null }
  }

  return createElement(
    AuthContext.Provider,
    { value: { user, isGuest, loading, signIn, signUp, signOut, continueAsGuest, deleteAccount } },
    children
  )
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
