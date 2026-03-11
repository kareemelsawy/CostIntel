import { useState } from 'react'
import { COLORS, CATEGORIES } from '../lib/constants'
import { Icon, Btn, Card } from '../components/UI'

const iSt = () => ({ width:'100%', background:COLORS.inputBg, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:'8px 10px', color:COLORS.text, fontSize:13, outline:'none', fontFamily:'inherit' })
const lSt = () => ({ fontSize:11, fontWeight:700, color:COLORS.textMuted, letterSpacing:'0.06em', textTransform:'uppercase', display:'block', marginBottom:5 })
const monoSt = () => ({ ...iSt(), fontFamily:'DM Mono, monospace', fontSize:12 })
const badgeSt = (c) => ({ display:'inline-block', padding:'2px 8px', borderRadius:4, fontSize:11, fontWeight:600, background:c+'18', color:c })

const SLOT_COLORS = { body: COLORS.accent, door: COLORS.purple, back: COLORS.teal }
const SLOT_LABELS = { body:'Body', door:'Door', back:'Back' }

function InfoBox({ children }) {
  return (
    <div style={{ background:COLORS.amber+'12', border:`1px solid ${COLORS.amber}30`, borderRadius:8, padding:'10px 14px', fontSize:12, color:COLORS.amber, lineHeight:1.6, marginBottom:16 }}>
      {children}
    </div>
  )
}

function SectionHeader({ title, desc, actions }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16, gap:12 }}>
      <div>
        <div style={{ fontSize:16, fontWeight:700, color:COLORS.text, marginBottom:3 }}>{title}</div>
        {desc && <div style={{ fontSize:13, color:COLORS.textMuted }}>{desc}</div>}
      </div>
      {actions && <div style={{ display:'flex', gap:8, flexShrink:0 }}>{actions}</div>}
    </div>
  )
}

