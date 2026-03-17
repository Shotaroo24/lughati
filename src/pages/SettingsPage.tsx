import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <h2
      className="text-xs font-semibold uppercase tracking-widest mb-2 px-1"
      style={{ color: 'var(--color-text-secondary)' }}
    >
      {title}
    </h2>
  )
}

function SettingCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: 'var(--color-bg-card)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      {children}
    </div>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between px-4 py-4">
      <div className="flex flex-col gap-0.5 mr-4">
        <span className="text-base font-medium" style={{ color: 'var(--color-text-primary)' }}>
          {label}
        </span>
        {description && (
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {description}
          </span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative flex-shrink-0 transition-colors rounded-full"
        style={{
          width: 48,
          height: 28,
          minWidth: 48,
          backgroundColor: checked ? 'var(--color-primary)' : 'var(--color-border)',
        }}
      >
        <span
          className="absolute top-0.5 bg-white rounded-full transition-transform"
          style={{
            left: 2,
            width: 24,
            height: 24,
            transform: checked ? 'translateX(20px)' : 'translateX(0)',
          }}
        />
      </button>
    </div>
  )
}

function Divider() {
  return <div className="mx-4" style={{ height: 1, backgroundColor: 'var(--color-border)' }} />
}

// ── Page ───────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const navigate = useNavigate()
  const { user, isGuest, signOut } = useAuth()
  const { preferred_voice, auto_play, show_romanization, update, loading } = useProfile()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div
      className="min-h-screen px-4 py-6"
      style={{ backgroundColor: 'var(--color-bg-page)' }}
    >
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="戻る"
            className="flex items-center justify-center rounded-xl transition-colors"
            style={{ minWidth: 44, minHeight: 44, color: 'var(--color-text-secondary)' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            設定
          </h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div
              className="w-7 h-7 rounded-full border-2 animate-spin"
              style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-6">

            {/* ── 音声 ── */}
            <div>
              <SectionHeader title="音声" />
              <SettingCard>
                <div className="px-4 py-4">
                  <p className="text-base font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
                    アラビア語音声
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => update({ preferred_voice: 'ar-XA-Neural2-A' })}
                      className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors"
                      style={{
                        minHeight: 44,
                        backgroundColor: preferred_voice === 'ar-XA-Neural2-A'
                          ? 'var(--color-primary)'
                          : 'var(--color-primary-light)',
                        color: preferred_voice === 'ar-XA-Neural2-A'
                          ? '#fff'
                          : 'var(--color-primary)',
                      }}
                    >
                      女性（デフォルト）
                    </button>
                    <button
                      type="button"
                      onClick={() => update({ preferred_voice: 'ar-XA-Neural2-C' })}
                      className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors"
                      style={{
                        minHeight: 44,
                        backgroundColor: preferred_voice === 'ar-XA-Neural2-C'
                          ? 'var(--color-primary)'
                          : 'var(--color-primary-light)',
                        color: preferred_voice === 'ar-XA-Neural2-C'
                          ? '#fff'
                          : 'var(--color-primary)',
                      }}
                    >
                      男性
                    </button>
                  </div>
                </div>
              </SettingCard>
            </div>

            {/* ── 再生 ── */}
            <div>
              <SectionHeader title="再生" />
              <SettingCard>
                <ToggleRow
                  label="自動再生"
                  description="カード表示時に自動でアラビア語音声を再生"
                  checked={auto_play}
                  onChange={v => update({ auto_play: v })}
                />
              </SettingCard>
            </div>

            {/* ── 表示 ── */}
            <div>
              <SectionHeader title="表示" />
              <SettingCard>
                <ToggleRow
                  label="ローマ字表示"
                  description="カードにローマ字読みを表示する"
                  checked={show_romanization}
                  onChange={v => update({ show_romanization: v })}
                />
              </SettingCard>
            </div>

            {/* ── アカウント ── */}
            <div>
              <SectionHeader title="アカウント" />
              <SettingCard>
                {!isGuest && user && (
                  <>
                    <div className="px-4 py-3">
                      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        ログイン中
                      </p>
                      <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--color-text-primary)' }}>
                        {user.email}
                      </p>
                    </div>
                    <Divider />
                  </>
                )}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-4 text-base font-medium transition-colors"
                  style={{ color: 'var(--color-danger)', minHeight: 44 }}
                >
                  {isGuest ? 'ゲストモードを終了' : 'ログアウト'}
                </button>
              </SettingCard>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
