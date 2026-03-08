import { useState, useEffect } from 'react'
import { COLORS } from '../lib/constants'
import { Icon, Card } from '../components/UI'
import { hasSupabase, dbLoadProfiles } from '../lib/supabase'

function Avatar({ name, avatarUrl, size = 36 }) {
  const initials = name ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '?'
  const colors = ['#4F8EF7', '#A78BFA', '#14B8A6', '#F97316', '#22C55E', '#F59E0B', '#EF4444']
  const color  = colors[name?.charCodeAt(0) % colors.length] || colors[0]

  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} referrerPolicy="no-referrer"
      style={{ width: size, height: size, borderRadius: size * 0.28, border: `2px solid ${COLORS.border}`, flexShrink: 0 }} />
  }
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.28, background: color + '22', border: `2px solid ${color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: size * 0.36, fontWeight: 800, color }}>{initials}</span>
    </div>
  )
}

function timeAgo(iso) {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 2)   return 'Just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7)   return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function isOnline(iso) {
  if (!iso) return false
  return Date.now() - new Date(iso).getTime() < 15 * 60 * 1000 // within 15 min
}

export default function UsersPage({ currentUser }) {
  const [profiles, setProfiles]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')

  useEffect(() => {
    if (!hasSupabase) {
      // Demo mode — show only current demo user
      setProfiles([{
        id: 'demo',
        email: 'demo@homzmart.com',
        full_name: 'Demo User',
        avatar_url: '',
        last_seen: new Date().toISOString(),
      }])
      setLoading(false)
      return
    }

    dbLoadProfiles().then(({ data, error: err }) => {
      if (err) setError(err.message)
      else setProfiles(data)
      setLoading(false)
    })
  }, [])

  const online  = profiles.filter(p => isOnline(p.last_seen))
  const offline = profiles.filter(p => !isOnline(p.last_seen))

  return (
    <div style={{ padding: '28px 32px', overflowY: 'auto', flex: 1, maxWidth: 800 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: COLORS.text, letterSpacing: '-0.02em', marginBottom: 4 }}>Team</h2>
        <p style={{ fontSize: 13, color: COLORS.textMuted }}>
          {hasSupabase
            ? `${profiles.length} member${profiles.length !== 1 ? 's' : ''} with access · @homzmart.com only`
            : 'Demo mode — connect Supabase to see your full team'}
        </p>
      </div>

      {!hasSupabase && (
        <div style={{ background: COLORS.amber + '12', border: `1px solid ${COLORS.amber}33`, borderRadius: 12, padding: '14px 18px', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Icon name="info" size={16} color={COLORS.amber} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.amber, marginBottom: 4 }}>Database not connected</div>
            <p style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.6 }}>
              User profiles are stored in Supabase. Set up your <code style={{ background: COLORS.bg, padding: '1px 5px', borderRadius: 4, color: COLORS.accent }}>.env</code> file to see all team members who have logged in.
            </p>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: COLORS.textMuted, fontSize: 13 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.amber, display: 'inline-block', animation: 'pulse 1.2s ease-in-out infinite' }} />
          Loading team members…
        </div>
      )}

      {error && (
        <div style={{ background: COLORS.red + '12', border: `1px solid ${COLORS.red}33`, borderRadius: 10, padding: '12px 16px', color: COLORS.red, fontSize: 13 }}>
          Failed to load profiles: {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Online now */}
          {online.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.green, boxShadow: `0 0 0 3px ${COLORS.green}33` }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.green, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Online now — {online.length}</span>
              </div>
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                {online.map((p, i) => (
                  <UserRow key={p.id} profile={p} currentUserId={currentUser?.id} isLast={i === online.length - 1} online />
                ))}
              </Card>
            </div>
          )}

          {/* All members */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
              {online.length > 0 ? `Other members — ${offline.length}` : `All members — ${profiles.length}`}
            </div>
            {(online.length > 0 ? offline : profiles).length === 0
              ? <Card><p style={{ fontSize: 13, color: COLORS.textMuted, textAlign: 'center', padding: '20px 0' }}>No other members yet.</p></Card>
              : <Card style={{ padding: 0, overflow: 'hidden' }}>
                  {(online.length > 0 ? offline : profiles).map((p, i, arr) => (
                    <UserRow key={p.id} profile={p} currentUserId={currentUser?.id} isLast={i === arr.length - 1} />
                  ))}
                </Card>
            }
          </div>
        </>
      )}

      {/* Access info */}
      <Card style={{ marginTop: 28, background: COLORS.bg, border: `1px solid ${COLORS.border}` }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Icon name="info" size={15} color={COLORS.textMuted} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.7 }}>
            Access is restricted to <strong style={{ color: COLORS.text }}>@homzmart.com</strong> Google accounts via Supabase Auth.
            Anyone with a Homzmart Google account can log in — no manual invitation needed.
            Profiles are created automatically on first login.
          </div>
        </div>
      </Card>
    </div>
  )
}

function UserRow({ profile, currentUserId, isLast, online }) {
  const isCurrentUser = profile.id === currentUserId || (profile.id === 'demo' && !currentUserId)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 18px',
      borderBottom: isLast ? 'none' : `1px solid ${COLORS.border}`,
      transition: 'background 0.1s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = COLORS.surfaceHover}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ position: 'relative' }}>
        <Avatar name={profile.full_name || profile.email} avatarUrl={profile.avatar_url} size={40} />
        {online && (
          <div style={{ position: 'absolute', bottom: -1, right: -1, width: 11, height: 11, borderRadius: '50%', background: COLORS.green, border: `2px solid ${COLORS.surface}` }} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile.full_name || profile.email.split('@')[0]}
          </span>
          {isCurrentUser && (
            <span style={{ fontSize: 10, fontWeight: 700, background: COLORS.accent + '22', color: COLORS.accent, padding: '1px 7px', borderRadius: 4 }}>You</span>
          )}
        </div>
        <div style={{ fontSize: 12, color: COLORS.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {profile.email}
        </div>
      </div>

      <div style={{ fontSize: 12, color: online ? COLORS.green : COLORS.textMuted, fontWeight: online ? 600 : 400, textAlign: 'right', flexShrink: 0 }}>
        {online ? 'Online' : timeAgo(profile.last_seen)}
      </div>
    </div>
  )
}
