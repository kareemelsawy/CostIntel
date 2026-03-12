import { useState } from 'react'
import { COLORS, CATEGORIES } from '../lib/constants'
import { Icon, Btn, Card, Toggle } from '../components/UI'
import { DEFAULT_ENGINE_RULES } from '../lib/defaults'

const SLOT_META = {
  body: { color: '#4F8EF7', label: 'Body', desc: 'Main carcass panels' },
  door: { color: '#A78BFA', label: 'Door', desc: 'Visible door/drawer fronts' },
  back: { color: '#14B8A6', label: 'Back', desc: 'Rear backing panel' },
}

// ── Industry standard references for validation callouts ─────────────────────
const INDUSTRY_REF = {
  sheet_waste_pct: { min: 0.05, max: 0.20, standard: 0.10, source: 'MDF/melamine (no grain): 10–15%. Grained materials: 20–25%. Industry averages for sheet goods.' },
  drawer_front_height: { min: 15, max: 30, standard: 20, source: 'Standard drawer face height in Egyptian & European cabinet-making. 15–20 cm typical.' },
  shelf_pins_per_shelf: { min: 2, max: 6, standard: 4, source: '4 pins per shelf (2 per side). Universal for adjustable shelving across all cabinet standards.' },
  slide_depth_clearance: { min: 3, max: 8, standard: 5, source: '5 cm clearance from cabinet depth for back panel + face frame. Blum/Hettich standard.' },
  hinge_h1: { min: 80, max: 130, standard: 100, source: 'Blum CLIP top: 2 hinges for doors up to ~100 cm / 6 kg (at 600 mm wide). Fabuwood: ≤ 91 cm (36″) → 2 hinges.' },
  hinge_h2: { min: 140, max: 200, standard: 150, source: 'Blum: 3 hinges for 100–150 cm / up to 12 kg. Fabuwood: 91–152 cm (36–60″) → 3 hinges. Above 150 cm → 4 hinges.' },
}

const FORMULA_VARS = [
  { var: 'W', desc: 'Width (cm)' }, { var: 'D', desc: 'Depth (cm)' }, { var: 'H', desc: 'Height (cm)' },
  { var: 'DOORS', desc: 'No. of doors' }, { var: 'DRAWERS', desc: 'No. of drawers' },
  { var: 'SHELVES', desc: 'No. of shelves' }, { var: 'SPACES', desc: 'No. of spaces' },
  { var: 'DOOR_TYPE', desc: '"Hinged" | "Sliding" | "Open"' },
  { var: 'HANDLE_TYPE', desc: '"Normal" | "Handleless"' },
  { var: 'HAS_MIRROR', desc: 'true / false' },
]

// ── Style helpers ────────────────────────────────────────────────────────────
const iSt = () => ({
  width: '100%', background: COLORS.inputBg, border: `1px solid ${COLORS.border}`,
  borderRadius: 7, padding: '7px 10px', color: COLORS.text, fontSize: 12,
  outline: 'none', lineHeight: 1.5, fontFamily: 'inherit',
})
const lblSt = () => ({
  fontSize: 10, fontWeight: 700, color: COLORS.textMuted,
  letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 4,
})
const tagSt = (color) => ({
  display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
  background: (color || COLORS.accent) + '18', color: color || COLORS.accent,
})

