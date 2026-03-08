import { useState, useCallback } from 'react'
import { COLORS } from '../lib/constants'
import { Icon, Btn, Card, Modal } from '../components/UI'
import { dbUpsertEngineOverride, dbDeleteEngineOverride, hasSupabase } from '../lib/supabase'

// ─── Default engine rules (mirrors engine.js logic, editable here) ────────────
export const ENGINE_RULE_DEFINITIONS = [
  {
    section: 'Panel Generation',
    rules: [
      { key: 'panel_side_qty',        label: 'Side Panels — Quantity',           type: 'number', default: 2,   unit: 'panels',   description: 'Number of side panels per unit' },
      { key: 'panel_side_edge_per',   label: 'Side Panels — Edge per panel (cm)',type: 'number', default: 'height', unit: 'cm', description: 'Edge banding per side panel. Default = 2×Height. Override as fixed cm or use formula.' },
      { key: 'panel_top_edge_per',    label: 'Top Panel — Edge (cm)',            type: 'number', default: 'width', unit: 'cm',  description: 'Edge banding for top panel. Default = Width.' },
      { key: 'panel_bottom_edge_per', label: 'Bottom Panel — Edge (cm)',         type: 'number', default: 'width', unit: 'cm',  description: 'Edge banding for bottom panel. Default = Width.' },
      { key: 'panel_door_edge_factor',label: 'Door Edge Banding Factor',         type: 'number', default: 2,   unit: '× (H+W)', description: 'Multiplier for door perimeter edge calculation. Default = 2 (full perimeter).' },
      { key: 'back_panel_edge',       label: 'Back Panel — Has Edge Banding',    type: 'boolean',default: false,              description: 'Whether the back panel gets edge banding applied.' },
    ]
  },
  {
    section: 'Sheet Wastage',
    rules: [
      { key: 'sheet_wastage_factor',  label: 'Global Sheet Wastage Factor',      type: 'number', default: 1.0,  unit: '×',       description: 'Multiply sheets needed by this factor to account for cutting waste. 1.0 = no wastage, 1.1 = 10% extra.' },
      { key: 'sheet_rounding',        label: 'Sheet Rounding Method',            type: 'select', default: 'ceil', options: ['ceil','round','floor'], description: 'How to round partial sheets. "ceil" always rounds up (conservative).' },
    ]
  },
  {
    section: 'Accessory Logic',
    rules: [
      { key: 'hinges_per_door',       label: 'Hinges per Hinged Door',           type: 'number', default: 3,   unit: 'hinges',  description: 'Number of hinges applied per hinged door.' },
      { key: 'shelf_pins_per_shelf',  label: 'Shelf Support Pins per Shelf',     type: 'number', default: 4,   unit: 'pins',    description: 'Number of shelf support pins per shelf.' },
      { key: 'sliding_tracks_per_door',label:'Sliding Tracks per Sliding Door',  type: 'number', default: 1,   unit: 'tracks',  description: 'Number of sliding track sets per sliding door.' },
      { key: 'handle_mode',           label: 'Handle Assignment Rule',           type: 'select', default: 'doors_and_drawers', options: ['doors_and_drawers','doors_only','drawers_only'], description: 'Which elements receive handles when Handle Type = Normal.' },
    ]
  },
  {
    section: 'Commercial Waterfall',
    rules: [
      { key: 'overhead_base',         label: 'Overhead Calculated On',           type: 'select', default: 'cogs', options: ['cogs','materials_only','materials_and_edge'], description: 'What cost base the overhead % is applied to.' },
      { key: 'seller_margin_base',    label: 'Seller Margin Calculated On',      type: 'select', default: 'production_cost', options: ['production_cost','cogs'], description: 'Base for seller margin %.' },
      { key: 'homzmart_margin_base',  label: 'Homzmart Margin Calculated On',    type: 'select', default: 'after_seller', options: ['after_seller','production_cost'], description: 'Base for Homzmart commission %.' },
      { key: 'vat_base',             label: 'VAT Calculated On',                type: 'select', default: 'after_homzmart', options: ['after_homzmart','selling_price'], description: 'Base for VAT %.' },
    ]
  },
  {
    section: 'Custom Overrides',
    rules: [] // user-defined key/value pairs
  }
]

