import { useState, useEffect, useMemo, useCallback } from 'react'
import { COLORS, setThemeColors } from './lib/constants'
import { calculateSKUCost, skuToEngineInput } from './lib/engine'
import { DEFAULT_MATERIALS, DEFAULT_ACCESSORIES, DEFAULT_COMMERCIAL, SAMPLE_SKUS } from './lib/defaults'
import { supabase, hasSupabase } from './lib/supabase'
import { Icon, Btn, ToastContainer } from './components/UI'
import { SKUDetailModal, EditSKUModal, EditMaterialModal } from './components/Modals'
import CatalogPage from './pages/CatalogPage'
import CalculatorPage from './pages/CalculatorPage'
import AnalyticsPage from './pages/AnalyticsPage'
import PricingPage from './pages/PricingPage'

export default function App() {
  const [isDark, setIsDark] = useState(true)
  const [view, setView] = useState('catalog')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [toasts, setToasts] = useState([])

  // Data
  const [skus, setSkus] = useState(SAMPLE_SKUS)
  const [materials, setMaterials] = useState(DEFAULT_MATERIALS)
  const [accessories, setAccessories] = useState(DEFAULT_ACCESSORIES)
  const [commercial, setCommercial] = useState(DEFAULT_COMMERCIAL)

  // Modals
  const [selectedSku, setSelectedSku] = useState(null)
  const [editingSku, setEditingSku] = useState(null)
  const [editingMat, setEditingMat] = useState(null)
  const [calcPrefill, setCalcPrefill] = useState(null)

  // Theme
  useEffect(() => {
    setThemeColors(isDark)
    document.body.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  // Toast
  const toast = useCallback((message, type = 'success') => {
    const id = Date.now()
    setToasts(p => [...p, { id, message, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000)
  }, [])

  // Supabase sync
  useEffect(() => {
    if (!hasSupabase) return
    Promise.all([
      supabase.from('materials').select('*').eq('is_active', true),
      supabase.from('accessories_pricing').select('*'),
      supabase.from('commercial_settings').select('*'),
      supabase.from('skus').select('*').eq('is_active', true).order('created_at', { ascending: false }),
    ]).then(([matR, accR, comR, skuR]) => {
      if (matR.data?.length) setMaterials(matR.data)
      if (accR.data?.length) {
        const a = {}; accR.data.forEach(r => { a[r.key] = r.price }); setAccessories(p => ({ ...p, ...a }))
      }
      if (comR.data?.length) {
        const c = {}; comR.data.forEach(r => { c[r.key] = r.value }); setCommercial(p => ({ ...p, ...c }))
      }
      if (skuR.data?.length) setSkus(skuR.data)
    }).catch(e => console.warn('Supabase load:', e))
  }, [])

  // All costs
  const skuCosts = useMemo(() => {
    const m = {}
    skus.forEach(s => { m[s.sku_code] = calculateSKUCost(skuToEngineInput(s), materials, accessories, commercial) })
    return m
  }, [skus, materials, accessories, commercial])

  // Nav
  const navItems = [
    { id: 'catalog', icon: 'grid', label: 'SKU Catalog' },
    { id: 'calculator', icon: 'calc', label: 'Quick Calculator' },
    { id: 'analytics', icon: 'chart', label: 'Cost Analytics' },
    { id: 'pricing', icon: 'dollar', label: 'Price Config' },
  ]

  // Save handlers for modals
  function handleSaveSku(data, isNew) {
    if (isNew) {
      if (!data.sku_code) data.sku_code = `SKU-${Date.now().toString(36).toUpperCase()}`
      setSkus(p => [...p, data])
      toast('SKU added')
    } else {
      setSkus(p => p.map(s => s.sku_code === editingSku.sku_code ? data : s))
      toast('SKU updated')
    }
    setEditingSku(null)
  }

  function handleSaveMat(data, isNew) {
    if (!data.material_id) data.material_id = data.name.replace(/\s+/g, '_').toUpperCase()
    if (isNew) {
      setMaterials(p => [...p, data])
      toast('Material added')
    } else {
      setMaterials(p => p.map(m => m.material_id === editingMat.material_id ? data : m))
      toast('Material updated')
    }
    setEditingMat(null)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: COLORS.bg, color: COLORS.text, overflow: 'hidden', fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>

      {/* Sidebar */}
      {sidebarOpen && (
        <aside style={{ width: 240, background: COLORS.surface, borderRight: `1px solid ${COLORS.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100vh' }}>
          {/* Logo */}
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#4F8EF7,#A78BFA)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="layers" size={18} color="#fff" />
              </div>
              <div>
                <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em', color: COLORS.accent }}>SKU Intel</div>
                <div style={{ fontSize: 10, color: COLORS.textMuted, letterSpacing: '0.04em' }}>Cost Engine v1.0</div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ padding: '10px 8px', flex: 1 }}>
            {navItems.map(n => (
              <div key={n.id} onClick={() => setView(n.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: view === n.id ? COLORS.surfaceHover : 'transparent', color: view === n.id ? COLORS.text : COLORS.textDim, marginBottom: 1, transition: 'all 0.15s' }}
                onMouseEnter={e => { if (view !== n.id) e.currentTarget.style.background = COLORS.surfaceHover }}
                onMouseLeave={e => { if (view !== n.id) e.currentTarget.style.background = 'transparent' }}>
                <span style={{ width: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={n.icon} size={15} /></span>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{n.label}</span>
              </div>
            ))}
          </nav>

          {/* Footer stats */}
          <div style={{ padding: '12px 16px', borderTop: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 6 }}>Catalog</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: COLORS.textDim }}>{skus.length} SKUs</span>
              <span style={{ color: COLORS.textDim }}>{materials.length} Materials</span>
            </div>
            {!hasSupabase && (
              <div style={{ marginTop: 8, fontSize: 10, color: COLORS.amber, background: COLORS.amber + '15', borderRadius: 6, padding: '4px 8px' }}>
                Demo mode — no Supabase connected
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Header */}
        <header style={{ height: 52, background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, flexShrink: 0 }}>
          <button onClick={() => setSidebarOpen(p => !p)} style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', padding: '4px 6px', borderRadius: 6 }}>
            <Icon name="menu" size={18} />
          </button>
          <span style={{ fontSize: 12, color: COLORS.textMuted }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          <div style={{ marginLeft: 'auto' }} />
          <div style={{ display: 'flex', alignItems: 'center', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: 'hidden' }}>
            <button onClick={() => setIsDark(!isDark)} style={{ background: 'none', border: 'none', padding: '5px 10px', cursor: 'pointer', color: COLORS.textDim, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
              <Icon name={isDark ? 'sun' : 'moon'} size={15} color={COLORS.textMuted} />
              <span style={{ fontSize: 12, fontWeight: 600 }}>{isDark ? 'Light' : 'Dark'}</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {view === 'catalog' && <CatalogPage skus={skus} setSkus={setSkus} skuCosts={skuCosts} setSelectedSku={setSelectedSku} setEditingSku={setEditingSku} toast={toast} />}
            {view === 'calculator' && <CalculatorPage materials={materials} accessories={accessories} commercial={commercial} setSkus={setSkus} toast={toast} prefill={calcPrefill} clearPrefill={() => setCalcPrefill(null)} />}
            {view === 'analytics' && <AnalyticsPage skus={skus} skuCosts={skuCosts} setSelectedSku={setSelectedSku} />}
            {view === 'pricing' && <PricingPage materials={materials} setMaterials={setMaterials} accessories={accessories} setAccessories={setAccessories} commercial={commercial} setCommercial={setCommercial} setEditingMat={setEditingMat} toast={toast} />}
          </div>
        </main>
      </div>

      {/* Modals */}
      {selectedSku && (
        <SKUDetailModal
          sku={selectedSku} materials={materials} accessories={accessories} commercial={commercial}
          onClose={() => setSelectedSku(null)}
          onEdit={() => { setEditingSku({ ...selectedSku }); setSelectedSku(null) }}
          onCalc={() => { setCalcPrefill(selectedSku); setView('calculator'); setSelectedSku(null) }}
        />
      )}
      {editingSku && (
        <EditSKUModal
          sku={editingSku} materials={materials}
          onSave={(data) => handleSaveSku(data, !!editingSku._isNew)}
          onClose={() => setEditingSku(null)}
        />
      )}
      {editingMat && (
        <EditMaterialModal
          mat={editingMat}
          onSave={(data) => handleSaveMat(data, !!editingMat._isNew)}
          onClose={() => setEditingMat(null)}
        />
      )}

      {/* Toasts */}
      <ToastContainer toasts={toasts} />
    </div>
  )
}