// ── Number input with industry-standard validation ───────────────────────────
function ValidatedNumInput({ value, onChange, unit, min = 0, step = 1, refData }) {
  const inRange = refData ? (value >= refData.min && value <= refData.max) : true
  const isStd = refData ? (value === refData.standard) : true
  const bc = !refData ? COLORS.border : isStd ? COLORS.green + '60' : inRange ? COLORS.amber + '60' : COLORS.red + '60'
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input type="number" value={value} min={min} step={step}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            width: 80, padding: '6px 10px', borderRadius: 7, border: `1.5px solid ${bc}`,
            background: COLORS.inputBg, color: COLORS.text, fontSize: 14, fontWeight: 700,
            fontFamily: 'inherit', outline: 'none', textAlign: 'right',
          }}
        />
        <span style={{ fontSize: 12, color: COLORS.textMuted, minWidth: 28 }}>{unit}</span>
        {refData && (
          <span style={{ fontSize: 10, fontWeight: 700, color: isStd ? COLORS.green : inRange ? COLORS.amber : COLORS.red }}>
            {isStd ? '✓ std' : inRange ? '⚠ custom' : '✗ out of range'}
          </span>
        )}
      </div>
      {refData && !isStd && (
        <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 4, lineHeight: 1.5, maxWidth: 340 }}>
          Standard: <strong style={{ color: COLORS.text }}>{refData.standard}{unit ? ' ' + unit : ''}</strong>
          {' · '}{refData.source}{' '}
          <span onClick={() => onChange(refData.standard)}
            style={{ color: COLORS.accent, cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}>
            Reset
          </span>
        </div>
      )}
    </div>
  )
}

// ── Collapsible section wrapper ──────────────────────────────────────────────
function SectionCard({ title, icon, badge, expanded, onToggle, children, actions }) {
  return (
    <Card style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
      <div onClick={onToggle} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '13px 18px', cursor: 'pointer', userSelect: 'none',
        borderBottom: expanded ? `1px solid ${COLORS.border}` : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
          <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{title}</span>
          {badge && <span style={tagSt(COLORS.accent)}>{badge}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={e => e.stopPropagation()}>
          {actions}
          <span style={{ fontSize: 18, color: COLORS.textMuted, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }} onClick={onToggle}>
            {expanded ? '−' : '+'}
          </span>
        </div>
      </div>
      {expanded && <div style={{ padding: '14px 18px' }}>{children}</div>}
    </Card>
  )
}

// ── Panel Rule Row ───────────────────────────────────────────────────────────
function PanelRuleRow({ rule, index, onChange, onRemove, onToggle }) {
  const up = (f, v) => onChange(index, { ...rule, [f]: v })
  const sc = SLOT_META[rule.material_slot]?.color || COLORS.accent

  return (
    <div style={{
      padding: '12px 0', borderBottom: `1px solid ${COLORS.border}`,
      opacity: rule.enabled ? 1 : 0.4, transition: 'opacity 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Toggle value={rule.enabled} onChange={() => onToggle(index)} />
        <input type="text" value={rule.label} onChange={e => up('label', e.target.value)}
          style={{ background: 'transparent', border: 'none', borderBottom: `1px dashed ${COLORS.border}`,
            color: COLORS.text, fontSize: 13, fontWeight: 700, outline: 'none', padding: '2px 4px', flex: 1 }}
          placeholder="Panel name" />
        <span style={tagSt(sc)}>{rule.material_slot}</span>
        <button onClick={() => onRemove(index)} title="Remove rule"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.red, fontSize: 13, padding: '2px 6px', opacity: 0.6 }}>
          <Icon name="trash" size={13} color={COLORS.red} />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, paddingLeft: 46 }}>
        <div><label style={lblSt()}>Qty Formula</label>
          <input type="text" value={rule.qty} onChange={e => up('qty', e.target.value)}
            style={{ ...iSt(), fontFamily: 'monospace', fontSize: 11, color: COLORS.amber }} /></div>
        <div><label style={lblSt()}>Area Formula</label>
          <input type="text" value={rule.area} onChange={e => up('area', e.target.value)}
            style={{ ...iSt(), fontFamily: 'monospace', fontSize: 11, color: COLORS.amber }} /></div>
        <div><label style={lblSt()}>Edge Formula</label>
          <input type="text" value={rule.edge_formula} onChange={e => up('edge_formula', e.target.value)}
            style={{ ...iSt(), fontFamily: 'monospace', fontSize: 11, color: COLORS.teal }} /></div>
        <div><label style={lblSt()}>Material Slot</label>
          <select value={rule.material_slot} onChange={e => up('material_slot', e.target.value)} style={{ ...iSt(), cursor: 'pointer' }}>
            {['body', 'door', 'back'].map(s => <option key={s} value={s}>{SLOT_META[s].label}</option>)}
          </select></div>
      </div>
      {(rule.condition !== undefined) && (
        <div style={{ paddingLeft: 46, marginTop: 6 }}>
          <label style={lblSt()}>Condition <span style={{ fontWeight: 400, textTransform: 'none' }}>(leave blank for always)</span></label>
          <input type="text" value={rule.condition || ''} onChange={e => up('condition', e.target.value)}
            style={{ ...iSt(), fontFamily: 'monospace', fontSize: 11, color: COLORS.purple, width: '70%' }}
            placeholder='e.g. DOORS>0 && DOOR_TYPE!="Open"' />
        </div>
      )}
      <div style={{ paddingLeft: 46, marginTop: 6 }}>
        <label style={lblSt()}>Note</label>
        <input type="text" value={rule.note || ''} onChange={e => up('note', e.target.value)}
          style={{ ...iSt(), color: COLORS.textMuted }} placeholder="Description of this rule" />
      </div>
    </div>
  )
}

