import { useState } from 'react'
import { COLORS } from '../lib/constants'
import { Icon, Btn, Card } from '../components/UI'
import { hasSupabase, signOut } from '../lib/supabase'

const S = {
  label: () => ({ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }),
  row:   () => ({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: `1px solid ${COLORS.border}` }),
  key:   () => ({ fontSize: 13, fontWeight: 600, color: COLORS.text }),
  val:   () => ({ fontSize: 13, color: COLORS.textMuted }),
}

function TabBtn({ active, onClick, icon, children }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
      borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
      fontSize: 13, fontWeight: 600,
      background: active ? COLORS.accent + '18' : 'transparent',
      color: active ? COLORS.accent : COLORS.textDim,
      transition: 'all 0.15s',
    }}>
      <Icon name={icon} size={14} color={active ? COLORS.accent : COLORS.textDim} />
      {children}
    </button>
  )
}

export default function SettingsPage({ user, isDark, setIsDark, onSignOut }) {
  const [tab, setTab] = useState('profile')

  const userFullName = user?.user_metadata?.full_name || 'Demo User'
  const userEmail    = user?.email || 'demo@homzmart.com'
  const avatarUrl    = user?.user_metadata?.avatar_url || ''
  const userId       = user?.id || '—'
  const lastSignIn   = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : '—'

  return (
    <div style={{ padding: '28px 32px', overflowY: 'auto', flex: 1, maxWidth: 720 }}>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: COLORS.text, letterSpacing: '-0.02em', marginBottom: 4 }}>Settings</h2>
        <p style={{ fontSize: 13, color: COLORS.textMuted }}>Manage your account, appearance, and app configuration</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 12 }}>
        <TabBtn active={tab === 'profile'}    onClick={() => setTab('profile')}    icon="user">Profile</TabBtn>
        <TabBtn active={tab === 'appearance'} onClick={() => setTab('appearance')} icon="sun">Appearance</TabBtn>
        <TabBtn active={tab === 'account'}    onClick={() => setTab('account')}    icon="settings">Account</TabBtn>
      </div>

      {/* ── Profile tab ── */}
      {tab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="" referrerPolicy="no-referrer" style={{ width: 64, height: 64, borderRadius: 16, border: `2px solid ${COLORS.border}` }} />
                : <div style={{ width: 64, height: 64, borderRadius: 16, background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.purple})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="user" size={28} color="#fff" />
                  </div>
              }
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.text, marginBottom: 4 }}>{userFullName}</div>
                <div style={{ fontSize: 13, color: COLORS.textMuted }}>{userEmail}</div>
                {hasSupabase
                  ? <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 5, background: COLORS.green + '18', border: `1px solid ${COLORS.green}44`, borderRadius: 6, padding: '2px 10px' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.green }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.green }}>Connected to Supabase</span>
                    </div>
                  : <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 5, background: COLORS.amber + '18', border: `1px solid ${COLORS.amber}44`, borderRadius: 6, padding: '2px 10px' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.amber }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.amber }}>Demo mode — local only</span>
                    </div>
                }
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {[
                { label: 'Full name',      value: userFullName },
                { label: 'Email address',  value: userEmail },
                { label: 'User ID',        value: userId, mono: true },
                { label: 'Last sign-in',   value: lastSignIn },
                { label: 'Auth provider',  value: hasSupabase ? 'Google (OAuth)' : 'Demo (no auth)' },
              ].map(r => (
                <div key={r.label} style={S.row()}>
                  <span style={S.key()}>{r.label}</span>
                  <span style={{ ...S.val(), fontFamily: r.mono ? 'monospace' : 'inherit', fontSize: r.mono ? 11 : 13 }}>{r.value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>Profile photo</div>
            <p style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 0 }}>
              Profile photos are pulled automatically from your Google account. To update it, change your photo in Google, then sign out and back in.
            </p>
          </Card>
        </div>
      )}

      {/* ── Appearance tab ── */}
      {tab === 'appearance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 16 }}>Theme</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { id: 'dark',  label: 'Dark', desc: 'Easy on the eyes', bg: '#0D0F14', border: '#252A3A', text: '#E2E8F0' },
                { id: 'light', label: 'Light', desc: 'Clean and bright',  bg: '#F1F5F9', border: '#E2E8F0', text: '#0F172A' },
              ].map(t => {
                const active = isDark ? t.id === 'dark' : t.id === 'light'
                return (
                  <div key={t.id} onClick={() => setIsDark(t.id === 'dark')}
                    style={{ border: `2px solid ${active ? COLORS.accent : COLORS.border}`, borderRadius: 12, padding: 16, cursor: 'pointer', transition: 'border-color 0.15s', background: active ? COLORS.accent + '08' : 'transparent' }}>
                    {/* Mini preview */}
                    <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8, padding: 10, marginBottom: 12, display: 'flex', gap: 6 }}>
                      <div style={{ width: 28, height: 36, background: t.border, borderRadius: 4 }} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ height: 6, background: t.text, borderRadius: 3, opacity: 0.6, width: '60%' }} />
                        <div style={{ height: 4, background: t.text, borderRadius: 2, opacity: 0.3, width: '80%' }} />
                        <div style={{ height: 4, background: t.text, borderRadius: 2, opacity: 0.3, width: '50%' }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{t.label}</div>
                        <div style={{ fontSize: 11, color: COLORS.textMuted }}>{t.desc}</div>
                      </div>
                      {active && <Icon name="check" size={16} color={COLORS.accent} />}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ── Account tab ── */}
      {tab === 'account' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 16 }}>Database connection</div>
            {hasSupabase
              ? <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {[
                    { label: 'Status',     value: '✓ Connected', color: COLORS.green },
                    { label: 'Mode',       value: 'Shared — all users see the same data' },
                    { label: 'Realtime',   value: 'Enabled — SKU updates broadcast instantly' },
                    { label: 'Auth',       value: 'Google OAuth — @homzmart.com only' },
                  ].map(r => (
                    <div key={r.label} style={S.row()}>
                      <span style={S.key()}>{r.label}</span>
                      <span style={{ ...S.val(), color: r.color || COLORS.textMuted }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              : <div style={{ background: COLORS.amber + '12', border: `1px solid ${COLORS.amber}33`, borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.amber, marginBottom: 6 }}>⚠️ Running in demo mode</div>
                  <p style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.6 }}>
                    No <code style={{ background: COLORS.bg, padding: '1px 5px', borderRadius: 4, color: COLORS.accent }}>VITE_SUPABASE_URL</code> or <code style={{ background: COLORS.bg, padding: '1px 5px', borderRadius: 4, color: COLORS.accent }}>VITE_SUPABASE_ANON_KEY</code> found in your environment.
                    Data is stored in this browser's localStorage only and not visible to other users.
                  </p>
                </div>
            }
          </Card>

          <Card>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>Sign out</div>
            <p style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 16 }}>
              You'll be returned to the login screen. Your data remains in the database.
            </p>
            <Btn variant="danger" onClick={onSignOut}>
              <Icon name="logout" size={14} /> Sign out of CostIntel
            </Btn>
          </Card>
        </div>
      )}
    </div>
  )
}
