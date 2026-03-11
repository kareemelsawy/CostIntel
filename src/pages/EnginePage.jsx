import { useState } from 'react'
import { COLORS, CATEGORIES } from '../lib/constants'
import { Icon, Btn, Card } from '../components/UI'

const SLOT_META = {
  body: { color: '#4F8EF7', label: 'Body', desc: 'Main structure' },
  door: { color: '#A78BFA', label: 'Door', desc: 'Door panels' },
  back: { color: '#14B8A6', label: 'Back', desc: 'Back panel' },
}

const pill = (color, text) => (
  <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 9px', borderRadius:20, fontSize:11, fontWeight:700, background:color+'20', color, letterSpacing:'0.02em' }}>{text}</span>
)

function FormulaTag({ value, placeholder }) {
  if (!value) return <span style={{ color:COLORS.textMuted, fontSize:12, fontStyle:'italic' }}>{placeholder||'—'}</span>
  return (
    <code style={{ fontSize:11, fontFamily:'DM Mono,monospace', background:COLORS.bg, color:COLORS.amber, padding:'2px 7px', borderRadius:5, border:`1px solid ${COLORS.border}` }}>
      {value}
    </code>
  )
}

function FieldRow({ label, hint, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
      <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
        <label style={{ fontSize:11, fontWeight:700, color:COLORS.textMuted, letterSpacing:'0.07em', textTransform:'uppercase' }}>{label}</label>
        {hint && <span style={{ fontSize:11, color:COLORS.textMuted, fontStyle:'italic' }}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}

const inputSt = (mono) => ({
  width:'100%', background:COLORS.inputBg, border:`1px solid ${COLORS.border}`,
  borderRadius:7, padding:'8px 11px', color:COLORS.text, fontSize: mono ? 12 : 13,
  fontFamily: mono ? 'DM Mono,monospace' : 'inherit', outline:'none', lineHeight:1.5,
  boxSizing:'border-box',
})

const selectSt = () => ({
  ...inputSt(),
  cursor:'pointer', appearance:'none',
  backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat:'no-repeat', backgroundPosition:'right 10px center', paddingRight:30,
})

function VarsReference() {
  return (
    <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:'12px 16px', marginBottom:16 }}>
      <div style={{ fontSize:11, fontWeight:700, color:COLORS.textMuted, letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:8 }}>📐 Formula variables</div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
        {[
          ['W','Width cm'],['D','Depth cm'],['H','Height cm'],
          ['DOORS','# Doors'],['DRAWERS','# Drawers'],['SHELVES','# Shelves'],
          ['SPACES','# Spaces'],['qty','This rule qty (edge only)'],
          ['DOOR_TYPE','"Hinged"/"Sliding"/"Open"'],['HANDLE_TYPE','"Normal"/"Handleless"'],['HAS_MIRROR','true/false'],
        ].map(([v,d]) => (
          <div key={v} style={{ display:'flex', alignItems:'center', gap:5, background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:'3px 8px' }}>
            <code style={{ fontFamily:'DM Mono,monospace', fontSize:11, color:COLORS.amber, fontWeight:700 }}>{v}</code>
            <span style={{ fontSize:11, color:COLORS.textMuted }}>{d}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop:8, fontSize:11, color:COLORS.textMuted }}>
        Supports: <code style={{fontFamily:'monospace'}}>+ - * /</code> · comparisons <code style={{fontFamily:'monospace'}}>&gt; &lt; == !=</code> · logic <code style={{fontFamily:'monospace'}}>&amp;&amp; ||</code> · <code style={{fontFamily:'monospace'}}>max(a,b)</code>
      </div>
    </div>
  )
}

function PanelRuleCard({ rule, onChange, onDelete }) {
  const [open, setOpen] = useState(false)
  const slot = SLOT_META[rule.material_slot] || { color:COLORS.textMuted, label:rule.material_slot }

  return (
    <div style={{ border:`1px solid ${open ? slot.color+'60' : COLORS.border}`, borderRadius:12, marginBottom:8, overflow:'hidden', transition:'border-color 0.2s', opacity:rule.enabled?1:0.55 }}>
      <div onClick={()=>setOpen(o=>!o)} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 16px', background:COLORS.surface, cursor:'pointer', userSelect:'none' }}>
        <input type="checkbox" checked={rule.enabled} onClick={e=>e.stopPropagation()} onChange={e=>onChange({...rule,enabled:e.target.checked})} style={{ width:15,height:15,cursor:'pointer',accentColor:COLORS.accent,flexShrink:0 }}/>
        <span style={{ fontWeight:600, fontSize:13, color:COLORS.text, flex:1 }}>{rule.label||'Unnamed Panel'}</span>
        <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
          {pill(slot.color, slot.label)}
          <span style={{ fontSize:11, color:COLORS.textMuted }}>qty</span>
          <FormulaTag value={rule.qty}/>
          <span style={{ fontSize:11, color:COLORS.textMuted }}>area</span>
          <FormulaTag value={rule.area}/>
        </div>
        <div style={{ color:COLORS.textMuted, transition:'transform 0.2s', transform:open?'rotate(180deg)':'none' }}>
          <Icon name="arrowDown" size={14}/>
        </div>
      </div>

      {open && (
        <div style={{ padding:'16px', borderTop:`1px solid ${COLORS.border}`, background:COLORS.bg, display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:12 }}>
            <FieldRow label="Panel Name" hint="e.g. Side Panels">
              <input value={rule.label} onChange={e=>onChange({...rule,label:e.target.value})} style={inputSt()}/>
            </FieldRow>
            <FieldRow label="Material">
              <select value={rule.material_slot} onChange={e=>onChange({...rule,material_slot:e.target.value})} style={selectSt()}>
                <option value="body">Body — main structure</option>
                <option value="door">Door — door panels</option>
                <option value="back">Back — back panel</option>
              </select>
            </FieldRow>
          </div>

          <div style={{ background:COLORS.surface, borderRadius:10, padding:'14px', border:`1px solid ${COLORS.border}` }}>
            <div style={{ fontSize:11, fontWeight:700, color:COLORS.textMuted, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:10 }}>Calculation formulas</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
              <FieldRow label="Quantity" hint="how many pieces">
                <input value={rule.qty} onChange={e=>onChange({...rule,qty:e.target.value})} style={inputSt(true)} placeholder="e.g. 2 or SHELVES"/>
              </FieldRow>
              <FieldRow label="Area (cm²)" hint="per piece">
                <input value={rule.area} onChange={e=>onChange({...rule,area:e.target.value})} style={inputSt(true)} placeholder="e.g. H*D or W*D"/>
              </FieldRow>
              <FieldRow label="Edge banding (cm)" hint="total for all pieces">
                <input value={rule.edge_formula} onChange={e=>onChange({...rule,edge_formula:e.target.value})} style={inputSt(true)} placeholder="e.g. 2*H or qty*W"/>
              </FieldRow>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <FieldRow label="Condition" hint="leave blank to always apply">
              <input value={rule.condition||''} onChange={e=>onChange({...rule,condition:e.target.value})} style={inputSt(true)} placeholder='e.g. DOORS>0 && DOOR_TYPE!="Open"'/>
            </FieldRow>
            <FieldRow label="Notes" hint="optional">
              <input value={rule.note||''} onChange={e=>onChange({...rule,note:e.target.value})} style={inputSt()} placeholder="e.g. Two vertical side panels"/>
            </FieldRow>
          </div>

          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button onClick={onDelete} style={{ background:'none', border:`1px solid ${COLORS.red}40`, borderRadius:7, padding:'5px 12px', cursor:'pointer', color:COLORS.red, fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:6, fontFamily:'inherit' }}>
              <Icon name="trash" size={12}/> Delete Rule
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const SPECIAL_ACC = {
  'auto_by_depth':     { label:'Auto Drawer Slides', desc:'Picks slide length by depth', color:'#F59E0B' },
  'area_based':        { label:'Mirror (area m²)',   desc:'H × (W/DOORS) × mirror_count', color:'#14B8A6' },
  'total_perimeter_m': { label:'Edge Banding',       desc:'Sum of all panel edge formulas', color:'#A78BFA' },
}

function AccRuleCard({ rule, accessories, onChange, onDelete }) {
  const [open, setOpen] = useState(false)
  const accOptions = accessories.map(a => ({ value:a.acc_id, label:a.name }))
  const special = SPECIAL_ACC[rule.acc_id]
  const matchedAcc = accessories.find(a => a.acc_id === rule.acc_id)
  const accLabel = special?.label || matchedAcc?.name || rule.acc_id || '—'
  const accColor = special?.color || COLORS.purple

  return (
    <div style={{ border:`1px solid ${open ? accColor+'60' : COLORS.border}`, borderRadius:12, marginBottom:8, overflow:'hidden', opacity:rule.enabled?1:0.55, transition:'border-color 0.2s' }}>
      <div onClick={()=>setOpen(o=>!o)} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 16px', background:COLORS.surface, cursor:'pointer', userSelect:'none' }}>
        <input type="checkbox" checked={rule.enabled} onClick={e=>e.stopPropagation()} onChange={e=>onChange({...rule,enabled:e.target.checked})} style={{ width:15,height:15,cursor:'pointer',accentColor:COLORS.accent,flexShrink:0 }}/>
        <span style={{ fontWeight:600, fontSize:13, color:COLORS.text, flex:1 }}>{rule.label||'Unnamed Accessory'}</span>
        <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
          {pill(accColor, accLabel)}
          <span style={{ fontSize:11, color:COLORS.textMuted }}>qty</span>
          <FormulaTag value={rule.qty}/>
          {rule.condition && <FormulaTag value={'if: '+rule.condition.slice(0,28)+(rule.condition.length>28?'…':'')}/>}
        </div>
        <div style={{ color:COLORS.textMuted, transition:'transform 0.2s', transform:open?'rotate(180deg)':'none' }}>
          <Icon name="arrowDown" size={14}/>
        </div>
      </div>

      {open && (
        <div style={{ padding:'16px', borderTop:`1px solid ${COLORS.border}`, background:COLORS.bg, display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 2fr', gap:12 }}>
            <FieldRow label="Rule Name">
              <input value={rule.label} onChange={e=>onChange({...rule,label:e.target.value})} style={inputSt()}/>
            </FieldRow>
            <FieldRow label="Accessory">
              <select value={rule.acc_id} onChange={e=>onChange({...rule,acc_id:e.target.value})} style={selectSt()}>
                <optgroup label="Smart / Auto calculated">
                  <option value="auto_by_depth">Auto Drawer Slides — picks length by depth</option>
                  <option value="area_based">Mirror — area based (m²)</option>
                  <option value="total_perimeter_m">Edge Banding — total perimeter</option>
                </optgroup>
                <optgroup label="From Pricing Config">
                  {accOptions.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                </optgroup>
              </select>
            </FieldRow>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <FieldRow label="Quantity Formula" hint="e.g. DOORS*3">
              <input value={rule.qty} onChange={e=>onChange({...rule,qty:e.target.value})} style={inputSt(true)} placeholder="e.g. DOORS*3 or SHELVES*4"/>
            </FieldRow>
            <FieldRow label="Condition" hint="leave blank to always apply">
              <input value={rule.condition||''} onChange={e=>onChange({...rule,condition:e.target.value})} style={inputSt(true)} placeholder='e.g. DOORS>0 && DOOR_TYPE=="Hinged"'/>
            </FieldRow>
          </div>
          <FieldRow label="Notes" hint="optional">
            <input value={rule.note||''} onChange={e=>onChange({...rule,note:e.target.value})} style={inputSt()} placeholder="Optional description for your team"/>
          </FieldRow>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button onClick={onDelete} style={{ background:'none', border:`1px solid ${COLORS.red}40`, borderRadius:7, padding:'5px 12px', cursor:'pointer', color:COLORS.red, fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:6, fontFamily:'inherit' }}>
              <Icon name="trash" size={12}/> Delete Rule
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CategoryDefaultsTable({ categoryDefaults, materials, onChange }) {
  const matOptions = materials.map(m => ({ value:m.material_id, label:m.name }))
  const selSt = {
    background:COLORS.inputBg, border:`1px solid ${COLORS.border}`, borderRadius:6,
    padding:'5px 28px 5px 8px', color:COLORS.text, fontSize:12, outline:'none',
    fontFamily:'inherit', cursor:'pointer', width:'100%', appearance:'none',
    backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat:'no-repeat', backgroundPosition:'right 8px center',
  }

  return (
    <Card style={{ padding:0, overflow:'hidden' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead>
          <tr style={{ borderBottom:`1px solid ${COLORS.border}`, background:COLORS.surface }}>
            <th style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:COLORS.textMuted, letterSpacing:'0.06em', textTransform:'uppercase' }}>Category</th>
            {['body','back','door'].map(s => (
              <th key={s} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:SLOT_META[s].color }}>
                {SLOT_META[s].label} <span style={{ color:COLORS.textMuted, fontWeight:400 }}>— {SLOT_META[s].desc}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CATEGORIES.map((cat,i) => {
            const def = categoryDefaults[cat] || { body:'MDF_17_F2', back:'MDF_3.2_F1', door:'MDF_17_F2' }
            return (
              <tr key={cat} style={{ borderBottom:`1px solid ${COLORS.border}`, background:i%2===0?'transparent':COLORS.surface+'80' }}>
                <td style={{ padding:'8px 16px', fontWeight:600, color:COLORS.text, whiteSpace:'nowrap' }}>{cat}</td>
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

export default function EnginePage({ engineRules, setEngineRules, materials, accessories, toast }) {
  const [tab, setTab] = useState('panels')

  const tabSt = (t) => ({
    padding:'8px 18px', fontSize:13, fontWeight:600, cursor:'pointer',
    borderRadius:'8px 8px 0 0', background:tab===t?COLORS.surface:'transparent',
    color:tab===t?COLORS.text:COLORS.textMuted, border:'none',
    borderBottom:tab===t?`2px solid ${COLORS.accent}`:`2px solid transparent`,
    fontFamily:'inherit', transition:'color 0.15s',
  })

  function updatePanelRule(id, updated) { setEngineRules(r => ({ ...r, panelRules:r.panelRules.map(p=>p.id===id?updated:p) })) }
  function deletePanelRule(id)          { setEngineRules(r => ({ ...r, panelRules:r.panelRules.filter(p=>p.id!==id) })); toast('Rule deleted') }
  function addPanelRule()               { const n={id:'panel_'+Date.now(),label:'New Panel',qty:'1',area:'W*D',material_slot:'body',edge_formula:'W',enabled:true,note:''}; setEngineRules(r=>({...r,panelRules:[...r.panelRules,n]})) }

  function updateAccRule(id, updated)   { setEngineRules(r => ({ ...r, accessoryRules:r.accessoryRules.map(a=>a.id===id?updated:a) })) }
  function deleteAccRule(id)            { setEngineRules(r => ({ ...r, accessoryRules:r.accessoryRules.filter(a=>a.id!==id) })); toast('Rule deleted') }
  function addAccRule()                 { const n={id:'acc_'+Date.now(),label:'New Accessory',acc_id:'',qty:'1',condition:'',enabled:true,note:''}; setEngineRules(r=>({...r,accessoryRules:[...r.accessoryRules,n]})) }

  function updateCategoryDefault(cat, slot, val) {
    setEngineRules(r => ({ ...r, categoryDefaults:{ ...r.categoryDefaults, [cat]:{ ...(r.categoryDefaults[cat]||{}), [slot]:val } } }))
  }

  const panels = engineRules.panelRules || []
  const accs   = engineRules.accessoryRules || []

  return (
    <div style={{ padding:'24px 28px', overflowY:'auto', flex:1 }}>
      <div style={{ marginBottom:20 }}>
        <h2 style={{ fontSize:20, fontWeight:800, color:COLORS.text, letterSpacing:'-0.02em', marginBottom:4 }}>Costing Engine</h2>
        <p style={{ fontSize:13, color:COLORS.textMuted }}>Rules define which panels and accessories are included in every SKU cost. Toggle rules on/off without deleting them.</p>
      </div>

      {/* Stat strip */}
      <div style={{ display:'flex', gap:10, marginBottom:20 }}>
        {[
          { label:'Panel Rules', on:panels.filter(r=>r.enabled).length, total:panels.length, color:COLORS.accent },
          { label:'Accessory Rules', on:accs.filter(r=>r.enabled).length, total:accs.length, color:COLORS.purple },
          { label:'Categories', on:Object.keys(engineRules.categoryDefaults||{}).length, total:CATEGORIES.length, color:COLORS.teal },
        ].map(s => (
          <div key={s.label} style={{ flex:1, background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:12, color:COLORS.textMuted, fontWeight:600 }}>{s.label}</span>
            <span style={{ fontSize:15, fontWeight:800, color:s.color }}>
              {s.on}<span style={{ fontSize:11, color:COLORS.textMuted, fontWeight:400 }}>/{s.total} active</span>
            </span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:`1px solid ${COLORS.border}`, marginBottom:20 }}>
        <button onClick={()=>setTab('panels')} style={tabSt('panels')}>Panels ({panels.length})</button>
        <button onClick={()=>setTab('accessories')} style={tabSt('accessories')}>Accessories ({accs.length})</button>
        <button onClick={()=>setTab('categories')} style={tabSt('categories')}>Material Defaults</button>
      </div>

      {tab==='panels' && (
        <div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:COLORS.text }}>Panel Rules</div>
              <div style={{ fontSize:12, color:COLORS.textMuted, marginTop:2 }}>Each rule = a set of cut panels. Cost = qty × area → grouped by material → converted to sheets.</div>
            </div>
            <Btn size="sm" onClick={addPanelRule}><Icon name="plus" size={14}/> Add Panel Rule</Btn>
          </div>
          <VarsReference/>
          {panels.map(rule => (
            <PanelRuleCard key={rule.id} rule={rule} onChange={u=>updatePanelRule(rule.id,u)} onDelete={()=>deletePanelRule(rule.id)}/>
          ))}
          {panels.length===0 && <div style={{ textAlign:'center', padding:40, color:COLORS.textMuted }}>No panel rules. <button onClick={addPanelRule} style={{ background:'none',border:'none',color:COLORS.accent,cursor:'pointer',fontFamily:'inherit' }}>Add one →</button></div>}
        </div>
      )}

      {tab==='accessories' && (
        <div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:COLORS.text }}>Accessory Rules</div>
              <div style={{ fontSize:12, color:COLORS.textMuted, marginTop:2 }}>Auto-include accessories when conditions are met. Quantity is evaluated per SKU.</div>
            </div>
            <Btn size="sm" onClick={addAccRule}><Icon name="plus" size={14}/> Add Accessory Rule</Btn>
          </div>
          <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
            {Object.entries(SPECIAL_ACC).map(([k,v]) => (
              <div key={k} style={{ flex:1, minWidth:160, background:COLORS.surface, border:`1px solid ${v.color}30`, borderRadius:9, padding:'8px 12px' }}>
                <div style={{ fontSize:11, fontWeight:700, color:v.color, marginBottom:2 }}>{v.label}</div>
                <div style={{ fontSize:11, color:COLORS.textMuted }}>{v.desc}</div>
              </div>
            ))}
          </div>
          <VarsReference/>
          {accs.map(rule => (
            <AccRuleCard key={rule.id} rule={rule} accessories={accessories} onChange={u=>updateAccRule(rule.id,u)} onDelete={()=>deleteAccRule(rule.id)}/>
          ))}
          {accs.length===0 && <div style={{ textAlign:'center', padding:40, color:COLORS.textMuted }}>No accessory rules. <button onClick={addAccRule} style={{ background:'none',border:'none',color:COLORS.accent,cursor:'pointer',fontFamily:'inherit' }}>Add one →</button></div>}
        </div>
      )}

      {tab==='categories' && (
        <div>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:14, fontWeight:700, color:COLORS.text }}>Material Defaults by Category</div>
            <div style={{ fontSize:12, color:COLORS.textMuted, marginTop:2 }}>Auto-assigned when a SKU is imported via CSV. Can always be overridden per SKU in the catalog.</div>
          </div>
          <div style={{ display:'flex', gap:8, marginBottom:14 }}>
            {['body','back','door'].map(s => (
              <div key={s} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', background:COLORS.surface, border:`1px solid ${SLOT_META[s].color}30`, borderRadius:8 }}>
                <div style={{ width:8,height:8,borderRadius:'50%',background:SLOT_META[s].color }}/>
                <span style={{ fontSize:12, fontWeight:700, color:SLOT_META[s].color }}>{SLOT_META[s].label}</span>
                <span style={{ fontSize:12, color:COLORS.textMuted }}>— {SLOT_META[s].desc}</span>
              </div>
            ))}
          </div>
          <CategoryDefaultsTable categoryDefaults={engineRules.categoryDefaults||{}} materials={materials} onChange={updateCategoryDefault}/>
        </div>
      )}
    </div>
  )
}
