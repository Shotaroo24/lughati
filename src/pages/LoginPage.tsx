import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

type Mode = 'login' | 'signup'

export function LoginPage() {
  const { user, isGuest, loading, signIn, signUp, continueAsGuest } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Redirect if already authenticated or guest
  useEffect(() => {
    if (!loading && (user || isGuest)) {
      navigate('/decks', { replace: true })
    }
  }, [user, isGuest, loading, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const result =
      mode === 'login'
        ? await signIn(email, password)
        : await signUp(email, password)

    if (result.error) {
      setError(result.error)
      setSubmitting(false)
    }
    // On success, useEffect handles redirect
  }

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
  }

  if (loading) return null

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ backgroundColor: 'var(--color-bg-page)' }}
    >
      <div className="w-full max-w-sm">

        {/* App title */}
        <div className="text-center mb-8" dir="ltr">
          <p
            className="text-5xl font-bold mb-1"
            dir="rtl"
            style={{
              fontFamily: 'var(--font-arabic)',
              color: 'var(--color-primary)',
            }}
          >
            لُغَتِي
          </p>
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Lughati
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            アラビア語・英語単語帳
          </p>
        </div>

        {/* Auth card */}
        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: 'var(--color-bg-card)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <h2
            className="text-lg font-semibold mb-5"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {mode === 'login' ? 'ログイン' : '新規登録'}
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <Input
              id="email"
              label="メールアドレス"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <Input
              id="password"
              label="パスワード"
              type="password"
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={6}
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              error={error ?? undefined}
            />

            <Button type="submit" fullWidth loading={submitting} className="mt-1">
              {mode === 'login' ? 'ログイン' : '登録する'}
            </Button>
          </form>

          {/* Mode toggle */}
          <p
            className="text-center text-sm mt-5"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {mode === 'login' ? (
              <>
                アカウントをお持ちでないですか？{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="font-medium underline underline-offset-2"
                  style={{ color: 'var(--color-primary)' }}
                >
                  新規登録
                </button>
              </>
            ) : (
              <>
                すでにアカウントをお持ちですか？{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="font-medium underline underline-offset-2"
                  style={{ color: 'var(--color-primary)' }}
                >
                  ログイン
                </button>
              </>
            )}
          </p>
        </div>

        {/* Guest button */}
        <div className="mt-4 flex justify-center">
          <Button
            type="button"
            variant="ghost"
            onClick={continueAsGuest}
          >
            ゲストとして続ける
          </Button>
        </div>
      </div>
    </div>
  )
}
