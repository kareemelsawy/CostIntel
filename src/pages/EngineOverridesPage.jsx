import { useState, useCallback } from 'react'
import { COLORS } from '../lib/constants'
import { Icon, Btn, Card, Modal } from '../components/UI'
import { dbUpsertEngineOverride, dbDeleteEngineOverride, hasSupabase } from '../lib/supabase'

export const ENGINE_RULES = [
  {
    key: 'hinges_per_door', section: 'Accessories', label: 'Hinges per Door',
    type: 'number', step: 1, min: 1, default: 3, unit: 'hinges',
    impact: 'accessories_cost',
    formula: 'doors_count × hinges_per_door × hinge_price',
    formulaVars: { doors_count: 'No. of doors on the SKU', hinges_per_door: '← this setting', hinge_price: 'Price of HINGE_FULL in Settings' },
    example: { inputs: { doors_count: 2, hinges_per_door: 3, hinge_price: 17 }, result: '2 × 3 × 17 = EGP 102' },
  },
  {
    key: 'shelf_pins_per_shelf', section: 'Accessories', label: 'Shelf Pins per Shelf',
    type: 'number', step: 1, min: 1, default: 4, unit: 'pins',
    impact: 'accessories_cost',
    formula: 'shelves_count × shelf_pins_per_shelf × pin_price',
    formulaVars: { shelves_count: 'No. of shelves on the SKU', shelf_pins_per_shelf: '← this setting', pin_price: 'Price of SHELF_SUPPORT in Settings' },
    example: { inputs: { shelves_count: 4, shelf_pins_per_shelf: 4, pin_price: 2 }, result: '4 × 4 × 2 = EGP 32' },
  },
  {
    key: 'sliding_tracks_per_door', section: 'Accessories', label: 'Sliding Tracks per Door',
    type: 'number', step: 1, min: 1, default: 1, unit: 'tracks',
    impact: 'accessories_cost',
    formula: 'doors_count × sliding_tracks_per_door × latch_price',
    formulaVars: { doors_count: 'No. of doors (Sliding SKUs only)', sliding_tracks_per_door: '← this setting', latch_price: 'Price of LATCH_SLIDE in Settings' },
    example: { inputs: { doors_count: 2, sliding_tracks_per_door: 1, latch_price: 150 }, result: '2 × 1 × 150 = EGP 300' },
  },
  {
    key: 'sheet_wastage_factor', section: 'Sheet Wastage', label: 'Sheet Wastage Factor',
    type: 'number', step: 0.01, min: 1.0, default: 1.0, unit: '×',
    impact: 'materials_cost',
    formula: 'ceil(total_panel_area / sheet_area × sheet_wastage_factor) × price_per_sheet',
    formulaVars: { total_panel_area: 'Sum of all panel areas (cm²)', sheet_area: '244 × 122 = 29,768 cm²', sheet_wastage_factor: '← this setting (1.0 = no waste, 1.1 = 10% extra)', price_per_sheet: 'Material price per sheet from Settings' },
    example: { inputs: { total_panel_area: '45,000 cm²', sheet_area: '29,768', sheet_wastage_factor: 1.1, price_per_sheet: 1050 }, result: 'ceil(1.514 × 1.1) = 2 sheets → 2 × 1050 = EGP 2,100' },
  },
  {
    key: 'door_edge_sides', section: 'Edge Banding', label: 'Door Edge Banding Sides',
    type: 'select',
    options: [{ value: '4', label: '4 sides — full perimeter' }, { value: '3', label: '3 sides' }, { value: '2', label: '2 sides — long edges only' }],
    default: '4', unit: 'sides',
    impact: 'edge_banding_cost',
    formula: 'doors_count × (door_edge_sides/4) × 2×(door_H + door_W) × edge_price / 100',
    formulaVars: { doors_count: 'No. of doors', door_H: 'Unit height (cm)', door_W: 'Width ÷ doors_count (cm)', door_edge_sides: '← this setting (4 = all 4 sides)', edge_price: 'EDGE_STD price per meter' },
    example: { inputs: { doors_count: 2, height: 210, width: 60, door_edge_sides: 4, edge_price: 4 }, result: '2 × 2×(210+60) × 4 / 100 = EGP 43.20' },
  },
  {
    key: 'back_panel_edge', section: 'Edge Banding', label: 'Back Panel Gets Edge Banding',
    type: 'boolean', default: false,
    impact: 'edge_banding_cost',
    formula: 'back_panel_edge ? 2×(W+H) × edge_price/100 : 0',
    formulaVars: { back_panel_edge: '← this setting', W: 'Unit width (cm)', H: 'Unit height (cm)', edge_price: 'EDGE_STD price per meter' },
    example: { inputs: { back_panel_edge: false }, result: 'EGP 0 (back panel is flush-fit, no banding needed)' },
  },
  {
    key: 'overhead_base', section: 'Commercial Waterfall', label: 'Overhead Applied To',
    type: 'select',
    options: [{ value: 'cogs', label: 'COGS (materials + edge + accessories)' }, { value: 'materials_only', label: 'Materials cost only' }],
    default: 'cogs',
    impact: 'overhead_amount',
    formula: 'overhead = overhead_base_value × overhead_percent',
    formulaVars: { overhead_base_value: '← total of whichever base you select', overhead_percent: 'Set in Settings → Commercial (default 10%)' },
    example: { inputs: { COGS: 1500, overhead_percent: '10%' }, result: '1,500 × 0.10 = EGP 150 overhead → Production Cost = 1,650' },
  },
  {
    key: 'seller_margin_base', section: 'Commercial Waterfall', label: 'Seller Margin Applied To',
    type: 'select',
    options: [{ value: 'production_cost', label: 'Production Cost (COGS + overhead)' }, { value: 'cogs', label: 'COGS only' }],
    default: 'production_cost',
    impact: 'recommended_price',
    formula: 'seller_margin = seller_margin_base_value × seller_margin_percent',
    formulaVars: { seller_margin_base_value: '← total of whichever base you select', seller_margin_percent: 'Set in Settings → Commercial (default 15%)' },
    example: { inputs: { production_cost: 1650, seller_margin_percent: '15%' }, result: '1,650 × 0.15 = EGP 247.50 → subtotal = 1,897.50' },
  },
  {
    key: 'homzmart_margin_base', section: 'Commercial Waterfall', label: 'Homzmart Margin Applied To',
    type: 'select',
    options: [{ value: 'after_seller', label: 'Production + Seller margin' }, { value: 'production_cost', label: 'Production Cost only' }],
    default: 'after_seller',
    impact: 'recommended_price',
    formula: 'homzmart_margin = homzmart_margin_base_value × homzmart_margin_percent',
    formulaVars: { homzmart_margin_base_value: '← total of whichever base you select', homzmart_margin_percent: 'Set in Settings → Commercial (default 40%)' },
    example: { inputs: { after_seller: 1897.5, homzmart_margin_percent: '40%' }, result: '1,897.50 × 0.40 = EGP 759 → subtotal = 2,656.50' },
  },
]

