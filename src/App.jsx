import { useState, useEffect, useMemo, useCallback } from 'react'
import { COLORS, setThemeColors } from './lib/constants'
import { calculateSKUCost, skuToEngineInput } from './lib/engine'
import { DEFAULT_MATERIALS, DEFAULT_ACCESSORIES, DEFAULT_COMMERCIAL, SAMPLE_SKUS, CATEGORY_MATERIAL_DEFAULTS } from './lib/defaults'
import { supabase, hasSupabase, signInWithGoogle, signOut, getUser,
  dbUpsertSKU, dbUpsertSKUs, dbDeleteSKU,
  dbUpsertMaterial, dbDeleteMaterial, dbUpdateMaterialPrice,
  dbUpsertAccessory, dbDeleteAccessory, dbUpdateAccessoryPrice,
  dbUpdateCommercial, dbLoadEngineOverrides } from './lib/supabase'
import { Icon, Btn, ToastContainer } from './components/UI'
import { SKUDetailModal, EditSKUModal, EditMaterialModal } from './components/Modals'
import CatalogPage from './pages/CatalogPage'
import CalculatorPage from './pages/CalculatorPage'
import AnalyticsPage from './pages/AnalyticsPage'
import PricingPage from './pages/PricingPage'
import EngineOverridesPage from './pages/EngineOverridesPage'

// ─── Persistence helpers ──────────────────────────────────────────────────────
const LS_SKUS = 'costintel_skus'
const LS_MATS = 'costintel_materials'
const LS_ACCS = 'costintel_accessories'
const LS_COMM = 'costintel_commercial'
function loadLS(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback } catch { return fallback } }
function saveLS(key, val) { try { localStorage.setItem(key, JSON.stringify(val)) } catch {} }

