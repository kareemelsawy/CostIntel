import { useState, useEffect, useMemo, useCallback } from 'react'
import { COLORS, setThemeColors } from './lib/constants'
import { calculateSKUCost, skuToEngineInput } from './lib/engine'
import { DEFAULT_MATERIALS, DEFAULT_ACCESSORIES, DEFAULT_COMMERCIAL, SAMPLE_SKUS, CATEGORY_MATERIAL_DEFAULTS } from './lib/defaults'
import { supabase, hasSupabase, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut,
  dbUpsertSKU, dbUpsertSKUs, dbDeleteSKU, dbClearAllSKUs,
  dbUpsertMaterial, dbDeleteMaterial, dbUpdateMaterialPrice,
  dbUpsertAccessory, dbDeleteAccessory, dbUpdateAccessoryPrice,
  dbUpdateCommercial, dbLoadEngineOverrides, dbUpsertProfile } from './lib/supabase'
import { Icon, Btn, ToastContainer } from './components/UI'
import { SKUDetailModal, EditSKUModal, EditMaterialModal } from './components/Modals'
import CatalogPage from './pages/CatalogPage'
import CalculatorPage from './pages/CalculatorPage'
import AnalyticsPage from './pages/AnalyticsPage'
import PricingPage from './pages/PricingPage'
import EngineOverridesPage from './pages/EngineOverridesPage'
import SettingsPage from './pages/SettingsPage'
import UsersPage from './pages/UsersPage'

// ─── Persistence helpers ──────────────────────────────────────────────────────
const LS_SKUS = 'costintel_skus'
const LS_MATS = 'costintel_materials'
const LS_ACCS = 'costintel_accessories'
const LS_COMM = 'costintel_commercial'
function loadLS(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback } catch { return fallback } }
function saveLS(key, val) { try { localStorage.setItem(key, JSON.stringify(val)) } catch {} }

