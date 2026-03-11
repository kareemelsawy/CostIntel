import { useState } from 'react'
import { COLORS, CATEGORIES } from '../lib/constants'
import { Icon, Btn, Card } from '../components/UI'

const SLOT_META = {
  body: { color: '#4F8EF7', label: 'Body Material' },
  door: { color: '#A78BFA', label: 'Door Material' },
  back: { color: '#14B8A6', label: 'Back Material' },
}

const tag = (color, text) => (
  <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:700, background:color+'20', color, letterSpacing:'0.02em', whiteSpace:'nowrap' }}>{text}</span>
)

// ── Panel Logic Reference ────────────────────────────────────────────────────
const PANEL_LOGIC = [
  { name:'Side Panels', qty:'2', material:'Body', area:'Height × Depth', edge:'2 × Height (front edges)', note:'Two vertical side panels. Front edge of each side is banded.' },
  { name:'Top Panel', qty:'1', material:'Body', area:'Width × Depth', edge:'Width (front edge only)', note:'Horizontal top panel. Only the front edge is visible and banded.' },
  { name:'Bottom Panel', qty:'1', material:'Body', area:'Width × Depth', edge:'Width (front edge only)', note:'Horizontal bottom panel. Same logic as top panel.' },
  { name:'Partitions', qty:'Spaces − 1', material:'Body', area:'Height × Depth', edge:'Qty × Height (front edges)', note:'Vertical dividers between spaces. A 2-space cabinet has 1 partition; 3 spaces → 2 partitions, etc.' },
  { name:'Shelves', qty:'# Shelves', material:'Body', area:'Width × Depth', edge:'Qty × Width (front edges)', note:'Horizontal interior shelves. Only the front edge is banded.' },
  { name:'Drawer Fronts', qty:'# Drawers', material:'Door', area:'(Width ÷ Spaces) × 20 cm', edge:'All 4 edges per front', note:'Visible drawer face panels. Height estimated at 20 cm standard; width = cabinet width divided by number of spaces.' },
  { name:'Door Panels', qty:'# Doors', material:'Door', area:'Height × (Width ÷ Doors)', edge:'Full perimeter per door', note:'Only for Hinged or Sliding types. Open wardrobes have no door panels. Each door spans the full height and its share of the width.' },
  { name:'Back Panel', qty:'1', material:'Back', area:'Width × Height', edge:'None (hidden)', note:'Only added when "Has Back Panel = Close". Open-back units skip this panel entirely.' },
]

// ── Accessory Logic Reference ────────────────────────────────────────────────
const ACC_LOGIC = [
  { name:'Hinges', acc:'HINGE_FULL', qty:'Doors × (2, 3, or 4)', condition:'Hinged doors only', note:'Count scales with door height: ≤120 cm → 2/door · 121–180 cm → 3/door · >180 cm → 4/door. Industry standard (Blum / Grass sizing).' },
  { name:'Sliding Track', acc:'LATCH_SLIDE', qty:'1 per door', condition:'Sliding doors only', note:'One sliding rail/latch set per sliding door leaf (مجرى لطش). Hinged and open cabinets do not get this.' },
  { name:'Drawer Slides', acc:'SLIDE_30–55', qty:'1 pair per drawer', condition:'Any drawer', note:'Pair selection by depth: drawer depth = cabinet depth − 5 cm clearance. Then: ≤32→30cm, ≤37→35cm, ≤42→40cm, ≤47→45cm, ≤52→50cm, else 55cm.' },
  { name:'Handles', acc:'HANDLE_128 / HANDLE_SLIDE20', qty:'1 per door + 1 per drawer', condition:'Handle Type ≠ Handleless', note:'Hinged/Open doors and drawers use 128mm handle. Sliding doors use recessed 20 cm pull. Handleless = zero handles.' },
  { name:'Shelf Pins', acc:'SHELF_SUPPORT', qty:'4 per shelf', condition:'Any shelf', note:'4 shelf support pins per shelf (2 per side). Standard for adjustable shelves.' },
  { name:'Hanger Rod', acc:'HANGER_ROD', qty:'1 per hanger space', condition:'# Hangers > 0', note:'One hanging rod per hanger compartment. Standard 100 cm rod, cut to fit.' },
  { name:'Mirror', acc:'MIRROR_M2', qty:'Area in m²', condition:'Has Mirror = YES', note:'Area = Height × (Width ÷ Doors) × mirror count, capped at door count. Priced per m².' },
  { name:'Edge Banding', acc:'EDGE_STD', qty:'Total perimeter meters', condition:'Always', note:'Sum of all panel edge formulas ÷ 100 = total meters. Priced per linear meter.' },
]