const iSt = () => ({ width: '100%', background: COLORS.inputBg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '8px 12px', color: COLORS.text, fontSize: 13, outline: 'none', lineHeight: 1.5, fontFamily: 'inherit' })
const lSt = () => ({ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 })

// ─── Single rule row ──────────────────────────────────────────────────────────
function RuleRow({ def, value, isOverridden, onSet, onClear }) {
  const [localVal, setLocalVal] = useState(isOverridden ? String(value) : String(def.default))

  const displayDefault = def.type === 'boolean'
    ? (def.default ? 'Yes' : 'No')
    : String(def.default)

  function commit(v) {
    setLocalVal(String(v))
    let parsed = v
    if (def.type === 'number') parsed = Number(v)
    else if (def.type === 'boolean') parsed = v === 'true' || v === true
    onSet(parsed)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 80px', gap: 12, alignItems: 'center', padding: '10px 16px', borderBottom: `1px solid ${COLORS.border}`, background: isOverridden ? COLORS.accent + '08' : 'transparent' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{def.label}</div>
        <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{def.description}</div>
      </div>

      <div style={{ fontSize: 12, color: COLORS.textDim, textAlign: 'center' }}>
        <span style={{ background: COLORS.bg, padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace' }}>{displayDefault}{def.unit ? ` ${def.unit}` : ''}</span>
      </div>

      <div>
        {def.type === 'boolean' ? (
          <select value={isOverridden ? String(value) : String(def.default)} onChange={e => commit(e.target.value)} style={{ ...iSt(), padding: '4px 8px', fontSize: 12 }}>
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        ) : def.type === 'select' ? (
          <select value={isOverridden ? String(value) : String(def.default)} onChange={e => commit(e.target.value)} style={{ ...iSt(), padding: '4px 8px', fontSize: 12 }}>
            {def.options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input type="number" value={localVal} onChange={e => setLocalVal(e.target.value)} onBlur={e => commit(e.target.value)} style={{ ...iSt(), padding: '4px 8px', fontSize: 12, textAlign: 'right' }} step={def.step || 0.1} />
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {isOverridden ? (
          <button onClick={onClear} title="Reset to default" style={{ background: COLORS.red + '18', border: `1px solid ${COLORS.red}33`, color: COLORS.red, borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit' }}>Reset</button>
        ) : (
          <span style={{ fontSize: 11, color: COLORS.green, fontWeight: 600 }}>Default</span>
        )}
      </div>
    </div>
  )
}

// ─── Custom override row ──────────────────────────────────────────────────────
function CustomOverrideModal({ onSave, onClose }) {
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const [note, setNote] = useState('')
  return (
    <Modal onClose={onClose} width={480}>
      <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.text, marginBottom: 20 }}>Add Custom Override</div>
      <div style={{ display: 'grid', gap: 14 }}>
        <div><label style={lSt()}>Key</label><input value={key} onChange={e => setKey(e.target.value.replace(/\s/g,'_').toLowerCase())} placeholder="e.g. custom_markup_factor" style={iSt()} /></div>
        <div><label style={lSt()}>Value</label><input value={value} onChange={e => setValue(e.target.value)} placeholder="e.g. 1.05" style={iSt()} /></div>
        <div><label style={lSt()}>Note (optional)</label><input value={note} onChange={e => setNote(e.target.value)} placeholder="Describe what this override does" style={iSt()} /></div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn onClick={() => { if (key && value) { onSave({ key, value, note }); onClose() } }}>Save</Btn>
      </div>
    </Modal>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EngineOverridesPage({ overrides, setOverrides, toast }) {
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [expandedSections, setExpandedSections] = useState(() => {
    const s = {}; ENGINE_RULE_DEFINITIONS.forEach(sec => { s[sec.section] = true }); return s
  })

  const activeCount = Object.keys(overrides).filter(k => k !== '__custom__').length
  const customOverrides = overrides.__custom__ || {}
  const customCount = Object.keys(customOverrides).length

  const toggleSection = (section) => setExpandedSections(p => ({ ...p, [section]: !p[section] }))

  const setOverride = useCallback(async (key, value) => {
    const updated = { ...overrides, [key]: value }
    setOverrides(updated)
    if (hasSupabase) {
      await dbUpsertEngineOverride({ override_key: key, override_value: JSON.stringify(value) })
    }
    toast(`Rule "${key}" updated`)
  }, [overrides, setOverrides, toast])

  const clearOverride = useCallback(async (key) => {
    const updated = { ...overrides }
    delete updated[key]
    setOverrides(updated)
    if (hasSupabase) {
      await dbDeleteEngineOverride(key)
    }
    toast(`Rule "${key}" reset to default`)
  }, [overrides, setOverrides, toast])

  const saveCustomOverride = useCallback(async ({ key, value, note }) => {
    const newCustom = { ...(overrides.__custom__ || {}), [key]: { value, note } }
    const updated = { ...overrides, __custom__: newCustom }
    setOverrides(updated)
    if (hasSupabase) {
      await dbUpsertEngineOverride({ override_key: '__custom__', override_value: JSON.stringify(newCustom) })
    }
    toast(`Custom override "${key}" saved`)
  }, [overrides, setOverrides, toast])

  const deleteCustomOverride = useCallback(async (key) => {
    const newCustom = { ...(overrides.__custom__ || {}) }
    delete newCustom[key]
    const updated = { ...overrides, __custom__: newCustom }
    setOverrides(updated)
    if (hasSupabase) {
      await dbUpsertEngineOverride({ override_key: '__custom__', override_value: JSON.stringify(newCustom) })
    }
    toast(`Custom override "${key}" removed`)
  }, [overrides, setOverrides, toast])

  const resetAll = async () => {
    setOverrides({})
    if (hasSupabase) {
      // Delete all engine override keys from DB
      const allKeys = [...ENGINE_RULE_DEFINITIONS.flatMap(s => s.rules.map(r => r.key)), '__custom__']
      await Promise.all(allKeys.map(k => dbDeleteEngineOverride(k)))
    }
    toast('All engine overrides reset to defaults')
  }

  return (
    <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: COLORS.text, letterSpacing: '-0.02em', marginBottom: 4 }}>Engine Rules</h2>
          <p style={{ fontSize: 13, color: COLORS.textMuted }}>
            Override costing engine defaults. Changes apply to all future calculations.
            {activeCount > 0 && <span style={{ color: COLORS.amber, fontWeight: 600 }}> · {activeCount + customCount} active override{activeCount + customCount !== 1 ? 's' : ''}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(activeCount > 0 || customCount > 0) && (
            <Btn variant="danger" size="sm" onClick={resetAll}><Icon name="refresh" size={14} /> Reset All</Btn>
          )}
          <Btn size="sm" onClick={() => setShowCustomModal(true)}><Icon name="plus" size={14} /> Custom Override</Btn>
        </div>
      </div>

      {/* Info banner */}
      {!hasSupabase && (
        <div style={{ padding: '10px 14px', background: COLORS.amber + '18', border: `1px solid ${COLORS.amber}33`, borderRadius: 10, marginBottom: 20, fontSize: 12, color: COLORS.amber, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="info" size={14} color={COLORS.amber} />
          No database connected — overrides are session-only and will reset on refresh. Connect Supabase to persist them.
        </div>
      )}

      {/* Section cards */}
      {ENGINE_RULE_DEFINITIONS.map(section => {
        const isOpen = expandedSections[section.section]
        const sectionOverrides = section.rules.filter(r => overrides[r.key] !== undefined).length
        if (section.section === 'Custom Overrides') return null // rendered separately below
        return (
          <Card key={section.section} style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
            <div
              onClick={() => toggleSection(section.section)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer', background: isOpen ? COLORS.surface : COLORS.bg }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{section.section}</span>
                {sectionOverrides > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, background: COLORS.accent + '22', color: COLORS.accent, padding: '2px 8px', borderRadius: 10 }}>{sectionOverrides} override{sectionOverrides !== 1 ? 's' : ''}</span>
                )}
              </div>
              <Icon name={isOpen ? 'arrowUp' : 'arrowDown'} size={14} color={COLORS.textMuted} />
            </div>

            {isOpen && (
              <>
                {/* Column headers */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 80px', gap: 12, padding: '8px 16px', background: COLORS.bg, borderTop: `1px solid ${COLORS.border}`, borderBottom: `1px solid ${COLORS.border}` }}>
                  {['Rule', 'Default', 'Override Value', 'Status'].map((h, i) => (
                    <div key={h} style={{ fontSize: 10, fontWeight: 700, color: COLORS.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: i >= 2 ? 'center' : 'left' }}>{h}</div>
                  ))}
                </div>
                {section.rules.map(def => (
                  <RuleRow
                    key={def.key}
                    def={def}
                    value={overrides[def.key]}
                    isOverridden={overrides[def.key] !== undefined}
                    onSet={(v) => setOverride(def.key, v)}
                    onClear={() => clearOverride(def.key)}
                  />
                ))}
              </>
            )}
          </Card>
        )
      })}

      {/* Custom overrides section */}
      <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
        <div onClick={() => toggleSection('Custom Overrides')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>Custom Overrides</span>
            {customCount > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: COLORS.purple + '22', color: COLORS.purple, padding: '2px 8px', borderRadius: 10 }}>{customCount}</span>}
          </div>
          <Icon name={expandedSections['Custom Overrides'] ? 'arrowUp' : 'arrowDown'} size={14} color={COLORS.textMuted} />
        </div>

        {expandedSections['Custom Overrides'] && (
          <>
            {customCount === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: COLORS.textMuted, fontSize: 13, borderTop: `1px solid ${COLORS.border}` }}>
                No custom overrides yet. Use "Custom Override" to add arbitrary key/value pairs accessible in the engine.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, borderTop: `1px solid ${COLORS.border}` }}>
                <thead>
                  <tr style={{ background: COLORS.bg, borderBottom: `1px solid ${COLORS.border}` }}>
                    {['Key', 'Value', 'Note', ''].map((h, i) => (
                      <th key={i} style={{ padding: '8px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: COLORS.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(customOverrides).map(([k, v]) => (
                    <tr key={k} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                      <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 12, color: COLORS.accent }}>{k}</td>
                      <td style={{ padding: '10px 16px', fontWeight: 600, color: COLORS.text }}>{v.value}</td>
                      <td style={{ padding: '10px 16px', color: COLORS.textDim, fontSize: 12 }}>{v.note || '—'}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <button onClick={() => deleteCustomOverride(k)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: COLORS.textMuted }}>
                          <Icon name="trash" size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </Card>

      {/* How-to note */}
      <Card style={{ background: COLORS.accent + '08', border: `1px solid ${COLORS.accent}22` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.accent, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="info" size={14} color={COLORS.accent} /> How overrides work
        </div>
        <div style={{ fontSize: 12, color: COLORS.textDim, lineHeight: 1.7 }}>
          Overrides stored here are loaded into the costing engine at runtime. Standard rules (hinges per door, sheet wastage, etc.) directly affect all COGS calculations.
          Custom key/value pairs are available for reference but require engine.js to be updated to consume them.
          {hasSupabase ? ' Overrides are persisted to the database and shared across all users.' : ' Connect Supabase to make overrides persistent and shared.'}
        </div>
      </Card>

      {showCustomModal && <CustomOverrideModal onSave={saveCustomOverride} onClose={() => setShowCustomModal(false)} />}
    </div>
  )
}