// ─── Login Page ───────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [mode, setMode]       = useState('google')   // 'google' | 'email' | 'signup'
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  async function handleGoogleLogin() {
    if (!hasSupabase) { onLogin({ email: 'demo@homzmart.com', user_metadata: { full_name: 'Demo User', avatar_url: '' } }); return }
    setLoading(true); setError('')
    const { error: err } = await signInWithGoogle()
    if (err) { setError(typeof err === 'string' ? err : err.message || 'Login failed'); setLoading(false) }
  }

  async function handleEmailLogin(e) {
    e.preventDefault()
    if (!email || !password) { setError('Email and password required'); return }
    setLoading(true); setError('')
    const { error: err } = await signInWithEmail(email, password)
    if (err) { setError(err.message || 'Login failed'); setLoading(false) }
    // on success, onAuthStateChange fires automatically
  }

  async function handleSignUp(e) {
    e.preventDefault()
    if (!email || !password || !fullName) { setError('All fields required'); return }
    if (!email.endsWith('@homzmart.com')) { setError('Only @homzmart.com emails are allowed'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true); setError('')
    const { data, error: err } = await signUpWithEmail(email, password, fullName)
    setLoading(false)
    if (err) { setError(err.message); return }
    if (data?.user?.identities?.length === 0) { setError('This email is already registered. Try signing in.'); return }
    setSuccess('Account created! Check your email to confirm, then sign in.')
    setMode('email')
  }

  const inp = {
    width: '100%', background: '#1C2030', border: '1px solid #252A3A', borderRadius: 10,
    padding: '12px 14px', color: '#E2E8F0', fontSize: 14, outline: 'none',
    fontFamily: 'inherit', transition: 'border-color 0.2s',
  }

  return (
    <div className="login-page">
      <div className="login-card" style={{ width: 420 }}>
        {/* Logo */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#4F8EF7,#A78BFA)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none"><rect x="6" y="6" width="6" height="20" rx="1" fill="#fff" opacity="0.9"/><rect x="16" y="6" width="6" height="20" rx="1" fill="#fff" opacity="0.65"/><rect x="6" y="6" width="16" height="5" rx="1" fill="#fff"/></svg>
            </div>
          </div>
          <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 26, fontWeight: 800, color: '#E2E8F0', letterSpacing: '-0.02em', marginBottom: 6 }}>CostIntel</h1>
          <p style={{ fontSize: 13, color: '#64748B' }}>Homzmart furniture costing intelligence</p>
        </div>

        {/* No Supabase warning */}
        {!hasSupabase && (
          <div style={{ background: '#F59E0B18', border: '1px solid #F59E0B44', borderRadius: 10, padding: '12px 14px', marginBottom: 20, textAlign: 'left' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#F59E0B', marginBottom: 4 }}>⚠️ No database connected</div>
            <div style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.6 }}>
              Running in local demo mode. Add <code style={{ background: '#0D0F14', padding: '1px 5px', borderRadius: 4, color: '#4F8EF7' }}>.env</code> with Supabase credentials to enable shared access.
            </div>
          </div>
        )}

        {/* Success message */}
        {success && (
          <div style={{ background: '#22C55E18', border: '1px solid #22C55E44', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: '#22C55E' }}>
            ✓ {success}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{ background: '#EF444418', border: '1px solid #EF444444', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: '#EF4444' }}>
            {error}
          </div>
        )}

        {/* Mode tabs */}
        {hasSupabase && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#0D0F14', borderRadius: 10, padding: 4 }}>
            {[
              { id: 'google', label: 'Google' },
              { id: 'email',  label: 'Email login' },
              { id: 'signup', label: 'Create account' },
            ].map(t => (
              <button key={t.id} onClick={() => { setMode(t.id); setError(''); setSuccess('') }}
                style={{ flex: 1, padding: '7px 4px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                  background: mode === t.id ? '#1C2030' : 'transparent',
                  color: mode === t.id ? '#E2E8F0' : '#64748B',
                  transition: 'all 0.15s' }}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Google sign-in */}
        {(!hasSupabase || mode === 'google') && (
          <button className="google-btn" onClick={handleGoogleLogin} disabled={loading}>
            <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            {!hasSupabase ? 'Continue in Demo Mode' : loading ? 'Redirecting…' : 'Sign in with Google'}
          </button>
        )}

        {/* Email login */}
        {hasSupabase && mode === 'email' && (
          <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input type="email" placeholder="your@homzmart.com" value={email} onChange={e => setEmail(e.target.value)}
              style={inp} onFocus={e => e.target.style.borderColor = '#4F8EF7'} onBlur={e => e.target.style.borderColor = '#252A3A'} />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
              style={inp} onFocus={e => e.target.style.borderColor = '#4F8EF7'} onBlur={e => e.target.style.borderColor = '#252A3A'} />
            <button type="submit" disabled={loading} style={{
              background: 'linear-gradient(135deg,#4F8EF7,#A78BFA)', color: '#fff', border: 'none',
              borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s',
            }}>{loading ? 'Signing in…' : 'Sign in'}</button>
          </form>
        )}

        {/* Sign up */}
        {hasSupabase && mode === 'signup' && (
          <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input type="text" placeholder="Full name" value={fullName} onChange={e => setFullName(e.target.value)}
              style={inp} onFocus={e => e.target.style.borderColor = '#4F8EF7'} onBlur={e => e.target.style.borderColor = '#252A3A'} />
            <input type="email" placeholder="your@homzmart.com" value={email} onChange={e => setEmail(e.target.value)}
              style={inp} onFocus={e => e.target.style.borderColor = '#4F8EF7'} onBlur={e => e.target.style.borderColor = '#252A3A'} />
            <input type="password" placeholder="Password (min 6 chars)" value={password} onChange={e => setPassword(e.target.value)}
              style={inp} onFocus={e => e.target.style.borderColor = '#4F8EF7'} onBlur={e => e.target.style.borderColor = '#252A3A'} />
            <button type="submit" disabled={loading} style={{
              background: 'linear-gradient(135deg,#4F8EF7,#A78BFA)', color: '#fff', border: 'none',
              borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s',
            }}>{loading ? 'Creating account…' : 'Create account'}</button>
            <p style={{ fontSize: 11, color: '#475569', textAlign: 'center' }}>Restricted to @homzmart.com emails only</p>
          </form>
        )}

        {!hasSupabase && <p style={{ fontSize: 11, color: '#475569', marginTop: 16 }}>No auth required in demo mode</p>}
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [isDark, setIsDark] = useState(true)
  const [view, setView] = useState('analytics')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [toasts, setToasts] = useState([])
  // When Supabase is configured, start with empty SKUs and wait for DB — don't seed from localStorage
  const [skus, setSkus] = useState(() => hasSupabase ? [] : loadLS(LS_SKUS, SAMPLE_SKUS))
  const [materials, setMaterials] = useState(() => loadLS(LS_MATS, DEFAULT_MATERIALS))
  const [accessories, setAccessories] = useState(() => loadLS(LS_ACCS, DEFAULT_ACCESSORIES))
  const [commercial, setCommercial] = useState(() => loadLS(LS_COMM, DEFAULT_COMMERCIAL))
  const [dbLoading, setDbLoading] = useState(hasSupabase)
  const [selectedSku, setSelectedSku] = useState(null)
  const [editingSku, setEditingSku] = useState(null)
  const [editingMat, setEditingMat] = useState(null)
  const [calcPrefill, setCalcPrefill] = useState(null)
  const [engineOverrides, setEngineOverrides] = useState({})

  // Persist to localStorage on change
  useEffect(() => { saveLS(LS_SKUS, skus) }, [skus])
  useEffect(() => { saveLS(LS_MATS, materials) }, [materials])
  useEffect(() => { saveLS(LS_ACCS, accessories) }, [accessories])
  useEffect(() => { saveLS(LS_COMM, commercial) }, [commercial])

  // Auth check — rely solely on onAuthStateChange which fires INITIAL_SESSION
  // reliably after restoring the session from storage. getUser() races against
  // session restoration and returns null on a fresh browser load.
  useEffect(() => {
    if (!hasSupabase) { setAuthChecked(true); return }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user
      if (u && u.email?.endsWith('@homzmart.com')) {
        setUser(u)
        // Upsert profile so UsersPage can list all team members
        dbUpsertProfile(u)
      } else if (u) {
        // Logged in but wrong domain
        signOut()
        setUser(null)
      } else {
        setUser(null)
      }
      // Mark auth as checked after first event (INITIAL_SESSION, SIGNED_IN, or SIGNED_OUT)
      setAuthChecked(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Sync with Supabase if connected — load all data, then subscribe to real-time SKU changes
  useEffect(() => {
    if (!hasSupabase || !user) return
    setDbLoading(true)

    async function loadAll() {
      try {
        const [mR, aR, cR, sR, eR] = await Promise.all([
          supabase.from('materials').select('*').eq('is_active', true),
          supabase.from('accessories').select('*').eq('is_active', true),
          supabase.from('commercial_settings').select('*'),
          supabase.from('skus').select('*').eq('is_active', true).order('created_at', { ascending: false }),
          dbLoadEngineOverrides(),
        ])
        if (mR.error) console.warn('materials load error:', mR.error)
        else if (mR.data?.length) setMaterials(mR.data)

        if (aR.error) console.warn('accessories load error:', aR.error)
        else if (aR.data?.length) setAccessories(aR.data)

        if (cR.error) console.warn('commercial load error:', cR.error)
        else if (cR.data?.length) {
          const c = {}; cR.data.forEach(r => { c[r.key] = r.value }); setCommercial(p => ({ ...p, ...c }))
        }

        if (sR.error) { toast('Failed to load SKUs: ' + sR.error.message, 'error') }
        else { setSkus(sR.data || []) }  // always replace — even empty array is correct

        if (eR.data?.length) {
          const overrides = {}
          eR.data.forEach(r => { try { overrides[r.override_key] = JSON.parse(r.override_value) } catch { overrides[r.override_key] = r.override_value } })
          setEngineOverrides(overrides)
        }
      } catch (e) {
        console.warn('DB load error:', e)
        toast('Database connection error', 'error')
      } finally {
        setDbLoading(false)
      }
    }

    loadAll()

    // Real-time subscription — any INSERT/UPDATE/DELETE on skus propagates to all users instantly
    const channel = supabase
      .channel('skus-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'skus' }, payload => {
        const row = payload.new
        if (row.is_active !== false) {
          setSkus(prev => {
            if (prev.some(s => s.sku_code === row.sku_code)) return prev  // already have it
            return [row, ...prev]
          })
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'skus' }, payload => {
        const row = payload.new
        if (row.is_active === false) {
          setSkus(prev => prev.filter(s => s.sku_code !== row.sku_code))
        } else {
          setSkus(prev => prev.map(s => s.sku_code === row.sku_code ? row : s))
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'skus' }, payload => {
        setSkus(prev => prev.filter(s => s.sku_code !== payload.old.sku_code))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  useEffect(() => { setThemeColors(isDark); document.body.setAttribute('data-theme', isDark ? 'dark' : 'light') }, [isDark])

  const toast = useCallback((message, type = 'success') => {
    const id = Date.now(); setToasts(p => [...p, { id, message, type }]); setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000)
  }, [])

  const skuCosts = useMemo(() => {
    const m = {}; skus.forEach(s => { m[s.sku_code] = calculateSKUCost(skuToEngineInput(s), materials, accessories, commercial) }); return m
  }, [skus, materials, accessories, commercial])

  async function handleSaveSku(data) {
    if (editingSku?._isNew) {
      if (!data.sku_code) data.sku_code = 'SKU-' + Date.now().toString(36).toUpperCase()
      setSkus(p => [...p, data])
      if (hasSupabase) { const { error } = await dbUpsertSKU(data); if (error) toast('DB save failed: ' + error.message, 'error') }
      toast('SKU added')
    } else {
      setSkus(p => p.map(s => s.sku_code === editingSku.sku_code ? data : s))
      if (hasSupabase) { const { error } = await dbUpsertSKU(data); if (error) toast('DB save failed: ' + error.message, 'error') }
      toast('SKU updated')
    }
    setEditingSku(null)
  }

  async function handleSaveSkuFromReport(data) {
    setSkus(p => p.map(s => s.sku_code === data.sku_code ? data : s))
    setSelectedSku(data)
    if (hasSupabase) { const { error } = await dbUpsertSKU(data); if (error) toast('DB save failed: ' + error.message, 'error') }
    toast('Materials updated')
  }

  async function handleDeleteSku(sku_code) {
    setSkus(p => p.filter(x => x.sku_code !== sku_code))
    if (hasSupabase) await dbDeleteSKU(sku_code)
    toast('Removed')
  }

  async function handleClearAllSKUs() {
    const count = skus.length
    setSkus([])
    if (hasSupabase) {
      const { error } = await dbClearAllSKUs()
      if (error) toast('DB clear failed: ' + error.message, 'error')
      else toast(`Cleared ${count} SKUs from database`)
    } else {
      toast(`Cleared ${count} SKUs`)
    }
  }

  async function handleImportSKUs(newSkus) {
    // NOTE: CatalogPage already called setSkus() before invoking this callback.
    // This function only handles the DB write and final toast.
    if (hasSupabase) {
      const { error } = await dbUpsertSKUs(newSkus)
      if (error) {
        toast('DB import failed: ' + error.message + ' — SKUs are visible locally but not saved to database', 'error')
      } else {
        toast(`Imported ${newSkus.length} SKUs — now visible to all users`)
      }
    } else {
      toast(`Imported ${newSkus.length} SKUs`)
    }
  }

  async function handleSaveMat(data) {
    if (editingMat?._isNew) {
      setMaterials(p => [...p, data])
      if (hasSupabase) await dbUpsertMaterial(data)
      toast('Material added')
    } else {
      setMaterials(p => p.map(m => m.material_id === editingMat.material_id ? data : m))
      if (hasSupabase) await dbUpsertMaterial(data)
      toast('Material updated')
    }
    setEditingMat(null)
  }

  async function handleDeleteMaterial(material_id) {
    setMaterials(p => p.filter(x => x.material_id !== material_id))
    if (hasSupabase) await dbDeleteMaterial(material_id)
    toast('Removed')
  }

  async function handleUpdateMatPrice(material_id, price, price_good) {
    setMaterials(p => p.map(m => m.material_id === material_id ? { ...m, price, price_good } : m))
    if (hasSupabase) await dbUpdateMaterialPrice(material_id, price, price_good)
  }

  async function handleSaveAcc(data) {
    setAccessories(p => p.map(a => a.acc_id === data.acc_id ? data : a))
    if (hasSupabase) await dbUpsertAccessory(data)
  }

  async function handleDeleteAccessory(acc_id) {
    setAccessories(p => p.filter(x => x.acc_id !== acc_id))
    if (hasSupabase) await dbDeleteAccessory(acc_id)
    toast('Removed')
  }

  async function handleUpdateAccPrice(acc_id, price, price_good) {
    setAccessories(p => p.map(a => a.acc_id === acc_id ? { ...a, price, price_good } : a))
    if (hasSupabase) await dbUpdateAccessoryPrice(acc_id, price, price_good)
  }

  async function handleUpdateCommercial(updates) {
    setCommercial(p => ({ ...p, ...updates }))
    if (hasSupabase) {
      await Promise.all(Object.entries(updates).map(([key, value]) => dbUpdateCommercial(key, value)))
    }
  }

  const userName = user?.user_metadata?.full_name?.split(' ')[0] || (hasSupabase ? '' : 'there')
  const userFullName = user?.user_metadata?.full_name || (hasSupabase ? '' : 'Demo User')

  // Show login if Supabase is configured and user not authenticated
  if (!authChecked) return <div className="login-page"><div style={{ color: '#64748B', fontSize: 14 }}>Loading...</div></div>
  if (hasSupabase && !user) return <LoginPage onLogin={setUser} />

  const navItems = [
    { id: 'analytics',  icon: 'chart',   label: 'Dashboard' },
    { id: 'catalog',    icon: 'grid',    label: 'SKU Catalog' },
    { id: 'calculator', icon: 'calc',    label: 'Calculator' },
    { id: 'pricing',    icon: 'prices',  label: 'Prices' },
    { id: 'engine',     icon: 'zap',     label: 'Engine Rules' },
  ]
  const bottomItems = [
    { id: 'users',    icon: 'users',    label: 'Team' },
    { id: 'settings', icon: 'settings', label: 'Settings' },
  ]

  function NavItem({ id, icon, label }) {
    const active = view === id
    return (
      <div onClick={() => setView(id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: active ? COLORS.accent + '18' : 'transparent', color: active ? COLORS.accent : COLORS.textDim, marginBottom: 1, transition: 'all 0.15s' }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = COLORS.surfaceHover; if (!active) e.currentTarget.style.color = COLORS.text }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; if (!active) e.currentTarget.style.color = COLORS.textDim }}>
        <span style={{ width: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name={icon} size={15} color={active ? COLORS.accent : 'currentColor'} />
        </span>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{label}</span>
      </div>
    )
  }

  function handleSignOut() {
    signOut()
    setUser(null)
    localStorage.clear()
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: COLORS.bg, color: COLORS.text, overflow: 'hidden', fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>

      {/* ── Sidebar ── */}
      {sidebarOpen && (
        <aside style={{ width: 220, background: COLORS.surface, borderRight: `1px solid ${COLORS.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100vh' }}>

          {/* Logo */}
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#4F8EF7,#A78BFA)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 32 32" fill="none"><rect x="6" y="6" width="6" height="20" rx="1" fill="#fff" opacity="0.9"/><rect x="16" y="6" width="6" height="20" rx="1" fill="#fff" opacity="0.65"/><rect x="6" y="6" width="16" height="5" rx="1" fill="#fff"/></svg>
              </div>
              <div>
                <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em', color: COLORS.accent }}>CostIntel</div>
                <div style={{ fontSize: 10, color: COLORS.textMuted }}>v5.0</div>
              </div>
            </div>
          </div>

          {/* Main nav */}
          <nav style={{ padding: '10px 8px', flex: 1, overflowY: 'auto' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 10px 8px' }}>Main</div>
            {navItems.map(n => <NavItem key={n.id} {...n} />)}
          </nav>

          {/* Bottom nav — Team + Settings */}
          <div style={{ padding: '6px 8px', borderTop: `1px solid ${COLORS.border}` }}>
            {bottomItems.map(n => <NavItem key={n.id} {...n} />)}
          </div>

          {/* User profile card */}
          <div style={{ padding: '10px 12px', borderTop: `1px solid ${COLORS.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Avatar + name — click to go to settings */}
              <div onClick={() => setView('settings')} style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, minWidth: 0, padding: '6px 8px', borderRadius: 10, cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = COLORS.surfaceHover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {user?.user_metadata?.avatar_url
                  ? <img src={user.user_metadata.avatar_url} alt="" style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0 }} referrerPolicy="no-referrer" />
                  : <div style={{ width: 30, height: 30, borderRadius: 9, background: COLORS.accent + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="user" size={15} color={COLORS.accent} /></div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userFullName}</div>
                  <div style={{ fontSize: 10, color: COLORS.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email || 'demo@homzmart.com'}</div>
                </div>
              </div>
              {/* Logout button — always visible */}
              <button
                onClick={handleSignOut}
                title="Sign out"
                style={{ background: 'none', border: `1px solid ${COLORS.border}`, cursor: 'pointer', padding: '6px 7px', borderRadius: 8, color: COLORS.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.color = COLORS.red; e.currentTarget.style.borderColor = COLORS.red + '66'; e.currentTarget.style.background = COLORS.red + '12' }}
                onMouseLeave={e => { e.currentTarget.style.color = COLORS.textMuted; e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.background = 'none' }}
              >
                <Icon name="logout" size={15} />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Topbar */}
        <header style={{ height: 52, background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, flexShrink: 0 }}>
          <button onClick={() => setSidebarOpen(p => !p)} style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', padding: '4px 6px', borderRadius: 6 }}><Icon name="menu" size={18} /></button>
          <span style={{ fontSize: 12, color: COLORS.textMuted }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          {dbLoading && (
            <span style={{ fontSize: 11, color: COLORS.amber, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: COLORS.amber, display: 'inline-block', animation: 'pulse 1.2s ease-in-out infinite' }} />
              Syncing…
            </span>
          )}
          {!hasSupabase && (
            <span style={{ fontSize: 11, color: COLORS.amber, fontWeight: 600, background: COLORS.amber + '18', border: `1px solid ${COLORS.amber}44`, padding: '3px 10px', borderRadius: 6 }}>
              ⚠️ Demo mode
            </span>
          )}
          <div style={{ marginLeft: 'auto' }} />
          <button onClick={() => setIsDark(!isDark)} style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, padding: '5px 10px', cursor: 'pointer', color: COLORS.textDim, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
            <Icon name={isDark ? 'sun' : 'moon'} size={15} color={COLORS.textMuted} /> {isDark ? 'Light' : 'Dark'}
          </button>
        </header>

        {/* Page */}
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {view === 'analytics'  && <AnalyticsPage skus={skus} skuCosts={skuCosts} setSelectedSku={setSelectedSku} userName={userName} />}
            {view === 'catalog'    && <CatalogPage skus={skus} setSkus={setSkus} skuCosts={skuCosts} setSelectedSku={setSelectedSku} setEditingSku={setEditingSku} toast={toast} catDefaults={CATEGORY_MATERIAL_DEFAULTS} onDeleteSku={handleDeleteSku} onImportSKUs={handleImportSKUs} onClearAll={handleClearAllSKUs} />}
            {view === 'calculator' && <CalculatorPage materials={materials} accessories={accessories} commercial={commercial} setSkus={setSkus} toast={toast} prefill={calcPrefill} clearPrefill={() => setCalcPrefill(null)} catDefaults={CATEGORY_MATERIAL_DEFAULTS} onSaveSku={async (s) => { setSkus(p => [...p, s]); if (hasSupabase) await dbUpsertSKU(s); toast('Saved to catalog') }} />}
            {view === 'pricing'    && <PricingPage materials={materials} setMaterials={setMaterials} accessories={accessories} setAccessories={setAccessories} commercial={commercial} setCommercial={setCommercial} setEditingMat={setEditingMat} toast={toast} onUpdateMatPrice={handleUpdateMatPrice} onDeleteMaterial={handleDeleteMaterial} onUpdateAccPrice={handleUpdateAccPrice} onDeleteAccessory={handleDeleteAccessory} onUpdateCommercial={handleUpdateCommercial} />}
            {view === 'engine'     && <EngineOverridesPage overrides={engineOverrides} setOverrides={setEngineOverrides} toast={toast} />}
            {view === 'users'      && <UsersPage currentUser={user} />}
            {view === 'settings'   && <SettingsPage user={user} isDark={isDark} setIsDark={setIsDark} onSignOut={handleSignOut} />}
          </div>
        </main>
      </div>

      {/* Modals */}
      {selectedSku  && <SKUDetailModal sku={selectedSku} materials={materials} accessories={accessories} commercial={commercial} onClose={() => setSelectedSku(null)} onEdit={() => { setEditingSku({ ...selectedSku }); setSelectedSku(null) }} onCalc={() => { setCalcPrefill(selectedSku); setView('calculator'); setSelectedSku(null) }} onSaveSku={handleSaveSkuFromReport} />}
      {editingSku   && <EditSKUModal sku={editingSku} materials={materials} catDefaults={CATEGORY_MATERIAL_DEFAULTS} onSave={handleSaveSku} onClose={() => setEditingSku(null)} />}
      {editingMat   && <EditMaterialModal mat={editingMat} onSave={handleSaveMat} onClose={() => setEditingMat(null)} />}
      <ToastContainer toasts={toasts} />
    </div>
  )
}
