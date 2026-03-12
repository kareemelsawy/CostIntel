import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { COLORS, setThemeColors } from './lib/constants'
import { calculateSKUCost, skuToEngineInput } from './lib/engine'
import { DEFAULT_MATERIALS, DEFAULT_ACCESSORIES, DEFAULT_COMMERCIAL, SAMPLE_SKUS, CATEGORY_MATERIAL_DEFAULTS, DEFAULT_ENGINE_RULES } from './lib/defaults'
import { supabase, hasSupabase, signInWithGoogle, signOut, getUser } from './lib/supabase'
import { Icon, Btn, ToastContainer } from './components/UI'
import { SKUDetailModal, EditSKUModal, EditMaterialModal } from './components/Modals'
import CatalogPage from './pages/CatalogPage'
import CalculatorPage from './pages/CalculatorPage'
import AnalyticsPage from './pages/AnalyticsPage'
import PricingPage from './pages/PricingPage'
import EnginePage from './pages/EnginePage'

// ─── DB Status Badge ─────────────────────────────────────────────────────────
function DbStatusBadge({ dbStatus: s, hasSupabase, loadFromDB }) {
  const [show, setShow] = useState(false)
  const color = s.phase==='loaded' ? '#22C55E' : (s.phase==='fetching'||s.phase==='init') ? '#F59E0B' : '#EF4444'
  const label = s.phase==='loaded' ? `✓ DB · ${s.skuCount} SKUs` : s.phase==='fetching' ? '⟳ Connecting…' : s.phase==='init' ? '· Initialising' : s.phase==='empty' ? '⚠ DB empty' : `✗ ${s.phase}`
  const rawUrl = import.meta.env.VITE_SUPABASE_URL || ''
  const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  const urlPreview = rawUrl ? rawUrl.slice(0,32)+'…' : '(empty)'
  const keyPreview = rawKey ? rawKey.slice(0,16)+'…' : '(empty)'
  return (
    <div style={{padding:'8px 10px', borderTop:'1px solid rgba(255,255,255,0.08)'}}>
      <div onClick={()=>setShow(v=>!v)} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',padding:'4px 8px',borderRadius:6,background:color+'18',border:`1px solid ${color}30`}}>
        <div style={{width:6,height:6,borderRadius:'50%',background:color,flexShrink:0}}/>
        <span style={{fontSize:10,fontWeight:700,color,flex:1}}>{label}</span>
        <span style={{fontSize:9,color:'#64748B'}}>tap</span>
      </div>
      {show && <div style={{marginTop:6,padding:'8px',background:'rgba(0,0,0,0.2)',borderRadius:6,border:'1px solid rgba(255,255,255,0.08)'}}>
        <div style={{fontSize:10,color:'#94A3B8',lineHeight:1.8,wordBreak:'break-all'}}>
          <div><b style={{color:'#F1F5F9'}}>Phase:</b> {s.phase}</div>
          <div><b style={{color:'#F1F5F9'}}>SKUs in DB:</b> {s.skuCount}</div>
          <div><b style={{color:'#F1F5F9'}}>URL:</b> {urlPreview}</div>
          <div><b style={{color:'#F1F5F9'}}>Key:</b> {keyPreview}</div>
          {s.error && <div><b style={{color:'#EF4444'}}>Error:</b> {s.error}</div>}
          {s.ts && <div><b style={{color:'#F1F5F9'}}>Time:</b> {s.ts.slice(11,19)}</div>}
        </div>
        <button onClick={()=>{setShow(false);loadFromDB()}} style={{marginTop:6,width:'100%',padding:'4px',background:'rgba(99,179,237,0.15)',border:'1px solid rgba(99,179,237,0.3)',borderRadius:5,color:'#63B3ED',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
          ↺ Retry load from DB
        </button>
      </div>}
    </div>
  )
}

// ─── Persistence helpers ──────────────────────────────────────────────────────
const LS_SKUS = 'costintel_skus'
const LS_MATS = 'costintel_materials'
const LS_ACCS = 'costintel_accessories'
const LS_COMM = 'costintel_commercial'
const LS_ENGINE = 'costintel_engine_rules'
function loadLS(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback } catch { return fallback } }
function saveLS(key, val) { try { localStorage.setItem(key, JSON.stringify(val)) } catch {} }

// Upsert SKUs to Supabase — single bulk call so all users see the data
async function syncSkusToSupabase(skuList) {
  if (!hasSupabase || !supabase) return
  try {
    const rows = skuList.map(s => ({
      sku_code: s.sku_code, name: s.name || '', image_link: s.image_link || '',
      seller: s.seller || '', sub_category: s.sub_category || 'Wardrobes',
      commercial_material: s.commercial_material || 'MDF',
      width_cm: s.width_cm, depth_cm: s.depth_cm, height_cm: s.height_cm,
      door_type: s.door_type || 'Hinged', doors_count: s.doors_count || 0,
      drawers_count: s.drawers_count || 0, shelves_count: s.shelves_count || 0,
      spaces_count: s.spaces_count || 0, hangers_count: s.hangers_count || 0,
      internal_division: s.internal_division || 'NO', unit_type: s.unit_type || 'Floor Standing',
      has_mirror: !!s.has_mirror, mirror_count: s.mirror_count || 0,
      primary_color: s.primary_color || '', handle_type: s.handle_type || 'Normal',
      has_back_panel: s.has_back_panel || 'Close',
      body_material_id: s.body_material_id || 'MDF_17_F2',
      back_material_id: s.back_material_id || 'MDF_3.2_F1',
      door_material_id: s.door_material_id || 'MDF_17_F2',
      selling_price: s.selling_price || 0, is_active: true,
    }))
    // Batch upserts — Supabase handles ~500 rows per request reliably
    const BATCH = 500
    let totalSynced = 0
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH)
      const { error } = await supabase.from('skus').upsert(batch, { onConflict: 'sku_code' })
      if (error) { console.error('[CostIntel] Upsert error (batch', i, '):', error); break }
      totalSynced += batch.length
    }
  } catch (e) { console.warn('Sync SKUs error:', e) }
}