// ── Commercial Logic Reference ───────────────────────────────────────────────
const COMMERCIAL_STEPS = [
  { step:1, label:'COGS', formula:'Materials + Edge Banding + Accessories', color:COLORS.textDim, note:'Raw cost of all cut panels, hardware, and edge banding.' },
  { step:2, label:'+ Overhead', formula:'COGS × Overhead %', color:COLORS.amber, note:'Factory overhead: labour, utilities, machine time. Applied as % of COGS.' },
  { step:3, label:'= Production Cost', formula:'COGS + Overhead', color:COLORS.accent, bold:true, note:'Total cost to produce the unit. This is your floor price before any margins.' },
  { step:4, label:'+ Seller Markup', formula:'Production Cost × Seller Markup %', color:COLORS.orange, note:'Seller\'s profit margin added on top of production cost.' },
  { step:5, label:'+ VAT', formula:'(Production Cost + Seller Markup) × VAT %', color:COLORS.red, note:'Egyptian VAT (14%) applied to the seller subtotal for B2B invoicing.' },
  { step:6, label:'= Pre-commission Subtotal', formula:'After seller markup and VAT', color:COLORS.textDim, note:'What the seller "receives" before Homzmart takes its cut.' },
  { step:7, label:'Homzmart Commission', formula:'Final Selling Price × Commission %', color:COLORS.red, note:'Commission is on the FINAL selling price (not cost). So recommended price = subtotal ÷ (1 − commission%).' },
  { step:8, label:'= Recommended Price', formula:'Subtotal ÷ (1 − Commission %)', color:COLORS.green, bold:true, note:'Break-even price. Selling at this price covers all costs, markup, VAT, and Homzmart commission exactly.' },
]

function PanelRow({ p }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom:`1px solid ${COLORS.border}` }}>
      <div onClick={()=>setOpen(o=>!o)} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', cursor:'pointer', userSelect:'none' }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:COLORS.accent, flexShrink:0 }}/>
        <span style={{ fontWeight:600, fontSize:13, color:COLORS.text, flex:1, minWidth:130 }}>{p.name}</span>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', flex:2 }}>
          <span style={{ fontSize:12, color:COLORS.textMuted }}>Qty: <strong style={{color:COLORS.text}}>{p.qty}</strong></span>
          <span style={{ fontSize:12, color:COLORS.textMuted }}>Area: <strong style={{color:COLORS.text}}>{p.area}</strong></span>
          <span style={{ fontSize:12, color:COLORS.textMuted }}>Edge: <strong style={{color:COLORS.text}}>{p.edge}</strong></span>
        </div>
        {tag(SLOT_META[p.material?.toLowerCase()]?.color || COLORS.accent, p.material)}
        <div style={{ color:COLORS.textMuted, transition:'transform 0.2s', transform:open?'rotate(180deg)':'none', flexShrink:0 }}>
          <Icon name="arrowDown" size={13}/>
        </div>
      </div>
      {open && (
        <div style={{ padding:'0 16px 14px 36px', fontSize:12, color:COLORS.textMuted, lineHeight:1.7, borderTop:`1px solid ${COLORS.border}44` }}>
          {p.note}
        </div>
      )}
    </div>
  )
}