// ── Accessory Rule Row ───────────────────────────────────────────────────────
function AccessoryRuleRow({ rule, index, onChange, onRemove, onToggle, accessories }) {
  const up = (f, v) => onChange(index, { ...rule, [f]: v })
  const accOpts = [
    { value: 'auto_by_depth', label: '⚡ Auto by depth (drawer slides)' },
    { value: 'area_based', label: '⚡ Area-based (m² items)' },
    { value: 'total_perimeter_m', label: '⚡ Total perimeter (edge banding)' },
  ]
  ;(accessories || []).forEach(a => {
    if (!accOpts.find(o => o.value === a.acc_id)) accOpts.push({ value: a.acc_id, label: a.name })
  })

  return (
    <div style={{
      padding: '12px 0', borderBottom: `1px solid ${COLORS.border}`,
      opacity: rule.enabled ? 1 : 0.4, transition: 'opacity 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Toggle value={rule.enabled} onChange={() => onToggle(index)} />
        <input type="text" value={rule.label} onChange={e => up('label', e.target.value)}
          style={{ background: 'transparent', border: 'none', borderBottom: `1px dashed ${COLORS.border}`,
            color: COLORS.text, fontSize: 13, fontWeight: 700, outline: 'none', padding: '2px 4px', flex: 1 }}
          placeholder="Accessory name" />
        <button onClick={() => onRemove(index)} title="Remove rule"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.red, fontSize: 13, padding: '2px 6px', opacity: 0.6 }}>
          <Icon name="trash" size={13} color={COLORS.red} />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, paddingLeft: 46 }}>
        <div><label style={lblSt()}>Accessory ID / Type</label>
          <select value={rule.acc_id} onChange={e => up('acc_id', e.target.value)} style={{ ...iSt(), cursor: 'pointer' }}>
            {accOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select></div>
        <div><label style={lblSt()}>Qty Formula</label>
          <input type="text" value={rule.qty} onChange={e => up('qty', e.target.value)}
            style={{ ...iSt(), fontFamily: 'monospace', fontSize: 11, color: COLORS.amber }} placeholder="e.g. DOORS*3" /></div>
        <div><label style={lblSt()}>Condition</label>
          <input type="text" value={rule.condition || ''} onChange={e => up('condition', e.target.value)}
            style={{ ...iSt(), fontFamily: 'monospace', fontSize: 11, color: COLORS.purple }}
            placeholder='e.g. DOORS>0 && DOOR_TYPE=="Hinged"' /></div>
      </div>
      <div style={{ paddingLeft: 46, marginTop: 6 }}>
        <label style={lblSt()}>Note</label>
        <input type="text" value={rule.note || ''} onChange={e => up('note', e.target.value)}
          style={{ ...iSt(), color: COLORS.textMuted }} placeholder="Description of this rule" />
      </div>
    </div>
  )
}