// Soft-delete SKUs from Supabase by setting is_active = false
async function deleteSkusFromSupabase(skuCodes) {
  if (!hasSupabase || !supabase || !skuCodes.length) return
  try {
    await supabase.from('skus').update({ is_active: false }).in('sku_code', skuCodes)
  } catch (e) { console.warn('Delete SKUs error:', e) }
}

// ─── Login Page ───────────────────────────────────────────────────────────────
function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleGoogleLogin() {
    if (!hasSupabase) {
      setError('Google Sign-In is not configured. Contact your administrator.')
      return
    }
    setLoading(true); setError('')
    const { error: err } = await signInWithGoogle()
    if (err) { setError(err.message || 'Login failed'); setLoading(false) }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="52" height="52">
              <defs>
                <linearGradient id="ci_login_bg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1C1C1E"/>
                  <stop offset="100%" stopColor="#48484A"/>
                </linearGradient>
                <linearGradient id="ci_login_shine" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18"/>
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <rect x="0" y="0" width="512" height="512" rx="115" ry="115" fill="url(#ci_login_bg)"/>
              <rect x="0" y="0" width="512" height="512" rx="115" ry="115" fill="url(#ci_login_shine)"/>
              <text x="256" y="316" fontFamily="'Syne','DM Sans',sans-serif" fontWeight="800" fontSize="240" letterSpacing="-8" textAnchor="middle" fill="#ffffff">CI</text>
            </svg>
          </div>
          <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 28, fontWeight: 800, color: '#E2E8F0', letterSpacing: '-0.02em', marginBottom: 8 }}>CostIntel</h1>
          <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.5 }}>Material costing intelligence for furniture operations</p>
        </div>

        <button className="google-btn" onClick={handleGoogleLogin} disabled={loading}>
          <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </button>



        {error && <p style={{ color: '#EF4444', fontSize: 13, marginTop: 12 }}>{error}</p>}
        <p style={{ fontSize: 11, color: '#475569', marginTop: 20 }}>Restricted to @homzmart.com accounts</p>
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
  const [skus, setSkus] = useState(() => loadLS(LS_SKUS, SAMPLE_SKUS))
  const [materials, setMaterials] = useState(() => loadLS(LS_MATS, DEFAULT_MATERIALS))
  const [accessories, setAccessories] = useState(() => loadLS(LS_ACCS, DEFAULT_ACCESSORIES))
  const [commercial, setCommercial] = useState(() => loadLS(LS_COMM, DEFAULT_COMMERCIAL))
  const [engineRules, setEngineRules] = useState(() => loadLS(LS_ENGINE, DEFAULT_ENGINE_RULES))
  const [selectedSku, setSelectedSku] = useState(null)
  const [editingSku, setEditingSku] = useState(null)
  const [editingMat, setEditingMat] = useState(null)
  const [calcPrefill, setCalcPrefill] = useState(null)

  // Persist to localStorage on every change
  useEffect(() => { saveLS(LS_SKUS, skus) }, [skus])
  useEffect(() => { saveLS(LS_MATS, materials) }, [materials])
  useEffect(() => { saveLS(LS_ACCS, accessories) }, [accessories])
  useEffect(() => { saveLS(LS_COMM, commercial) }, [commercial])
  useEffect(() => { saveLS(LS_ENGINE, engineRules) }, [engineRules])

  // Track if initial DB load is done (to avoid writing defaults back to DB)
  const [dbLoaded, setDbLoaded] = useState(false)
  const [dbStatus, setDbStatus] = useState({ phase:'init', skuCount:0, error:null, ts:null })
  // skipSyncRef: true while we are loading from DB — prevents writing DB data back to DB
  const skipSyncRef = useRef(true)
  // dbWasEmptyRef: true if DB had no SKUs on load — so we push local SKUs once user logs in
  const dbWasEmptyRef = useRef(false)

  // Auth check — handles initial load AND OAuth redirect return
  useEffect(() => {
    if (!hasSupabase) {
      // No Supabase — check if user was previously "logged in" via localStorage
      // Don't restore user from localStorage — no Supabase to verify, show login instead
      // (demo mode removed — always require real auth)
      setAuthChecked(true)
      return
    }

    // Check current session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user
      if (u && u.email?.endsWith('@homzmart.com')) setUser(u)
      else if (u) { supabase.auth.signOut(); setUser(null) }
      setAuthChecked(true)
    })

    // Listen for auth changes (login, logout, token refresh, OAuth redirect)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user
      if (event === 'SIGNED_IN' && u) {
        if (u.email?.endsWith('@homzmart.com')) { setUser(u) }
        else { supabase.auth.signOut(); setUser(null) }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      } else if (event === 'TOKEN_REFRESHED' && u) {
        if (u.email?.endsWith('@homzmart.com')) setUser(u)
        else { supabase.auth.signOut(); setUser(null) }
      }
      setAuthChecked(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Load SKUs + config from Supabase — callable manually for retry
  const loadFromDB = useCallback(() => {
    if (!hasSupabase) {
      setDbStatus({ phase:'no_supabase', skuCount:0, error:'VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set', ts:new Date().toISOString() })
      setDbLoaded(true)
      return
    }
    setDbStatus({ phase:'fetching', skuCount:0, error:null, ts:new Date().toISOString() })
    Promise.all([
      supabase.from('materials').select('*').eq('is_active', true),
      supabase.from('accessories').select('*').eq('is_active', true),
      supabase.from('commercial_settings').select('*'),
      supabase.from('skus').select('*').eq('is_active', true).order('created_at', { ascending: false }),
    ]).then(([mR, aR, cR, sR]) => {
      const errs = [mR.error, aR.error, cR.error, sR.error].filter(Boolean)
      if (mR.data?.length) setMaterials(mR.data)
      if (aR.data?.length) setAccessories(aR.data)
      if (cR.data?.length) { const c = {}; cR.data.forEach(r => { c[r.key] = r.value }); setCommercial(p => ({ ...p, ...c })) }
      if (sR.data?.length) {
        skipSyncRef.current = true
          setDbStatus({ phase:'loaded', skuCount: sR.data.length, error: errs.map(e=>e.message).join(' | ')||null, ts:new Date().toISOString() })
        setSkus(sR.data)
      } else {
        setDbStatus({ phase: errs.length ? 'error' : 'empty', skuCount:0, error: errs.map(e=>e.message).join(' | ')||null, ts:new Date().toISOString() })
        dbWasEmptyRef.current = true  // will push local SKUs once user is authenticated
      }
      setTimeout(() => { skipSyncRef.current = false }, 500)
      setDbLoaded(true)
    }).catch(e => {
      console.error('[CostIntel] DB load error:', e)
      setDbStatus({ phase:'error', skuCount:0, error: e?.message||String(e), ts:new Date().toISOString() })
      setDbLoaded(true)
    })
  }, [user])

  // Load from DB whenever user logs in, and reload when tab regains focus
  useEffect(() => {
    if (!user) return  // SKUs are auth-gated — only load when logged in
    loadFromDB()
    let visTimer = null
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        clearTimeout(visTimer)
        visTimer = setTimeout(loadFromDB, 2000) // debounce — wait 2s before reloading
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => { document.removeEventListener('visibilitychange', onVisible); clearTimeout(visTimer) }
  }, [user])

  // Write SKUs to Supabase on user-initiated changes only (not on DB load echo)
  // Also fires when user logs in — if DB was empty, push local SKUs now
  useEffect(() => {
    if (!dbLoaded || !hasSupabase || !user) return
    if (dbWasEmptyRef.current) {
      dbWasEmptyRef.current = false
      const localSkus = loadLS(LS_SKUS, [])
      if (localSkus.length) {
        skipSyncRef.current = false
        syncSkusToSupabase(localSkus)
      }
      return
    }
    if (skipSyncRef.current) {
      skipSyncRef.current = false
      return
    }
    syncSkusToSupabase(skus)
  }, [skus, dbLoaded, user])

  useEffect(() => { setThemeColors(isDark); document.body.setAttribute('data-theme', isDark ? 'dark' : 'light') }, [isDark])

  const toast = useCallback((message, type = 'success') => {
    const id = Date.now(); setToasts(p => [...p, { id, message, type }]); setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000)
  }, [])

  const skuCosts = useMemo(() => {
    const m = {}; skus.forEach(s => { m[s.sku_code] = calculateSKUCost(skuToEngineInput(s), materials, accessories, commercial, false, engineRules?.constants) }); return m
  }, [skus, materials, accessories, commercial])

  function handleSaveSku(data) {
    if (editingSku?._isNew) {
      if (!data.sku_code) data.sku_code = 'SKU-' + Date.now().toString(36).toUpperCase()
      if (skus.some(s => s.sku_code === data.sku_code)) { toast('SKU code already exists — use a unique code', 'error'); return }
      setSkus(p => [...p, data]); toast('SKU added')
    }
    else { setSkus(p => p.map(s => s.sku_code === editingSku.sku_code ? data : s)); toast('SKU updated') }
    setEditingSku(null)
  }
  function handleSaveSkuFromReport(data) { setSkus(p => p.map(s => s.sku_code === data.sku_code ? data : s)); setSelectedSku(data); toast('Materials updated') }
  function handleSaveMat(data) {
    if (editingMat?._isNew) { setMaterials(p => [...p, data]); toast('Material added') }
    else { setMaterials(p => p.map(m => m.material_id === editingMat.material_id ? data : m)); toast('Material updated') }
    setEditingMat(null)
  }

  const userName = user?.user_metadata?.full_name?.split(' ')[0] || 'there'
  const userFullName = user?.user_metadata?.full_name || 'Admin'

  // Save user to localStorage for demo mode persistence
  // User session managed by Supabase auth — not stored in localStorage

  // Show login if not authenticated (always — both Supabase and demo mode)
  if (!authChecked) return <div className="login-page"><div style={{ color: '#64748B', fontSize: 14 }}>Loading...</div></div>
  if (!user) return <LoginPage />

  const navItems = [
    { id: 'analytics', icon: 'chart', label: 'Dashboard' },
    { id: 'catalog', icon: 'grid', label: 'SKU Catalog' },
    { id: 'engine', icon: 'cpu', label: 'Costing Engine' },
    { id: 'pricing', icon: 'tag', label: 'Pricing Config' },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', background: COLORS.bg, color: COLORS.text, overflow: 'hidden', fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      {sidebarOpen && <aside style={{ width: 240, background: COLORS.surface, borderRight: `1px solid ${COLORS.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100vh' }}>
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="32" height="32" style={{ flexShrink: 0 }}>
              <defs>
                <linearGradient id="ci_sb_bg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1C1C1E"/>
                  <stop offset="100%" stopColor="#48484A"/>
                </linearGradient>
                <linearGradient id="ci_sb_shine" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18"/>
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <rect x="0" y="0" width="512" height="512" rx="115" ry="115" fill="url(#ci_sb_bg)"/>
              <rect x="0" y="0" width="512" height="512" rx="115" ry="115" fill="url(#ci_sb_shine)"/>
              <text x="256" y="316" fontFamily="'Syne','DM Sans',sans-serif" fontWeight="800" fontSize="240" letterSpacing="-8" textAnchor="middle" fill="#ffffff">CI</text>
            </svg>
            <div>
              <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em', color: COLORS.text }}>CostIntel</div>
              <div style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: 500 }}>v4.6</div>
            </div>
          </div>
        </div>
        <nav style={{ padding: '10px 8px', flex: 1 }}>
          {navItems.map(n => {
            const active = view === n.id
            return <div key={n.id} onClick={() => setView(n.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: active ? COLORS.surfaceHover : 'transparent', color: active ? COLORS.text : COLORS.textDim, marginBottom: 1, transition: 'all 0.15s' }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = COLORS.surfaceHover }} onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
              <span style={{ width: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={n.icon} size={15} /></span>
              <span style={{ fontWeight: 500, fontSize: 13 }}>{n.label}</span>
            </div>
          })}
        </nav>

        {/* User profile card */}
        <div style={{ padding: '12px 12px', borderTop: `1px solid ${COLORS.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {user?.user_metadata?.avatar_url
              ? <img src={user.user_metadata.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0 }} referrerPolicy="no-referrer" />
              : <div style={{ width: 32, height: 32, borderRadius: 10, background: COLORS.accent + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="user" size={16} color={COLORS.accent} /></div>
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userFullName || 'Guest'}</div>
              <div style={{ fontSize: 10, color: COLORS.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email || ''}</div>
            </div>
            <button onClick={async () => { if (hasSupabase && supabase) await supabase.auth.signOut(); setUser(null); setDbLoaded(false); localStorage.removeItem('costintel_user') }} title="Sign out" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, color: COLORS.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = COLORS.red} onMouseLeave={e => e.currentTarget.style.color = COLORS.textMuted}>
              <Icon name="logout" size={16} />
            </button>
          </div>
        </div>

        <DbStatusBadge dbStatus={dbStatus} hasSupabase={hasSupabase} loadFromDB={loadFromDB} />
      </aside>}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <header style={{ height: 52, background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, flexShrink: 0 }}>
          <button onClick={() => setSidebarOpen(p => !p)} style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', padding: '4px 6px', borderRadius: 6 }}><Icon name="menu" size={18} /></button>
          <span style={{ fontSize: 12, color: COLORS.textMuted }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          <div style={{ marginLeft: 'auto' }} />
          <button onClick={() => setIsDark(!isDark)} style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, padding: '5px 10px', cursor: 'pointer', color: COLORS.textDim, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
            <Icon name={isDark ? 'sun' : 'moon'} size={15} color={COLORS.textMuted} /> {isDark ? 'Light' : 'Dark'}
          </button>
        </header>

        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {view === 'analytics' && <AnalyticsPage skus={skus} skuCosts={skuCosts} setSelectedSku={setSelectedSku} userName={userName} />}
            {view === 'catalog' && <CatalogPage skus={skus} setSkus={setSkus} skuCosts={skuCosts} setSelectedSku={setSelectedSku} setEditingSku={setEditingSku} toast={toast} catDefaults={CATEGORY_MATERIAL_DEFAULTS} onDeleteSkus={deleteSkusFromSupabase} onSyncSkus={syncSkusToSupabase} />}
            {view === 'calculator' && <CalculatorPage materials={materials} accessories={accessories} commercial={commercial} engineRules={engineRules} setSkus={setSkus} toast={toast} prefill={calcPrefill} clearPrefill={() => setCalcPrefill(null)} catDefaults={CATEGORY_MATERIAL_DEFAULTS} />}
            {view === 'engine' && <EnginePage engineRules={engineRules} setEngineRules={setEngineRules} materials={materials} accessories={accessories} toast={toast} />}
            {view === 'pricing' && <PricingPage materials={materials} setMaterials={setMaterials} accessories={accessories} setAccessories={setAccessories} commercial={commercial} setCommercial={setCommercial} setEditingMat={setEditingMat} toast={toast} />}
          </div>
        </main>
      </div>

      {selectedSku && <SKUDetailModal sku={selectedSku} materials={materials} accessories={accessories} commercial={commercial} engineRules={engineRules} onClose={() => setSelectedSku(null)} onEdit={() => { setEditingSku({ ...selectedSku }); setSelectedSku(null) }} onCalc={() => { setCalcPrefill(selectedSku); setView('calculator'); setSelectedSku(null) }} onSaveSku={handleSaveSkuFromReport} />}
      {editingSku && <EditSKUModal sku={editingSku} materials={materials} catDefaults={CATEGORY_MATERIAL_DEFAULTS} onSave={handleSaveSku} onClose={() => setEditingSku(null)} />}
      {editingMat && <EditMaterialModal mat={editingMat} onSave={handleSaveMat} onClose={() => setEditingMat(null)} />}
      <ToastContainer toasts={toasts} />
    </div>
  )
}