// ── Panel Rule Row ──────────────────────────────────────────────────────────
function PanelRuleRow({ rule, materials, onChange, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div style={{ border:`1px solid ${COLORS.border}`, borderRadius:10, marginBottom:8, overflow:'hidden' }}>
      {/* Header row */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:COLORS.surface, cursor:'pointer' }} onClick={() => setExpanded(e=>!e)}>
        <input type="checkbox" checked={rule.enabled} onChange={e=>{e.stopPropagation();onChange({...rule,enabled:e.target.checked})}}
          style={{ width:16, height:16, cursor:'pointer', accentColor:COLORS.accent }} onClick={e=>e.stopPropagation()}/>
        <span style={{ flex:1, fontWeight:600, fontSize:13, color:rule.enabled?COLORS.text:COLORS.textMuted }}>{rule.label}</span>
        <span style={badgeSt(SLOT_COLORS[rule.material_slot]||COLORS.textMuted)}>{SLOT_LABELS[rule.material_slot]||rule.material_slot}</span>
        <code style={{ fontSize:11, color:COLORS.textDim, fontFamily:'monospace', background:COLORS.bg, padding:'2px 6px', borderRadius:4 }}>qty: {rule.qty}</code>
        <Icon name={expanded?'arrowUp':'arrowDown'} size={14} color={COLORS.textMuted}/>
      </div>
      {/* Expanded editor */}
      {expanded && (
        <div style={{ padding:'14px', borderTop:`1px solid ${COLORS.border}`, background:COLORS.bg }}>
          {rule.note && <InfoBox>📌 {rule.note}</InfoBox>}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
            <div>
              <label style={lSt()}>Panel Label</label>
              <input value={rule.label} onChange={e=>onChange({...rule,label:e.target.value})} style={iSt()}/>
            </div>
            <div>
              <label style={lSt()}>Quantity Formula</label>
              <input value={rule.qty} onChange={e=>onChange({...rule,qty:e.target.value})} style={monoSt()} placeholder="e.g. 2 or SHELVES or max(0,SPACES-1)"/>
            </div>
            <div>
              <label style={lSt()}>Area Formula (cm²)</label>
              <input value={rule.area} onChange={e=>onChange({...rule,area:e.target.value})} style={monoSt()} placeholder="e.g. W*D or H*D"/>
            </div>
            <div>
              <label style={lSt()}>Material Slot</label>
              <select value={rule.material_slot} onChange={e=>onChange({...rule,material_slot:e.target.value})} style={iSt()}>
                <option value="body">Body</option>
                <option value="door">Door</option>
                <option value="back">Back</option>
              </select>
            </div>
            <div>
              <label style={lSt()}>Edge Formula (cm)</label>
              <input value={rule.edge_formula} onChange={e=>onChange({...rule,edge_formula:e.target.value})} style={monoSt()} placeholder="e.g. qty*W or 0"/>
            </div>
            <div>
              <label style={lSt()}>Condition (optional)</label>
              <input value={rule.condition||''} onChange={e=>onChange({...rule,condition:e.target.value})} style={monoSt()} placeholder='e.g. DOORS>0 && DOOR_TYPE!="Open"'/>
            </div>
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={lSt()}>Documentation / Notes</label>
            <textarea value={rule.note||''} onChange={e=>onChange({...rule,note:e.target.value})} style={{...iSt(),height:56,resize:'vertical'}}/>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <Btn variant="ghost" size="sm" onClick={onDelete} style={{ color:COLORS.red }}>
              <Icon name="trash" size={13}/> Delete Rule
            </Btn>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Accessory Rule Row ──────────────────────────────────────────────────────
function AccRuleRow({ rule, accessories, onChange, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const accOptions = accessories.map(a => ({ value:a.acc_id, label:`${a.name} (${a.acc_id})` }))
  return (
    <div style={{ border:`1px solid ${COLORS.border}`, borderRadius:10, marginBottom:8, overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:COLORS.surface, cursor:'pointer' }} onClick={() => setExpanded(e=>!e)}>
        <input type="checkbox" checked={rule.enabled} onChange={e=>{e.stopPropagation();onChange({...rule,enabled:e.target.checked})}}
          style={{ width:16, height:16, cursor:'pointer', accentColor:COLORS.accent }} onClick={e=>e.stopPropagation()}/>
        <span style={{ flex:1, fontWeight:600, fontSize:13, color:rule.enabled?COLORS.text:COLORS.textMuted }}>{rule.label}</span>
        <code style={{ fontSize:11, color:COLORS.purple, fontFamily:'monospace', background:COLORS.bg, padding:'2px 6px', borderRadius:4 }}>{rule.acc_id}</code>
        <code style={{ fontSize:11, color:COLORS.textDim, fontFamily:'monospace', background:COLORS.bg, padding:'2px 6px', borderRadius:4 }}>qty: {rule.qty}</code>
        <Icon name={expanded?'arrowUp':'arrowDown'} size={14} color={COLORS.textMuted}/>
      </div>
      {expanded && (
        <div style={{ padding:'14px', borderTop:`1px solid ${COLORS.border}`, background:COLORS.bg }}>
          {rule.note && <InfoBox>📌 {rule.note}</InfoBox>}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
            <div>
              <label style={lSt()}>Rule Label</label>
              <input value={rule.label} onChange={e=>onChange({...rule,label:e.target.value})} style={iSt()}/>
            </div>
            <div>
              <label style={lSt()}>Accessory</label>
              <select value={rule.acc_id} onChange={e=>onChange({...rule,acc_id:e.target.value})} style={iSt()}>
                <option value="auto_by_depth">auto_by_depth (drawer slides)</option>
                <option value="area_based">area_based (mirror m²)</option>
                <option value="total_perimeter_m">total_perimeter_m (edge banding)</option>
                {accOptions.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label style={lSt()}>Quantity Formula</label>
              <input value={rule.qty} onChange={e=>onChange({...rule,qty:e.target.value})} style={monoSt()} placeholder="e.g. DOORS*3 or SHELVES*4"/>
            </div>
            <div>
              <label style={lSt()}>Condition</label>
              <input value={rule.condition||''} onChange={e=>onChange({...rule,condition:e.target.value})} style={monoSt()} placeholder='e.g. DOORS>0 && DOOR_TYPE=="Hinged"'/>
            </div>
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={lSt()}>Documentation / Notes</label>
            <textarea value={rule.note||''} onChange={e=>onChange({...rule,note:e.target.value})} style={{...iSt(),height:56,resize:'vertical'}}/>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <Btn variant="ghost" size="sm" onClick={onDelete} style={{ color:COLORS.red }}>
              <Icon name="trash" size={13}/> Delete Rule
            </Btn>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Category Defaults Table ─────────────────────────────────────────────────
function CategoryDefaultsTable({ categoryDefaults, materials, onChange }) {
  const matOptions = materials.map(m => ({ value:m.material_id, label:`${m.name} (${m.material_id})` }))
  const selSt = { ...iSt(), fontSize:12, padding:'5px 8px' }
  return (
    <Card style={{ padding:0, overflow:'hidden' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead>
          <tr style={{ borderBottom:`1px solid ${COLORS.border}` }}>
            {['Category','Body Material','Back Material','Door Material'].map((h,i)=>(
              <th key={i} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:COLORS.textMuted, letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CATEGORIES.map(cat => {
            const def = categoryDefaults[cat] || { body:'MDF_17_F2', back:'MDF_3.2_F1', door:'MDF_17_F2' }
            return (
              <tr key={cat} style={{ borderBottom:`1px solid ${COLORS.border}` }}>
                <td style={{ padding:'8px 14px', fontWeight:600, color:COLORS.text }}>{cat}</td>
                {['body','back','door'].map(slot => (
                  <td key={slot} style={{ padding:'4px 8px' }}>
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

// ── Main Page ───────────────────────────────────────────────────────────────
export default function EnginePage({ engineRules, setEngineRules, materials, accessories, toast }) {
  const [tab, setTab] = useState('panels')

  const tabSt = (t) => ({
    padding:'8px 18px', fontSize:13, fontWeight:600, cursor:'pointer',
    borderRadius:'8px 8px 0 0', background:tab===t?COLORS.surface:'transparent',
    color:tab===t?COLORS.text:COLORS.textMuted, border:'none',
    borderBottom:tab===t?`2px solid ${COLORS.accent}`:`2px solid transparent`,
    fontFamily:'inherit'
  })

  function updatePanelRule(id, updated) {
    setEngineRules(r => ({ ...r, panelRules: r.panelRules.map(p => p.id===id ? updated : p) }))
  }
  function deletePanelRule(id) {
    setEngineRules(r => ({ ...r, panelRules: r.panelRules.filter(p => p.id!==id) }))
  }
  function addPanelRule() {
    const newRule = { id:'panel_'+Date.now(), label:'New Panel', qty:'1', area:'W*D', material_slot:'body', edge_formula:'W', enabled:true, note:'' }
    setEngineRules(r => ({ ...r, panelRules: [...r.panelRules, newRule] }))
  }

  function updateAccRule(id, updated) {
    setEngineRules(r => ({ ...r, accessoryRules: r.accessoryRules.map(a => a.id===id ? updated : a) }))
  }
  function deleteAccRule(id) {
    setEngineRules(r => ({ ...r, accessoryRules: r.accessoryRules.filter(a => a.id!==id) }))
  }
  function addAccRule() {
    const newRule = { id:'acc_'+Date.now(), label:'New Accessory', acc_id:'', qty:'1', condition:'', enabled:true, note:'' }
    setEngineRules(r => ({ ...r, accessoryRules: [...r.accessoryRules, newRule] }))
  }

  function updateCategoryDefault(cat, slot, val) {
    setEngineRules(r => ({
      ...r,
      categoryDefaults: { ...r.categoryDefaults, [cat]: { ...(r.categoryDefaults[cat]||{}), [slot]:val } }
    }))
  }

  const enabledPanels = engineRules.panelRules?.filter(r=>r.enabled).length || 0
  const enabledAcc = engineRules.accessoryRules?.filter(r=>r.enabled).length || 0

  return (
    <div style={{ padding:'24px 28px', overflowY:'auto', flex:1 }}>
      {/* Page header */}
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontSize:20, fontWeight:800, color:COLORS.text, letterSpacing:'-0.02em', marginBottom:4 }}>Costing Engine</h2>
        <p style={{ fontSize:13, color:COLORS.textMuted }}>
          Define exactly how panels and accessories are calculated for every SKU. Changes apply to all future cost calculations.
        </p>
      </div>

      {/* Variable reference card */}
      <Card style={{ marginBottom:20 }}>
        <div style={{ fontSize:13, fontWeight:700, color:COLORS.text, marginBottom:12 }}>📐 Formula Variables Reference</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:8 }}>
          {[
            ['W','Width (cm)'],['D','Depth (cm)'],['H','Height (cm)'],
            ['DOORS','No. of Doors'],['DRAWERS','No. of Drawers'],['SHELVES','No. of Shelves'],
            ['SPACES','No. of Spaces'],['DOOR_TYPE','"Hinged" | "Sliding" | "Open"'],
            ['HANDLE_TYPE','"Normal" | "Handleless"'],['HAS_MIRROR','true | false'],
            ['qty','Resolved quantity of this rule (use in edge formula)'],
          ].map(([v,d])=>(
            <div key={v} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
              <code style={{ fontFamily:'DM Mono,monospace', fontSize:11, color:COLORS.accent, background:COLORS.bg, padding:'2px 7px', borderRadius:4, flexShrink:0 }}>{v}</code>
              <span style={{ fontSize:12, color:COLORS.textMuted }}>{d}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop:12, fontSize:12, color:COLORS.textMuted, borderTop:`1px solid ${COLORS.border}`, paddingTop:10 }}>
          <strong style={{ color:COLORS.textDim }}>Supported expressions:</strong> arithmetic (+−×÷), comparison (&gt; &lt; == !=), logical (&amp;&amp; ||), and <code style={{ fontFamily:'monospace' }}>max(a,b)</code>. 
          Sheet cost = <code style={{ fontFamily:'monospace' }}>ceil(total_area / sheet_area) × price_per_sheet</code>.
          Edge banding cost = <code style={{ fontFamily:'monospace' }}>sum(edge_formulas) ÷ 100 × EDGE_STD price/m</code>.
        </div>
      </Card>

      {/* Stats */}
      <div style={{ display:'flex', gap:12, marginBottom:20 }}>
        {[
          { label:'Panel Rules', value:enabledPanels+' active', total:engineRules.panelRules?.length, color:COLORS.accent },
          { label:'Accessory Rules', value:enabledAcc+' active', total:engineRules.accessoryRules?.length, color:COLORS.purple },
          { label:'Category Defaults', value:Object.keys(engineRules.categoryDefaults||{}).length+' categories', color:COLORS.teal },
        ].map(s=>(
          <div key={s.label} style={{ flex:1, background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:'12px 16px' }}>
            <div style={{ fontSize:11, fontWeight:700, color:COLORS.textMuted, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:4 }}>{s.label}</div>
            <div style={{ fontSize:18, fontWeight:800, color:s.color }}>{s.value}</div>
            {s.total && <div style={{ fontSize:11, color:COLORS.textMuted }}>{s.total} total rules</div>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:0, borderBottom:`1px solid ${COLORS.border}`, marginBottom:20 }}>
        <button onClick={()=>setTab('panels')} style={tabSt('panels')}>Panel Rules ({engineRules.panelRules?.length||0})</button>
        <button onClick={()=>setTab('accessories')} style={tabSt('accessories')}>Accessory Rules ({engineRules.accessoryRules?.length||0})</button>
        <button onClick={()=>setTab('categories')} style={tabSt('categories')}>Category Defaults</button>
      </div>

      {/* Panel Rules Tab */}
      {tab==='panels' && (
        <div>
          <SectionHeader
            title="Panel Rules"
            desc="Each rule generates a set of panels for a SKU. Panels are grouped by material, converted to sheet counts, and costed."
            actions={<Btn size="sm" onClick={addPanelRule}><Icon name="plus" size={14}/> Add Rule</Btn>}
          />
          <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:'10px', marginBottom:12 }}>
            <div style={{ fontSize:12, color:COLORS.textMuted, lineHeight:1.7 }}>
              <strong style={{ color:COLORS.textDim }}>How panels are costed:</strong>
              {' '}For each enabled rule, the engine evaluates <code style={{fontFamily:'monospace'}}>qty × area</code> to get total cm², 
              then groups by material slot (body/door/back). Each group is converted to sheets via{' '}
              <code style={{fontFamily:'monospace'}}>ceil(total_area / sheet_area)</code>, 
              then multiplied by the material's price per sheet. Toggle rules off to exclude them without deleting.
            </div>
          </div>
          {(engineRules.panelRules||[]).map(rule => (
            <PanelRuleRow key={rule.id} rule={rule} materials={materials}
              onChange={updated => updatePanelRule(rule.id, updated)}
              onDelete={() => deletePanelRule(rule.id)}
            />
          ))}
        </div>
      )}

      {/* Accessory Rules Tab */}
      {tab==='accessories' && (
        <div>
          <SectionHeader
            title="Accessory Rules"
            desc="Each rule auto-includes an accessory when its condition is met. Quantities are resolved per SKU at calculation time."
            actions={<Btn size="sm" onClick={addAccRule}><Icon name="plus" size={14}/> Add Rule</Btn>}
          />
          <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:'10px', marginBottom:12 }}>
            <div style={{ fontSize:12, color:COLORS.textMuted, lineHeight:1.7 }}>
              <strong style={{ color:COLORS.textDim }}>Special acc_id values:</strong>
              {' '}<code style={{fontFamily:'monospace'}}>auto_by_depth</code> — picks the correct drawer slide length based on SKU depth.
              {' '}<code style={{fontFamily:'monospace'}}>area_based</code> — calculates mirror area in m² from H×(W/DOORS)×mirror_count.
              {' '}<code style={{fontFamily:'monospace'}}>total_perimeter_m</code> — sums all enabled panel edge formulas and converts cm→m.
              All other acc_ids map directly to an accessory in Pricing Config.
            </div>
          </div>
          {(engineRules.accessoryRules||[]).map(rule => (
            <AccRuleRow key={rule.id} rule={rule} accessories={accessories}
              onChange={updated => updateAccRule(rule.id, updated)}
              onDelete={() => deleteAccRule(rule.id)}
            />
          ))}
        </div>
      )}

      {/* Category Defaults Tab */}
      {tab==='categories' && (
        <div>
          <SectionHeader
            title="Category Material Defaults"
            desc="When a SKU is imported via CSV, these defaults are auto-assigned by Sub Category. You can always override per SKU in the catalog."
          />
          <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:'10px', marginBottom:16 }}>
            <div style={{ fontSize:12, color:COLORS.textMuted, lineHeight:1.7 }}>
              <strong style={{ color:COLORS.textDim }}>Body</strong> — main structural material (sides, top, bottom, shelves, partitions).{' '}
              <strong style={{ color:COLORS.textDim }}>Back</strong> — back panel material (typically thin MDF or plywood).{' '}
              <strong style={{ color:COLORS.textDim }}>Door</strong> — door panel material (can match body or differ for glass/veneer finishes).
            </div>
          </div>
          <CategoryDefaultsTable
            categoryDefaults={engineRules.categoryDefaults||{}}
            materials={materials}
            onChange={updateCategoryDefault}
          />
        </div>
      )}
    </div>
  )
}