const SECTIONS = [...new Set(ENGINE_RULES.map(r => r.section))]

const IMPACT_META = {
  materials_cost:    { color: '#4F8EF7', label: 'Materials Cost' },
  edge_banding_cost: { color: '#14B8A6', label: 'Edge Banding' },
  accessories_cost:  { color: '#A78BFA', label: 'Accessories' },
  overhead_amount:   { color: '#F59E0B', label: 'Overhead' },
  recommended_price: { color: '#22C55E', label: 'Recommended Price' },
}

const iSt = () => ({ background: COLORS.inputBg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '5px 10px', color: COLORS.text, fontSize: 12, outline: 'none', fontFamily: 'inherit' })

function FormulaDrawer({ rule, isOverridden, currentValue }) {
  const [open, setOpen] = useState(false)
  const imp = IMPACT_META[rule.impact] || { color: COLORS.textMuted, label: rule.impact }
  return (
    <div style={{ marginTop: 8 }}>
      <button onClick={() => setOpen(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 5, color: COLORS.accent, fontSize: 11, fontWeight: 600, fontFamily: 'inherit' }}>
        <Icon name={open ? 'arrowUp' : 'arrowDown'} size={11} color={COLORS.accent} />
        {open ? 'Hide formula' : 'Show formula & example'}
      </button>
      {open && (
        <div style={{ marginTop: 8, borderRadius: 10, border: `1px solid ${COLORS.border}`, overflow: 'hidden', fontSize: 12 }}>
          <div style={{ padding: '6px 12px', background: imp.color + '15', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: imp.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Affects → {imp.label}</span>
          </div>
          <div style={{ padding: '10px 12px', background: COLORS.bg, borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>Formula</div>
            <code style={{ fontSize: 12, color: COLORS.accent, background: COLORS.surface, padding: '6px 10px', borderRadius: 6, display: 'block', lineHeight: 1.7, fontFamily: 'monospace', wordBreak: 'break-word' }}>{rule.formula}</code>
          </div>
          {rule.formulaVars && (
            <div style={{ padding: '10px 12px', background: COLORS.bg, borderBottom: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>Variables</div>
              {Object.entries(rule.formulaVars).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                  <code style={{ color: COLORS.purple, fontFamily: 'monospace', flexShrink: 0, minWidth: 180, fontSize: 11 }}>{k}</code>
                  <span style={{ color: COLORS.textDim, fontSize: 11 }}>{v}</span>
                </div>
              ))}
            </div>
          )}
          {rule.example && (
            <div style={{ padding: '10px 12px', background: COLORS.bg }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>Worked Example</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                {Object.entries(rule.example.inputs).map(([k, v]) => (
                  <span key={k} style={{ fontSize: 11, background: COLORS.surface, border: `1px solid ${k === rule.key ? COLORS.amber + '80' : COLORS.border}`, borderRadius: 4, padding: '2px 8px', fontFamily: 'monospace', color: k === rule.key ? COLORS.amber : COLORS.textDim }}>
                    {k} = {String(v)}{k === rule.key && isOverridden ? <span style={{ color: COLORS.accent }}> → {String(currentValue)}</span> : ''}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 12, color: COLORS.green, fontWeight: 700, fontFamily: 'monospace' }}>→ {rule.example.result}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RuleCard({ rule, value, isOverridden, onSet, onClear }) {
  const displayVal = isOverridden ? value : rule.default
  const imp = IMPACT_META[rule.impact] || { color: COLORS.textMuted, label: '' }

  function handleChange(raw) {
    let v = raw
    if (rule.type === 'number') v = Number(raw)
    else if (rule.type === 'boolean') v = raw === 'true' || raw === true
    onSet(v)
  }

  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${isOverridden ? COLORS.accent + '55' : COLORS.border}`, borderRadius: 12, padding: '14px 16px', position: 'relative' }}>
      {isOverridden && <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 9, fontWeight: 700, background: COLORS.accent + '22', color: COLORS.accent, padding: '2px 7px', borderRadius: 8, letterSpacing: '0.05em' }}>OVERRIDDEN</span>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {/* Label + impact */}
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 3 }}>{rule.label}</div>
          <span style={{ fontSize: 10, fontWeight: 700, color: imp.color, background: imp.color + '15', padding: '2px 7px', borderRadius: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>→ {imp.label}</span>
        </div>

        {/* Default value */}
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: COLORS.textMuted, marginBottom: 3 }}>Default</div>
          <span style={{ fontSize: 12, fontFamily: 'monospace', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: '3px 8px', color: COLORS.textDim }}>
            {typeof rule.default === 'boolean' ? (rule.default ? 'Yes' : 'No') : rule.type === 'select' ? (rule.options.find(o => (o.value || o) === String(rule.default))?.label || rule.default) : String(rule.default)}
          </span>
        </div>

        <span style={{ color: COLORS.textMuted, fontSize: 14, flexShrink: 0 }}>→</span>

        {/* Input */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: isOverridden ? COLORS.accent : COLORS.textMuted, marginBottom: 3, fontWeight: isOverridden ? 700 : 400 }}>Override</div>
          {rule.type === 'boolean' ? (
            <select value={String(displayVal)} onChange={e => handleChange(e.target.value)} style={{ ...iSt(), minWidth: 70 }}>
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          ) : rule.type === 'select' ? (
            <select value={String(displayVal)} onChange={e => handleChange(e.target.value)} style={{ ...iSt(), minWidth: 220 }}>
              {rule.options.map(o => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input type="number" value={displayVal} onChange={e => handleChange(e.target.value)} min={rule.min ?? 0} step={rule.step ?? 0.1} style={{ ...iSt(), width: 80, textAlign: 'right' }} />
          )}
        </div>

        {/* Reset / spacer */}
        {isOverridden
          ? <button onClick={onClear} style={{ background: COLORS.red + '15', border: `1px solid ${COLORS.red}33`, color: COLORS.red, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', flexShrink: 0 }}>Reset</button>
          : <div style={{ width: 52, flexShrink: 0 }} />
        }
      </div>

      <FormulaDrawer rule={rule} isOverridden={isOverridden} currentValue={displayVal} />
    </div>
  )
}

function CustomModal({ onSave, onClose }) {
  const [key, setKey] = useState(''); const [value, setValue] = useState(''); const [note, setNote] = useState('')
  const lSt = { fontSize: 11, fontWeight: 700, color: COLORS.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }
  return (
    <Modal onClose={onClose} width={440}>
      <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.text, marginBottom: 18 }}>Add Custom Override</div>
      <div style={{ display: 'grid', gap: 12 }}>
        <div><label style={lSt}>Key</label><input value={key} onChange={e => setKey(e.target.value.replace(/\s/g,'_').toLowerCase())} placeholder="e.g. custom_markup_factor" style={{ ...iSt(), width: '100%' }} /></div>
        <div><label style={lSt}>Value</label><input value={value} onChange={e => setValue(e.target.value)} placeholder="e.g. 1.05" style={{ ...iSt(), width: '100%' }} /></div>
        <div><label style={lSt}>Note</label><input value={note} onChange={e => setNote(e.target.value)} placeholder="What this override does" style={{ ...iSt(), width: '100%' }} /></div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn onClick={() => { if (key && value) { onSave({ key, value, note }); onClose() } }}>Save</Btn>
      </div>
    </Modal>
  )
}

export default function EngineOverridesPage({ overrides, setOverrides, toast }) {
  const [showCustom, setShowCustom] = useState(false)
  const [openSections, setOpenSections] = useState(() => Object.fromEntries(SECTIONS.map(s => [s, true])))

  const activeCount = ENGINE_RULES.filter(r => overrides[r.key] !== undefined).length
  const customOverrides = overrides.__custom__ || {}
  const customCount = Object.keys(customOverrides).length

  const setOverride = useCallback(async (key, value) => {
    setOverrides(p => ({ ...p, [key]: value }))
    if (hasSupabase) await dbUpsertEngineOverride({ override_key: key, override_value: JSON.stringify(value) })
    toast(`"${key}" updated`)
  }, [setOverrides, toast])

  const clearOverride = useCallback(async (key) => {
    setOverrides(p => { const n = { ...p }; delete n[key]; return n })
    if (hasSupabase) await dbDeleteEngineOverride(key)
    toast(`"${key}" reset to default`)
  }, [setOverrides, toast])

  const saveCustom = useCallback(async ({ key, value, note }) => {
    const nc = { ...(overrides.__custom__ || {}), [key]: { value, note } }
    setOverrides(p => ({ ...p, __custom__: nc }))
    if (hasSupabase) await dbUpsertEngineOverride({ override_key: '__custom__', override_value: JSON.stringify(nc) })
    toast(`"${key}" saved`)
  }, [overrides, setOverrides, toast])

  const deleteCustom = useCallback(async (key) => {
    const nc = { ...(overrides.__custom__ || {}) }; delete nc[key]
    setOverrides(p => ({ ...p, __custom__: nc }))
    if (hasSupabase) await dbUpsertEngineOverride({ override_key: '__custom__', override_value: JSON.stringify(nc) })
    toast(`"${key}" removed`)
  }, [overrides, setOverrides, toast])

  const resetAll = async () => {
    setOverrides({})
    if (hasSupabase) await Promise.all([...ENGINE_RULES.map(r => dbDeleteEngineOverride(r.key)), dbDeleteEngineOverride('__custom__')])
    toast('All overrides reset')
  }

  const WATERFALL = [
    { label: 'Materials', color: '#4F8EF7', sub: 'sheets × price' },
    { label: '+ Edge Banding', color: '#14B8A6', sub: 'meters × price/m' },
    { label: '+ Accessories', color: '#A78BFA', sub: 'qty × unit price' },
    { label: '= COGS', color: COLORS.text, bold: true },
    { label: '+ Overhead', color: '#F59E0B', sub: 'COGS × overhead%' },
    { label: '= Production Cost', color: COLORS.text, bold: true },
    { label: '+ Seller Margin', color: '#F97316', sub: 'ProdCost × seller%' },
    { label: '+ Homzmart', color: '#EF4444', sub: '(+Seller) × HM%' },
    { label: '+ VAT 14%', color: COLORS.textDim, sub: 'subtotal × 14%' },
    { label: '= Sell Price', color: '#22C55E', bold: true },
  ]

  return (
    <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: COLORS.text, letterSpacing: '-0.02em', marginBottom: 4 }}>Engine Rules</h2>
          <p style={{ fontSize: 13, color: COLORS.textMuted }}>
            Override costing defaults. Click "Show formula" on any rule to see exactly how it affects the price.
            {(activeCount + customCount) > 0
              ? <span style={{ color: COLORS.amber, fontWeight: 600 }}> · {activeCount + customCount} active override{activeCount + customCount !== 1 ? 's' : ''}</span>
              : <span style={{ color: COLORS.green, fontWeight: 600 }}> · All defaults active</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(activeCount + customCount) > 0 && <Btn variant="danger" size="sm" onClick={resetAll}><Icon name="refresh" size={13} /> Reset All</Btn>}
          <Btn size="sm" onClick={() => setShowCustom(true)}><Icon name="plus" size={13} /> Custom Key</Btn>
        </div>
      </div>

      {!hasSupabase && (
        <div style={{ padding: '8px 14px', background: COLORS.amber + '15', border: `1px solid ${COLORS.amber}30`, borderRadius: 8, marginBottom: 16, fontSize: 12, color: COLORS.amber, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="info" size={13} color={COLORS.amber} />
          No database — overrides reset on refresh. Connect Supabase to persist.
        </div>
      )}

      {/* Waterfall diagram */}
      <Card style={{ marginBottom: 24, padding: '14px 18px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>Full Cost Waterfall — how every rule flows into the final price</div>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, flexWrap: 'wrap', rowGap: 8 }}>
          {WATERFALL.map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              {i > 0 && <div style={{ width: 10, height: 1, background: COLORS.border, flexShrink: 0 }} />}
              <div style={{ background: step.color + (step.bold ? '20' : '12'), border: `1px solid ${step.color}30`, borderRadius: 8, padding: '6px 10px', textAlign: 'center', minWidth: 80 }}>
                <div style={{ fontSize: 11, fontWeight: step.bold ? 800 : 600, color: step.color, whiteSpace: 'nowrap' }}>{step.label}</div>
                {step.sub && <div style={{ fontSize: 9, color: COLORS.textMuted, marginTop: 2, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{step.sub}</div>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Rule sections */}
      {SECTIONS.map(section => {
        const rules = ENGINE_RULES.filter(r => r.section === section)
        const sectionActive = rules.filter(r => overrides[r.key] !== undefined).length
        const isOpen = openSections[section]
        return (
          <div key={section} style={{ marginBottom: 20 }}>
            <button onClick={() => setOpenSections(p => ({ ...p, [section]: !p[section] }))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, marginBottom: isOpen ? 10 : 0, padding: '0 0 4px 0', fontFamily: 'inherit', width: '100%', textAlign: 'left' }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: COLORS.text }}>{section}</span>
              {sectionActive > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: COLORS.accent + '22', color: COLORS.accent, padding: '2px 8px', borderRadius: 10 }}>{sectionActive} override{sectionActive !== 1 ? 's' : ''}</span>}
              <Icon name={isOpen ? 'arrowUp' : 'arrowDown'} size={13} color={COLORS.textMuted} style={{ marginLeft: 'auto' }} />
            </button>
            {isOpen && <div style={{ display: 'grid', gap: 8 }}>
              {rules.map(rule => <RuleCard key={rule.key} rule={rule} value={overrides[rule.key]} isOverridden={overrides[rule.key] !== undefined} onSet={v => setOverride(rule.key, v)} onClear={() => clearOverride(rule.key)} />)}
            </div>}
          </div>
        )
      })}

      {/* Custom overrides */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: COLORS.text, marginBottom: customCount > 0 ? 10 : 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          Custom Keys
          {customCount > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: COLORS.purple + '22', color: COLORS.purple, padding: '2px 8px', borderRadius: 10 }}>{customCount}</span>}
        </div>
        {customCount > 0 && (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: COLORS.bg, borderBottom: `1px solid ${COLORS.border}` }}>
                {['Key','Value','Note',''].map((h,i)=><th key={i} style={{ padding:'8px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:COLORS.textMuted,letterSpacing:'0.06em',textTransform:'uppercase' }}>{h}</th>)}
              </tr></thead>
              <tbody>{Object.entries(customOverrides).map(([k,v])=>(
                <tr key={k} style={{ borderBottom:`1px solid ${COLORS.border}` }}>
                  <td style={{ padding:'10px 14px',fontFamily:'monospace',fontSize:12,color:COLORS.accent }}>{k}</td>
                  <td style={{ padding:'10px 14px',fontWeight:600,color:COLORS.text }}>{v.value}</td>
                  <td style={{ padding:'10px 14px',color:COLORS.textDim,fontSize:12 }}>{v.note||'—'}</td>
                  <td style={{ padding:'8px 14px' }}><button onClick={()=>deleteCustom(k)} style={{ background:'none',border:'none',cursor:'pointer',padding:4,color:COLORS.textMuted }}><Icon name="trash" size={14}/></button></td>
                </tr>
              ))}</tbody>
            </table>
          </Card>
        )}
      </div>

      {showCustom && <CustomModal onSave={saveCustom} onClose={() => setShowCustom(false)} />}
    </div>
  )
}
