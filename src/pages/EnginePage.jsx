import { useState } from 'react'
import { COLORS, CATEGORIES } from '../lib/constants'
import { Icon, Btn, Card } from '../components/UI'

const SLOT_META = {
  body: { color: '#4F8EF7', label: 'Body' },
  door: { color: '#A78BFA', label: 'Door' },
  back: { color: '#14B8A6', label: 'Back' },
}

const tab_ids = ['constants', 'categories', 'panels', 'accessories']
const tab_labels = { constants: 'Engine Rules', categories: 'Material Defaults', panels: 'Panel Logic', accessories: 'Accessory Logic' }

// ── Readonly reference data ───────────────────────────────────────────────────
const PANEL_REF = [
  { name:'Side Panels',   qty:'2',             material:'Body', area:'H × D',               edge:'2 × H' },
  { name:'Top Panel',     qty:'1',             material:'Body', area:'W × D',               edge:'W' },
  { name:'Bottom Panel',  qty:'1',             material:'Body', area:'W × D',               edge:'W' },
  { name:'Partitions',    qty:'Spaces − 1',    material:'Body', area:'H × D',               edge:'Qty × H' },
  { name:'Shelves',       qty:'# Shelves',      material:'Body', area:'W × D',               edge:'Qty × W' },
  { name:'Drawer Fronts', qty:'# Drawers',      material:'Door', area:'(W ÷ Spaces) × 20cm', edge:'All 4 edges' },
  { name:'Door Panels',   qty:'# Doors',        material:'Door', area:'H × (W ÷ Doors)',     edge:'Full perimeter' },
  { name:'Back Panel',    qty:'1 if closed',    material:'Back', area:'W × H',               edge:'None' },
]
const ACC_REF = [
  { name:'Hinges',        qty:'Doors × 2/3/4',      when:'Hinged doors',      note:'2 hinges ≤ H1, 3 hinges ≤ H2, 4 above' },
  { name:'Sliding Track', qty:'1 per door',          when:'Sliding doors',     note:'One latch rail per door leaf' },
  { name:'Drawer Slides', qty:'1 pair per drawer',   when:'Any drawer',        note:'Depth = cabinet depth − clearance' },
  { name:'Handles',       qty:'1 per door + drawer', when:'Not handleless',    note:'128mm for hinged/open; 20cm for sliding' },
  { name:'Shelf Pins',    qty:'Pins × shelves',      when:'Any shelf',         note:'N pins per shelf (2 per side)' },
  { name:'Hanger Rod',    qty:'1 per hanger space',  when:'Hangers > 0',       note:'One rod per hanging compartment' },
  { name:'Mirror',        qty:'Area in m²',           when:'Has mirror',        note:'Height × (W ÷ doors) × count, capped at door count' },
  { name:'Edge Banding',  qty:'Total m (all edges)',  when:'Always',            note:'Sum of all edge formulas ÷ 100' },
]

function NumInput({ value, onChange, unit, min = 0, step = 1 }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <input
        type="number" value={value} min={min} step={step}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          width:80, padding:'6px 10px', borderRadius:7, border:`1px solid ${COLORS.border}`,
          background:COLORS.inputBg, color:COLORS.text, fontSize:14, fontWeight:700,
          fontFamily:'inherit', outline:'none', textAlign:'right',
        }}
      />
      <span style={{ fontSize:12, color:COLORS.textMuted, minWidth:28 }}>{unit}</span>
    </div>
  )
}

function ConstantRow({ id, def, value, onChange }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:16, padding:'13px 18px', borderBottom:`1px solid ${COLORS.border}` }}>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:600, color:COLORS.text }}>{def.label}</div>
        <div style={{ fontSize:11, color:COLORS.textMuted, marginTop:2, lineHeight:1.5 }}>{def.note}</div>
      </div>
      <NumInput
        value={value}
        step={def.unit === '%' ? 0.01 : 1}
        min={0}
        unit={def.unit === '%' ? '%' : def.unit}
        onChange={v => onChange(id, def.unit === '%' ? v : v)}
      />
    </div>
  )
}