function AccRow({ a }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom:`1px solid ${COLORS.border}` }}>
      <div onClick={()=>setOpen(o=>!o)} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', cursor:'pointer', userSelect:'none' }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:COLORS.purple, flexShrink:0 }}/>
        <span style={{ fontWeight:600, fontSize:13, color:COLORS.text, flex:1, minWidth:130 }}>{a.name}</span>
        <div style={{ display:'flex', gap:8, flex:2, flexWrap:'wrap' }}>
          <span style={{ fontSize:12, color:COLORS.textMuted }}>Qty: <strong style={{color:COLORS.text}}>{a.qty}</strong></span>
          <span style={{ fontSize:12, color:COLORS.textMuted }}>When: <strong style={{color:COLORS.text}}>{a.condition}</strong></span>
        </div>
        {tag(COLORS.purple, a.acc)}
        <div style={{ color:COLORS.textMuted, transition:'transform 0.2s', transform:open?'rotate(180deg)':'none', flexShrink:0 }}>
          <Icon name="arrowDown" size={13}/>
        </div>
      </div>
      {open && (
        <div style={{ padding:'0 16px 14px 36px', fontSize:12, color:COLORS.textMuted, lineHeight:1.7, borderTop:`1px solid ${COLORS.border}44` }}>
          {a.note}
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
                {SLOT_META[s].label}
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
  const [tab, setTab] = useState('how')

  const tabSt = (t) => ({
    padding:'8px 18px', fontSize:13, fontWeight:600, cursor:'pointer',
    borderRadius:'8px 8px 0 0', background:tab===t?COLORS.surface:'transparent',
    color:tab===t?COLORS.text:COLORS.textMuted, border:'none',
    borderBottom:tab===t?`2px solid ${COLORS.accent}`:`2px solid transparent`,
    fontFamily:'inherit', transition:'color 0.15s',
  })

  function updateCategoryDefault(cat, slot, val) {
    setEngineRules(r => ({ ...r, categoryDefaults:{ ...r.categoryDefaults, [cat]:{ ...(r.categoryDefaults[cat]||{}), [slot]:val } } }))
  }

  return (
    <div style={{ padding:'24px 28px', overflowY:'auto', flex:1 }}>
      <div style={{ marginBottom:20 }}>
        <h2 style={{ fontSize:20, fontWeight:800, color:COLORS.text, letterSpacing:'-0.02em', marginBottom:4 }}>Costing Engine</h2>
        <p style={{ fontSize:13, color:COLORS.textMuted }}>Understand how every cost is calculated. The engine runs automatically on every SKU using these rules.</p>
      </div>

      {/* Summary strip */}
      <div style={{ display:'flex', gap:10, marginBottom:20 }}>
        {[
          { label:'Panel Types', value:PANEL_LOGIC.length, color:COLORS.accent, note:'Cut from sheet material' },
          { label:'Accessory Rules', value:ACC_LOGIC.length, color:COLORS.purple, note:'Auto-included by conditions' },
          { label:'Material Categories', value:CATEGORIES.length, color:COLORS.teal, note:'With default assignments' },
        ].map(s => (
          <div key={s.label} style={{ flex:1, background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:'12px 16px' }}>
            <div style={{ fontSize:22, fontWeight:900, color:s.color, marginBottom:2 }}>{s.value}</div>
            <div style={{ fontSize:12, fontWeight:700, color:COLORS.text }}>{s.label}</div>
            <div style={{ fontSize:11, color:COLORS.textMuted, marginTop:2 }}>{s.note}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:`1px solid ${COLORS.border}`, marginBottom:20 }}>
        <button onClick={()=>setTab('how')} style={tabSt('how')}>How It Works</button>
        <button onClick={()=>setTab('panels')} style={tabSt('panels')}>Panel Rules</button>
        <button onClick={()=>setTab('accessories')} style={tabSt('accessories')}>Accessory Rules</button>
        <button onClick={()=>setTab('commercial')} style={tabSt('commercial')}>Pricing Logic</button>
        <button onClick={()=>setTab('categories')} style={tabSt('categories')}>Material Defaults</button>
      </div>

      {/* HOW IT WORKS */}
      {tab==='how' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ background:COLORS.accent+'10', border:`1px solid ${COLORS.accent}30`, borderRadius:12, padding:'16px 20px' }}>
            <div style={{ fontSize:14, fontWeight:800, color:COLORS.text, marginBottom:8 }}>How a SKU cost is calculated</div>
            <div style={{ fontSize:13, color:COLORS.textDim, lineHeight:1.8 }}>
              When you upload or add a SKU, the engine reads its dimensions and attributes, then automatically:
            </div>
            <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:8 }}>
              {[
                ['1', COLORS.accent, 'Generates panels', 'Based on Width, Depth, Height, Doors, Shelves, Spaces, Drawers — each panel type is calculated and assigned to its material slot (Body, Door, or Back).'],
                ['2', COLORS.amber, 'Calculates sheet usage', 'Each material group is converted to full sheets (244×122 cm) with a 10% cutting waste factor. Cost = sheets × price per sheet.'],
                ['3', COLORS.purple, 'Adds accessories', 'Hinges, slides, handles, pins, hanger rods, and mirrors are added automatically based on the SKU attributes and the conditions in the Accessory Rules tab.'],
                ['4', COLORS.orange, 'Computes edge banding', 'All exposed front edges are summed in linear meters and multiplied by the edge banding price per meter.'],
                ['5', COLORS.green, 'Applies commercial settings', 'COGS → Overhead → Seller Markup → VAT → Homzmart Commission → Recommended Price. See the Pricing Logic tab for details.'],
              ].map(([n, c, title, desc]) => (
                <div key={n} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                  <div style={{ width:24, height:24, borderRadius:'50%', background:c+'20', color:c, fontWeight:800, fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>{n}</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:COLORS.text, marginBottom:2 }}>{title}</div>
                    <div style={{ fontSize:12, color:COLORS.textMuted, lineHeight:1.6 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background:COLORS.amber+'10', border:`1px solid ${COLORS.amber}30`, borderRadius:10, padding:'12px 16px', fontSize:12, color:COLORS.textDim, lineHeight:1.7 }}>
            <strong style={{color:COLORS.amber}}>Note on material dimensions: </strong>
            The engine ignores panel thickness for area calculations (standard practice for quoting at this stage). All dimensions in the CSV are external/nominal dimensions. Sheet area is 244 × 122 cm (standard Egyptian market sheet size).
          </div>
        </div>
      )}

      {/* PANEL RULES */}
      {tab==='panels' && (
        <div>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:14, fontWeight:700, color:COLORS.text }}>Panel Rules</div>
            <div style={{ fontSize:12, color:COLORS.textMuted, marginTop:2 }}>Each rule defines a set of cut panels. Click any row to see the reasoning behind it.</div>
          </div>
          <Card style={{ padding:0, overflow:'hidden' }}>
            {PANEL_LOGIC.map((p,i) => <PanelRow key={i} p={p}/>)}
          </Card>
          <div style={{ marginTop:12, padding:'10px 14px', background:COLORS.surface, borderRadius:8, fontSize:12, color:COLORS.textMuted, border:`1px solid ${COLORS.border}` }}>
            💡 <strong>Sheet waste:</strong> A 10% cutting waste factor is applied to all panel areas before converting to full sheets. This accounts for off-cuts, saw kerfs, and layout inefficiencies — standard in Egyptian furniture manufacturing.
          </div>
        </div>
      )}

      {/* ACCESSORY RULES */}
      {tab==='accessories' && (
        <div>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:14, fontWeight:700, color:COLORS.text }}>Accessory Rules</div>
            <div style={{ fontSize:12, color:COLORS.textMuted, marginTop:2 }}>Accessories are auto-included based on the SKU's attributes. Click any row to see the logic.</div>
          </div>
          <Card style={{ padding:0, overflow:'hidden' }}>
            {ACC_LOGIC.map((a,i) => <AccRow key={i} a={a}/>)}
          </Card>
          <div style={{ marginTop:12, padding:'10px 14px', background:COLORS.surface, borderRadius:8, fontSize:12, color:COLORS.textMuted, border:`1px solid ${COLORS.border}` }}>
            💡 Accessory prices are set in <strong>Pricing Config</strong>. The engine uses the standard price unless you switch a SKU to "Good Quality" mode in the calculator, which uses the premium price.
          </div>
        </div>
      )}

      {/* PRICING / COMMERCIAL LOGIC */}
      {tab==='commercial' && (
        <div>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:14, fontWeight:700, color:COLORS.text }}>Pricing Logic — How the Recommended Price is Calculated</div>
            <div style={{ fontSize:12, color:COLORS.textMuted, marginTop:2 }}>The waterfall below shows each step from raw cost to the recommended selling price.</div>
          </div>
          <Card style={{ padding:'4px 0', overflow:'hidden' }}>
            {COMMERCIAL_STEPS.map((s, i) => (
              <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:14, padding:'13px 18px', borderBottom:i<COMMERCIAL_STEPS.length-1?`1px solid ${COLORS.border}`:'none', background:s.bold?s.color+'08':'transparent' }}>
                <div style={{ width:24, height:24, borderRadius:'50%', background:s.color+'20', color:s.color, fontWeight:800, fontSize:11, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>{s.step}</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'baseline', gap:10, marginBottom:3 }}>
                    <span style={{ fontSize:13, fontWeight:s.bold?800:600, color:s.bold?s.color:COLORS.text }}>{s.label}</span>
                    <span style={{ fontSize:12, fontFamily:'monospace', color:COLORS.amber, background:COLORS.amber+'15', padding:'1px 7px', borderRadius:5 }}>{s.formula}</span>
                  </div>
                  <div style={{ fontSize:12, color:COLORS.textMuted, lineHeight:1.6 }}>{s.note}</div>
                </div>
              </div>
            ))}
          </Card>
          <div style={{ marginTop:12, padding:'10px 14px', background:COLORS.surface, borderRadius:8, fontSize:12, color:COLORS.textMuted, border:`1px solid ${COLORS.border}`, lineHeight:1.7 }}>
            💡 <strong>Seller Markup vs Margin:</strong> The "Seller Markup" is applied as a percentage <em>on top of</em> production cost (cost-plus). This is technically a markup, not a gross margin. To set a target gross margin, use: Markup % = Margin % ÷ (1 − Margin %). E.g. 13% gross margin → ~15% markup. Commercial settings are configured in <strong>Pricing Config</strong>.
          </div>
        </div>
      )}

      {/* CATEGORY DEFAULTS */}
      {tab==='categories' && (
        <div>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:14, fontWeight:700, color:COLORS.text }}>Material Defaults by Category</div>
            <div style={{ fontSize:12, color:COLORS.textMuted, marginTop:2 }}>When a SKU is imported via CSV, it is assigned these materials automatically. You can always override per SKU in the catalog.</div>
          </div>
          <div style={{ display:'flex', gap:8, marginBottom:14 }}>
            {['body','back','door'].map(s => (
              <div key={s} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', background:COLORS.surface, border:`1px solid ${SLOT_META[s].color}30`, borderRadius:8 }}>
                <div style={{ width:8,height:8,borderRadius:'50%',background:SLOT_META[s].color }}/>
                <span style={{ fontSize:12, fontWeight:700, color:SLOT_META[s].color }}>{SLOT_META[s].label}</span>
              </div>
            ))}
          </div>
          <CategoryDefaultsTable categoryDefaults={engineRules.categoryDefaults||{}} materials={materials} onChange={updateCategoryDefault}/>
        </div>
      )}
    </div>
  )
}