// ── Category Defaults Table ──────────────────────────────────────────────────
function CategoryDefaultsTable({ categoryDefaults, materials, onChange }) {
  const matOpts = materials.map(m => ({ value: m.material_id, label: m.name }))
  const selSt = {
    background: COLORS.inputBg, border: `1px solid ${COLORS.border}`, borderRadius: 6,
    padding: '5px 8px', color: COLORS.text, fontSize: 12, outline: 'none',
    fontFamily: 'inherit', cursor: 'pointer', width: '100%',
  }
  return (
    <div style={{ overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
            <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</th>
            {['body', 'back', 'door'].map(s => (
              <th key={s} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: SLOT_META[s].color }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: SLOT_META[s].color, display: 'inline-block' }} />
                  {SLOT_META[s].label}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CATEGORIES.map((cat, i) => {
            const def = categoryDefaults[cat] || { body: 'MDF_17_F2', back: 'MDF_3.2_F1', door: 'MDF_17_F2' }
            return (
              <tr key={cat} style={{ borderBottom: `1px solid ${COLORS.border}`, background: i % 2 === 0 ? 'transparent' : COLORS.surface + '60' }}>
                <td style={{ padding: '8px 16px', fontWeight: 600, color: COLORS.text, whiteSpace: 'nowrap', fontSize: 12 }}>{cat}</td>
                {['body', 'back', 'door'].map(slot => (
                  <td key={slot} style={{ padding: '5px 8px' }}>
                    <select value={def[slot] || ''} onChange={e => onChange(cat, slot, e.target.value)} style={selSt}>
                      {matOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN ENGINE PAGE COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function EnginePage({ engineRules, setEngineRules, materials, accessories, toast }) {
  const [sections, setSections] = useState({
    constants: true, categories: false, panels: false, accessories: false, reference: false,
  })
  const toggle = (s) => setSections(p => ({ ...p, [s]: !p[s] }))

  const constants = engineRules?.constants || {}
  const panelRules = engineRules?.panelRules || DEFAULT_ENGINE_RULES.panelRules
  const accessoryRules = engineRules?.accessoryRules || DEFAULT_ENGINE_RULES.accessoryRules

  // ── Constants CRUD ─────────────────────────────────────────────────────────
  function updateConstant(id, val) {
    setEngineRules(r => ({ ...r, constants: { ...r.constants, [id]: { ...r.constants[id], value: val } } }))
    toast('Constant updated')
  }
  function resetConstants() {
    setEngineRules(r => ({ ...r, constants: DEFAULT_ENGINE_RULES.constants }))
    toast('Constants reset to industry defaults')
  }

  // ── Category defaults ──────────────────────────────────────────────────────
  function updateCategoryDefault(cat, slot, val) {
    setEngineRules(r => ({
      ...r, categoryDefaults: { ...r.categoryDefaults, [cat]: { ...(r.categoryDefaults[cat] || {}), [slot]: val } }
    }))
    toast('Category default updated')
  }

  // ── Panel rules CRUD ───────────────────────────────────────────────────────
  function updatePanelRule(idx, rule) {
    setEngineRules(r => { const rr = [...(r.panelRules || DEFAULT_ENGINE_RULES.panelRules)]; rr[idx] = rule; return { ...r, panelRules: rr } })
    toast('Panel rule updated')
  }
  function togglePanelRule(idx) {
    setEngineRules(r => { const rr = [...(r.panelRules || DEFAULT_ENGINE_RULES.panelRules)]; rr[idx] = { ...rr[idx], enabled: !rr[idx].enabled }; return { ...r, panelRules: rr } })
  }
  function removePanelRule(idx) {
    if (!confirm('Remove this panel rule?')) return
    setEngineRules(r => { const rr = [...(r.panelRules || DEFAULT_ENGINE_RULES.panelRules)]; rr.splice(idx, 1); return { ...r, panelRules: rr } })
    toast('Panel rule removed')
  }
  function addPanelRule() {
    const nr = { id: 'panel_' + Date.now().toString(36), label: 'New Panel', qty: '1', area: 'W*D', material_slot: 'body', edge_formula: '0', enabled: true, condition: '', note: '' }
    setEngineRules(r => ({ ...r, panelRules: [...(r.panelRules || DEFAULT_ENGINE_RULES.panelRules), nr] }))
    toast('Panel rule added — configure it below')
  }
  function resetPanelRules() {
    if (!confirm('Reset panel rules to defaults?')) return
    setEngineRules(r => ({ ...r, panelRules: DEFAULT_ENGINE_RULES.panelRules }))
    toast('Panel rules reset')
  }

  // ── Accessory rules CRUD ───────────────────────────────────────────────────
  function updateAccRule(idx, rule) {
    setEngineRules(r => { const rr = [...(r.accessoryRules || DEFAULT_ENGINE_RULES.accessoryRules)]; rr[idx] = rule; return { ...r, accessoryRules: rr } })
    toast('Accessory rule updated')
  }
  function toggleAccRule(idx) {
    setEngineRules(r => { const rr = [...(r.accessoryRules || DEFAULT_ENGINE_RULES.accessoryRules)]; rr[idx] = { ...rr[idx], enabled: !rr[idx].enabled }; return { ...r, accessoryRules: rr } })
  }
  function removeAccRule(idx) {
    if (!confirm('Remove this accessory rule?')) return
    setEngineRules(r => { const rr = [...(r.accessoryRules || DEFAULT_ENGINE_RULES.accessoryRules)]; rr.splice(idx, 1); return { ...r, accessoryRules: rr } })
    toast('Accessory rule removed')
  }
  function addAccRule() {
    const nr = { id: 'acc_' + Date.now().toString(36), label: 'New Accessory', acc_id: 'SHELF_SUPPORT', qty: '1', condition: '', enabled: true, note: '' }
    setEngineRules(r => ({ ...r, accessoryRules: [...(r.accessoryRules || DEFAULT_ENGINE_RULES.accessoryRules), nr] }))
    toast('Accessory rule added — configure it below')
  }
  function resetAccRules() {
    if (!confirm('Reset accessory rules to defaults?')) return
    setEngineRules(r => ({ ...r, accessoryRules: DEFAULT_ENGINE_RULES.accessoryRules }))
    toast('Accessory rules reset')
  }

  // ── Reset everything ───────────────────────────────────────────────────────
  function resetAll() {
    if (!confirm('Reset ALL engine rules to factory defaults? This cannot be undone.')) return
    setEngineRules({ ...DEFAULT_ENGINE_RULES })
    toast('All engine rules reset to factory defaults')
  }

  const epCount = panelRules.filter(r => r.enabled).length
  const eaCount = accessoryRules.filter(r => r.enabled).length

  return (
    <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: COLORS.text, letterSpacing: '-0.02em', marginBottom: 4 }}>
            Costing Engine <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.accent, verticalAlign: 'middle' }}>v1</span>
          </h2>
          <p style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.5 }}>
            Configure constants, panel logic, accessory rules, and material defaults. Changes apply instantly to all SKU costs.
          </p>
        </div>
        <Btn variant="danger" size="sm" onClick={resetAll}><Icon name="refresh" size={13} /> Reset All</Btn>
      </div>

      {/* ═══ 1. ENGINE CONSTANTS ═══ */}
      <SectionCard
        title="Engine Constants" icon="⚙️"
        badge={`${Object.keys(constants).length} values`}
        expanded={sections.constants} onToggle={() => toggle('constants')}
        actions={<Btn variant="secondary" size="sm" onClick={e => { e.stopPropagation(); resetConstants() }}>Reset</Btn>}
      >
        <div style={{ marginBottom: 12, padding: '10px 14px', background: COLORS.accent + '08', border: `1px solid ${COLORS.accent}20`, borderRadius: 8, fontSize: 12, color: COLORS.textDim, lineHeight: 1.7 }}>
          <span style={{ color: COLORS.green, fontWeight: 700 }}>Green</span> = matches industry standard · <span style={{ color: COLORS.amber, fontWeight: 700 }}>Amber</span> = custom (within range) · <span style={{ color: COLORS.red, fontWeight: 700 }}>Red</span> = outside recommended range. Click "Reset" on any value to restore the standard.
        </div>
        {Object.entries(constants).map(([id, def]) => {
          const ref = INDUSTRY_REF[id]
          const dv = def.unit === '%' ? Math.round(def.value * 100) : def.value
          return (
            <div key={id} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '14px 0', borderBottom: `1px solid ${COLORS.border}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{def.label}</div>
                <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2, lineHeight: 1.5 }}>{def.note}</div>
              </div>
              <ValidatedNumInput
                value={dv} step={1} min={0}
                unit={def.unit === '%' ? '%' : def.unit}
                refData={ref ? {
                  min: def.unit === '%' ? ref.min * 100 : ref.min,
                  max: def.unit === '%' ? ref.max * 100 : ref.max,
                  standard: def.unit === '%' ? ref.standard * 100 : ref.standard,
                  source: ref.source,
                } : null}
                onChange={v => updateConstant(id, def.unit === '%' ? v / 100 : v)}
              />
            </div>
          )
        })}
        <div style={{ marginTop: 12, padding: '10px 14px', background: COLORS.amber + '10', border: `1px solid ${COLORS.amber}30`, borderRadius: 8, fontSize: 12, color: COLORS.textDim, lineHeight: 1.7 }}>
          <strong style={{ color: COLORS.amber }}>Note:</strong> Commercial rates (VAT, overhead %, seller margin, platform commission) are configured in <strong>Pricing Config</strong>, not here.
        </div>
      </SectionCard>

      {/* ═══ 2. PANEL RULES ═══ */}
      <SectionCard
        title="Panel Generation Rules" icon="🪵"
        badge={`${epCount}/${panelRules.length} active`}
        expanded={sections.panels} onToggle={() => toggle('panels')}
        actions={
          <div style={{ display: 'flex', gap: 6 }}>
            <Btn variant="secondary" size="sm" onClick={e => { e.stopPropagation(); resetPanelRules() }}>Reset</Btn>
            <Btn variant="primary" size="sm" onClick={e => { e.stopPropagation(); addPanelRule() }}><Icon name="plus" size={12} /> Add</Btn>
          </div>
        }
      >
        <div style={{ marginBottom: 12, padding: '10px 14px', background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Available Formula Variables</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
            {FORMULA_VARS.slice(0, 7).map(v => (
              <span key={v.var} style={{ fontSize: 11, color: COLORS.textDim }}>
                <code style={{ color: COLORS.amber, fontWeight: 700, fontFamily: 'monospace' }}>{v.var}</code> = {v.desc}
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {['body', 'back', 'door'].map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: SLOT_META[s].color + '12', border: `1px solid ${SLOT_META[s].color}30`, borderRadius: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: SLOT_META[s].color }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: SLOT_META[s].color }}>{SLOT_META[s].label}</span>
              <span style={{ fontSize: 10, color: COLORS.textMuted }}>– {SLOT_META[s].desc}</span>
            </div>
          ))}
        </div>
        {panelRules.map((rule, i) => (
          <PanelRuleRow key={rule.id || i} rule={rule} index={i}
            onChange={updatePanelRule} onRemove={removePanelRule} onToggle={togglePanelRule} />
        ))}
        {panelRules.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: COLORS.textMuted, fontSize: 13 }}>
            No panel rules. Click <strong>Add</strong> to create one.
          </div>
        )}
      </SectionCard>

      {/* ═══ 3. ACCESSORY RULES ═══ */}
      <SectionCard
        title="Accessory Auto-Assignment" icon="🔩"
        badge={`${eaCount}/${accessoryRules.length} active`}
        expanded={sections.accessories} onToggle={() => toggle('accessories')}
        actions={
          <div style={{ display: 'flex', gap: 6 }}>
            <Btn variant="secondary" size="sm" onClick={e => { e.stopPropagation(); resetAccRules() }}>Reset</Btn>
            <Btn variant="primary" size="sm" onClick={e => { e.stopPropagation(); addAccRule() }}><Icon name="plus" size={12} /> Add</Btn>
          </div>
        }
      >
        <div style={{ marginBottom: 10, padding: '10px 14px', background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 11, color: COLORS.textDim, lineHeight: 1.6 }}>
          <strong style={{ color: COLORS.text }}>How it works:</strong> Each rule auto-includes an accessory when its <span style={{ color: COLORS.purple, fontWeight: 600 }}>condition</span> is met.
          The <span style={{ color: COLORS.amber, fontWeight: 600 }}>qty formula</span> determines how many are needed.
          Special <code style={{ color: COLORS.accent }}>acc_id</code> types: <code>auto_by_depth</code> (selects slide by depth), <code>area_based</code> (m² pricing), <code>total_perimeter_m</code> (edge banding total).
        </div>
        {accessoryRules.map((rule, i) => (
          <AccessoryRuleRow key={rule.id || i} rule={rule} index={i}
            onChange={updateAccRule} onRemove={removeAccRule}
            onToggle={toggleAccRule} accessories={accessories || []} />
        ))}
        {accessoryRules.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: COLORS.textMuted, fontSize: 13 }}>
            No accessory rules. Click <strong>Add</strong> to create one.
          </div>
        )}
      </SectionCard>

      {/* ═══ 4. CATEGORY MATERIAL DEFAULTS ═══ */}
      <SectionCard
        title="Material Defaults by Category" icon="📦"
        badge={`${CATEGORIES.length} categories`}
        expanded={sections.categories} onToggle={() => toggle('categories')}
      >
        <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 12, lineHeight: 1.6 }}>
          When a SKU is imported via CSV, the engine auto-assigns body, back, and door materials based on its sub-category. You can override per-SKU in the Catalog.
        </div>
        <CategoryDefaultsTable
          categoryDefaults={engineRules?.categoryDefaults || {}}
          materials={materials}
          onChange={updateCategoryDefault}
        />
      </SectionCard>

      {/* ═══ 5. FORMULA REFERENCE ═══ */}
      <SectionCard
        title="Cost Waterfall Reference" icon="📐"
        expanded={sections.reference} onToggle={() => toggle('reference')}
      >
        <div style={{
          fontFamily: 'monospace', fontSize: 12, lineHeight: 2.2, color: COLORS.textDim,
          padding: '14px 18px', background: COLORS.inputBg, borderRadius: 8, border: `1px solid ${COLORS.border}`,
        }}>
          <div><span style={{ color: COLORS.accent, fontWeight: 700 }}>COGS</span> = Σ(Material Sheets × Price) + Edge Banding (m × price/m) + Σ(Accessory × Qty × Price)</div>
          <div><span style={{ color: COLORS.amber, fontWeight: 700 }}>Overhead</span> = COGS × overhead_percent</div>
          <div><span style={{ color: COLORS.text, fontWeight: 700 }}>Production Cost</span> = COGS + Overhead</div>
          <div style={{ borderTop: `1px dashed ${COLORS.border}`, marginTop: 8, paddingTop: 8 }}>
            <span style={{ color: COLORS.green, fontWeight: 700 }}>Seller Margin</span> = Production Cost × seller_margin_percent
          </div>
          <div><span style={{ color: COLORS.purple, fontWeight: 700 }}>VAT</span> = (Prod Cost + Seller Margin) × vat_percent</div>
          <div><span style={{ color: '#F97316', fontWeight: 700 }}>Recommended SP</span> = (Prod Cost + Seller Margin + VAT) ÷ (1 − platform_commission)</div>
        </div>
        <div style={{ marginTop: 14, fontSize: 12, color: COLORS.textMuted, lineHeight: 1.7 }}>
          <strong>Sheet Calculation:</strong> For each material, total panel area (cm²) is increased by the <em>Sheet Cutting Waste %</em> constant, then divided by sheet area (244 × 122 cm = 29,768 cm²) and rounded up to whole sheets.
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: COLORS.textMuted, lineHeight: 1.7 }}>
          <strong>Hinge Logic:</strong> Uses <em>Hinge Threshold 1</em> and <em>Threshold 2</em> from constants. Doors with height ≤ H1 get 2 hinges, ≤ H2 get 3, above H2 get 4. Based on Blum CLIP top specifications for 600mm wide doors.
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: COLORS.textMuted, lineHeight: 1.7 }}>
          <strong>Drawer Slide Selection:</strong> Cabinet depth minus <em>Slide Depth Clearance</em> determines slide length: ≤32→30cm, ≤37→35cm, ≤42→40cm, ≤47→45cm, ≤52→50cm, else 55cm.
        </div>
      </SectionCard>
    </div>
  )
}