// ─── Login Page ───────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleGoogleLogin() {
    if (!hasSupabase) { onLogin({ email: 'demo@homzmart.com', user_metadata: { full_name: 'Demo User', avatar_url: '' } }); return }
    setLoading(true); setError('')
    const { error: err } = await signInWithGoogle()
    if (err) { setError(err.message || 'Login failed'); setLoading(false) }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#4F8EF7,#A78BFA)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none"><rect x="6" y="6" width="6" height="20" rx="1" fill="#fff" opacity="0.9"/><rect x="16" y="6" width="6" height="20" rx="1" fill="#fff" opacity="0.65"/><rect x="6" y="6" width="16" height="5" rx="1" fill="#fff"/></svg>
            </div>
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

  // Auth check
  useEffect(() => {
    if (!hasSupabase) { setAuthChecked(true); return }
    getUser().then(u => {
      if (u && u.email?.endsWith('@homzmart.com')) setUser(u)
      setAuthChecked(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user
      if (u && u.email?.endsWith('@homzmart.com')) { setUser(u) }
      else if (u) { signOut(); setUser(null) }
      else setUser(null)
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
    { id: 'analytics', icon: 'chart', label: 'Dashboard' },
    { id: 'catalog', icon: 'grid', label: 'SKU Catalog' },
    { id: 'calculator', icon: 'calc', label: 'Calculator' },
    { id: 'engine', icon: 'zap', label: 'Engine Rules' },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', background: COLORS.bg, color: COLORS.text, overflow: 'hidden', fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      {sidebarOpen && <aside style={{ width: 240, background: COLORS.surface, borderRight: `1px solid ${COLORS.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100vh' }}>
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#4F8EF7,#A78BFA)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 32 32" fill="none"><rect x="6" y="6" width="6" height="20" rx="1" fill="#fff" opacity="0.9"/><rect x="16" y="6" width="6" height="20" rx="1" fill="#fff" opacity="0.65"/><rect x="6" y="6" width="16" height="5" rx="1" fill="#fff"/></svg>
            </div>
            <div>
              <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em', color: COLORS.accent }}>CostIntel</div>
              <div style={{ fontSize: 10, color: COLORS.textMuted }}>v4.0</div>
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

        {/* Bottom section — Settings + User profile (Pulse-style) */}
        <div style={{ padding: '4px 8px', borderTop: `1px solid ${COLORS.border}` }}>
          {/* Settings nav item */}
          <div onClick={() => setView('pricing')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: view === 'pricing' ? COLORS.surfaceHover : 'transparent', color: view === 'pricing' ? COLORS.text : COLORS.textDim, marginBottom: 4, transition: 'all 0.15s' }}
            onMouseEnter={e => { if (view !== 'pricing') e.currentTarget.style.background = COLORS.surfaceHover }} onMouseLeave={e => { if (view !== 'pricing') e.currentTarget.style.background = 'transparent' }}>
            <span style={{ width: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="settings" size={15} /></span>
            <span style={{ fontWeight: 500, fontSize: 13 }}>Settings</span>
          </div>
        </div>

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
            <button onClick={() => { signOut(); setUser(null); localStorage.clear() }} title="Sign out" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, color: COLORS.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = COLORS.red} onMouseLeave={e => e.currentTarget.style.color = COLORS.textMuted}>
              <Icon name="logout" size={16} />
            </button>
          </div>
        </div>
      </aside>}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <header style={{ height: 52, background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, flexShrink: 0 }}>
          <button onClick={() => setSidebarOpen(p => !p)} style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', padding: '4px 6px', borderRadius: 6 }}><Icon name="menu" size={18} /></button>
          <span style={{ fontSize: 12, color: COLORS.textMuted }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          {dbLoading && (
            <span style={{ fontSize: 11, color: COLORS.amber, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: COLORS.amber, display: 'inline-block', animation: 'pulse 1.2s ease-in-out infinite' }} />
              Syncing from database…
            </span>
          )}
          <div style={{ marginLeft: 'auto' }} />
          <button onClick={() => setIsDark(!isDark)} style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, padding: '5px 10px', cursor: 'pointer', color: COLORS.textDim, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
            <Icon name={isDark ? 'sun' : 'moon'} size={15} color={COLORS.textMuted} /> {isDark ? 'Light' : 'Dark'}
          </button>
        </header>

        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {view === 'analytics' && <AnalyticsPage skus={skus} skuCosts={skuCosts} setSelectedSku={setSelectedSku} userName={userName} />}
            {view === 'catalog' && <CatalogPage skus={skus} setSkus={setSkus} skuCosts={skuCosts} setSelectedSku={setSelectedSku} setEditingSku={setEditingSku} toast={toast} catDefaults={CATEGORY_MATERIAL_DEFAULTS} onDeleteSku={handleDeleteSku} onImportSKUs={handleImportSKUs} />}
            {view === 'calculator' && <CalculatorPage materials={materials} accessories={accessories} commercial={commercial} setSkus={setSkus} toast={toast} prefill={calcPrefill} clearPrefill={() => setCalcPrefill(null)} catDefaults={CATEGORY_MATERIAL_DEFAULTS} onSaveSku={async (s) => { setSkus(p => [...p, s]); if (hasSupabase) await dbUpsertSKU(s); toast('Saved to catalog') }} />}
            {view === 'pricing' && <PricingPage materials={materials} setMaterials={setMaterials} accessories={accessories} setAccessories={setAccessories} commercial={commercial} setCommercial={setCommercial} setEditingMat={setEditingMat} toast={toast} onUpdateMatPrice={handleUpdateMatPrice} onDeleteMaterial={handleDeleteMaterial} onUpdateAccPrice={handleUpdateAccPrice} onDeleteAccessory={handleDeleteAccessory} onUpdateCommercial={handleUpdateCommercial} />}
            {view === 'engine' && <EngineOverridesPage overrides={engineOverrides} setOverrides={setEngineOverrides} toast={toast} />}
          </div>
        </main>
      </div>

      {selectedSku && <SKUDetailModal sku={selectedSku} materials={materials} accessories={accessories} commercial={commercial} onClose={() => setSelectedSku(null)} onEdit={() => { setEditingSku({ ...selectedSku }); setSelectedSku(null) }} onCalc={() => { setCalcPrefill(selectedSku); setView('calculator'); setSelectedSku(null) }} onSaveSku={handleSaveSkuFromReport} />}
      {editingSku && <EditSKUModal sku={editingSku} materials={materials} catDefaults={CATEGORY_MATERIAL_DEFAULTS} onSave={handleSaveSku} onClose={() => setEditingSku(null)} />}
      {editingMat && <EditMaterialModal mat={editingMat} onSave={handleSaveMat} onClose={() => setEditingMat(null)} />}
      <ToastContainer toasts={toasts} />
    </div>
  )
}