function CategoryDefaultsTable({ categoryDefaults, materials, onChange }) {
  const matOptions = materials.map(m => ({ value: m.material_id, label: m.name }))
  const selSt = {
    background:COLORS.inputBg, border:`1px solid ${COLORS.border}`, borderRadius:6,
    padding:'5px 8px', color:COLORS.text, fontSize:12, outline:'none',
    fontFamily:'inherit', cursor:'pointer', width:'100%',
  }
  return (
    <Card style={{ padding:0, overflow:'hidden' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead>
          <tr style={{ background:COLORS.surface, borderBottom:`1px solid ${COLORS.border}` }}>
            <th style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:COLORS.textMuted, textTransform:'uppercase', letterSpacing:'0.05em' }}>Category</th>
            {['body','back','door'].map(s => (
              <th key={s} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:SLOT_META[s].color }}>
                {SLOT_META[s].label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CATEGORIES.map((cat, i) => {
            const def = categoryDefaults[cat] || { body:'MDF_17_F2', back:'MDF_3.2_F1', door:'MDF_17_F2' }
            return (
              <tr key={cat} style={{ borderBottom:`1px solid ${COLORS.border}`, background:i%2===0?'transparent':COLORS.surface+'60' }}>
                <td style={{ padding:'8px 16px', fontWeight:600, color:COLORS.text, whiteSpace:'nowrap', fontSize:12 }}>{cat}</td>
                {['body','back','door'].map(slot => (
                  <td key={slot} style={{ padding:'5px 8px' }}>
                    <select value={def[slot]||''} onChange={e=>onChange(cat,slot,e.target.value)} style={selSt}>
                      {matOptions.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </Card>
  )
}

export default function EnginePage({ engineRules, setEngineRules, materials, toast }) {
  const [tab, setTab] = useState('constants')

  const tabSt = (t) => ({
    padding:'8px 16px', fontSize:13, fontWeight:600, cursor:'pointer', background:'none',
    border:'none', fontFamily:'inherit', borderBottom:tab===t?`2px solid ${COLORS.accent}`:`2px solid transparent`,
    color:tab===t?COLORS.text:COLORS.textMuted, transition:'color 0.15s',
  })

  const constants = engineRules?.constants || {}

  function updateConstant(id, val) {
    setEngineRules(r => ({
      ...r,
      constants: { ...r.constants, [id]: { ...r.constants[id], value: val } }
    }))
    toast('Rule updated')
  }

  function updateCategoryDefault(cat, slot, val) {
    setEngineRules(r => ({
      ...r,
      categoryDefaults: { ...r.categoryDefaults, [cat]: { ...(r.categoryDefaults[cat]||{}), [slot]: val } }
    }))
  }

  function resetConstants() {
    import('../lib/defaults.js').then(({ DEFAULT_ENGINE_RULES }) => {
      setEngineRules(r => ({ ...r, constants: DEFAULT_ENGINE_RULES.constants }))
      toast('Reset to defaults')
    })
  }

  const matCell = (mat) => (
    <span style={{ fontSize:11, fontWeight:700, padding:'2px 7px', borderRadius:5,
      background: SLOT_META[mat?.toLowerCase()]?.color+'20' || COLORS.accent+'20',
      color: SLOT_META[mat?.toLowerCase()]?.color || COLORS.accent }}>
      {mat}
    </span>
  )

  return (
    <div style={{ padding:'24px 28px', overflowY:'auto', flex:1 }}>
      <div style={{ marginBottom:20 }}>
        <h2 style={{ fontSize:20, fontWeight:800, color:COLORS.text, letterSpacing:'-0.02em', marginBottom:4 }}>Costing Engine</h2>
        <p style={{ fontSize:13, color:COLORS.textMuted }}>Configure the rules and constants used to calculate every SKU cost.</p>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:`1px solid ${COLORS.border}`, marginBottom:24, gap:4 }}>
        {tab_ids.map(t => <button key={t} onClick={()=>setTab(t)} style={tabSt(t)}>{tab_labels[t]}</button>)}
      </div>

      {/* ENGINE CONSTANTS */}
      {tab === 'constants' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:COLORS.text }}>Engine Constants</div>
              <div style={{ fontSize:12, color:COLORS.textMuted, marginTop:2 }}>These values control how panels and accessories are calculated. Changes apply immediately to all SKU costs.</div>
            </div>
            <Btn variant="secondary" size="sm" onClick={resetConstants}>Reset to defaults</Btn>
          </div>
          <Card style={{ padding:0, overflow:'hidden' }}>
            {Object.entries(constants).map(([id, def]) => (
              <ConstantRow
                key={id}
                id={id}
                def={def}
                value={def.unit === '%' ? (def.value * 100).toFixed(0)*1 : def.value}
                onChange={(id, v) => updateConstant(id, def.unit === '%' ? v / 100 : v)}
              />
            ))}
          </Card>
          <div style={{ marginTop:12, padding:'10px 14px', background:COLORS.amber+'10', border:`1px solid ${COLORS.amber}30`, borderRadius:8, fontSize:12, color:COLORS.textDim, lineHeight:1.7 }}>
            <strong style={{color:COLORS.amber}}>Note:</strong> Commercial rates (VAT, overhead %, seller markup, Homzmart commission) are configured separately in <strong>Pricing Config</strong>.
          </div>
        </div>
      )}

      {/* CATEGORY DEFAULTS */}
      {tab === 'categories' && (
        <div>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:14, fontWeight:700, color:COLORS.text }}>Material Defaults by Category</div>
            <div style={{ fontSize:12, color:COLORS.textMuted, marginTop:2 }}>Default materials auto-assigned when a SKU is imported. Can be overridden per SKU in the catalog.</div>
          </div>
          <div style={{ display:'flex', gap:8, marginBottom:14 }}>
            {['body','back','door'].map(s => (
              <div key={s} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px', background:COLORS.surface, border:`1px solid ${SLOT_META[s].color}30`, borderRadius:8 }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:SLOT_META[s].color }}/>
                <span style={{ fontSize:12, fontWeight:700, color:SLOT_META[s].color }}>{SLOT_META[s].label}</span>
              </div>
            ))}
          </div>
          <CategoryDefaultsTable categoryDefaults={engineRules?.categoryDefaults||{}} materials={materials} onChange={updateCategoryDefault}/>
        </div>
      )}

      {/* PANEL LOGIC — read only reference */}
      {tab === 'panels' && (
        <div>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:14, fontWeight:700, color:COLORS.text }}>Panel Logic Reference</div>
            <div style={{ fontSize:12, color:COLORS.textMuted, marginTop:2 }}>How each panel type is generated. Dimensions are in cm. Sheet size: 244 × 122 cm + cutting waste.</div>
          </div>
          <Card style={{ padding:0, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:COLORS.surface, borderBottom:`1px solid ${COLORS.border}` }}>
                  {['Panel', 'Qty', 'Area', 'Edge Banding', 'Material'].map(h => (
                    <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:COLORS.textMuted, textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PANEL_REF.map((p, i) => (
                  <tr key={i} style={{ borderBottom:`1px solid ${COLORS.border}`, background:i%2===0?'transparent':COLORS.surface+'50' }}>
                    <td style={{ padding:'10px 14px', fontWeight:600, color:COLORS.text }}>{p.name}</td>
                    <td style={{ padding:'10px 14px', color:COLORS.textDim }}>{p.qty}</td>
                    <td style={{ padding:'10px 14px', fontFamily:'monospace', fontSize:11, color:COLORS.amber }}>{p.area}</td>
                    <td style={{ padding:'10px 14px', fontFamily:'monospace', fontSize:11, color:COLORS.teal }}>{p.edge}</td>
                    <td style={{ padding:'10px 14px' }}>{matCell(p.material)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ACCESSORY LOGIC — read only reference */}
      {tab === 'accessories' && (
        <div>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:14, fontWeight:700, color:COLORS.text }}>Accessory Logic Reference</div>
            <div style={{ fontSize:12, color:COLORS.textMuted, marginTop:2 }}>Auto-included accessories and the conditions that trigger them. Hinge thresholds and pin counts come from Engine Rules above.</div>
          </div>
          <Card style={{ padding:0, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:COLORS.surface, borderBottom:`1px solid ${COLORS.border}` }}>
                  {['Accessory', 'Quantity', 'When Applied', 'Notes'].map(h => (
                    <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:COLORS.textMuted, textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ACC_REF.map((a, i) => (
                  <tr key={i} style={{ borderBottom:`1px solid ${COLORS.border}`, background:i%2===0?'transparent':COLORS.surface+'50' }}>
                    <td style={{ padding:'10px 14px', fontWeight:600, color:COLORS.text }}>{a.name}</td>
                    <td style={{ padding:'10px 14px', color:COLORS.textDim, fontFamily:'monospace', fontSize:11 }}>{a.qty}</td>
                    <td style={{ padding:'10px 14px' }}>
                      <span style={{ background:COLORS.accent+'18', color:COLORS.accent, fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:5 }}>{a.when}</span>
                    </td>
                    <td style={{ padding:'10px 14px', color:COLORS.textMuted, fontSize:11, lineHeight:1.5 }}>{a.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  )
}
