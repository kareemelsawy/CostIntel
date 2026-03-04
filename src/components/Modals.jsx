import { useState } from 'react'
import { COLORS, CATEGORIES, DOOR_TYPES, HANDLE_TYPES } from '../lib/constants'
import { calculateSKUCost, skuToEngineInput, fmt, fmtA, fmtP } from '../lib/engine'
import { Icon, Btn, Modal, StatCard, Toggle } from '../components/UI'

const iSt=()=>({width:'100%',background:COLORS.inputBg,border:`1px solid ${COLORS.border}`,borderRadius:8,padding:'8px 12px',color:COLORS.text,fontSize:13,outline:'none',lineHeight:1.5,fontFamily:'inherit'})
const lSt=()=>({fontSize:11,fontWeight:700,color:COLORS.textMuted,letterSpacing:'0.06em',textTransform:'uppercase',display:'block',marginBottom:6,lineHeight:1.4})

export function SKUDetailModal({ sku, materials, accessories, commercial, onClose, onEdit, onCalc }) {
  if (!sku) return null
  const input = skuToEngineInput(sku)
  const cost = calculateSKUCost(input, materials, accessories, commercial)
  if (cost.error) return <Modal onClose={onClose}><p style={{color:COLORS.red}}>{cost.error}</p></Modal>
  const m = cost.commercial?.net_margin_percent||0
  const mc = m>20?COLORS.green:m>0?COLORS.amber:COLORS.red

  // Build unified table rows: panels + edge banding
  const tableRows = []
  cost.materials_breakdown.forEach(mb => {
    mb.panels.forEach((p,j) => {
      tableRows.push({ type:'panel', mb, p, j, isFirst: j===0, rowSpan: mb.panels.length })
    })
  })
  // Edge banding as a row in the same table
  tableRows.push({ type:'edge' })

  return (
    <Modal onClose={onClose} width={740}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
        <div style={{display:'flex',gap:16,alignItems:'flex-start',flex:1}}>
          {sku.image_link && <img src={sku.image_link} alt="" style={{width:80,height:80,objectFit:'cover',borderRadius:10,background:COLORS.bg,flexShrink:0}} onError={e=>{e.target.style.display='none'}}/>}
          <div>
            <div style={{fontSize:11,fontWeight:700,color:COLORS.accent,letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:4}}>Cost Report</div>
            <h3 style={{fontSize:18,fontWeight:800,color:COLORS.text}}>{sku.name||sku.sku_code}</h3>
            <div style={{fontSize:12,color:COLORS.textMuted,marginTop:4,lineHeight:1.6}}>
              {sku.sku_code} · {sku.sub_category} · {sku.width_cm}×{sku.depth_cm}×{sku.height_cm} cm
              {sku.doors_count>0&&` · ${sku.doors_count} ${sku.door_type} doors`}
              {sku.spaces_count>0&&` · ${sku.spaces_count} spaces`}
              {cost.derived_partitions>0&&` · ${cost.derived_partitions} partitions`}
              · Handle: {sku.handle_type||'Normal'}
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{background:'none',border:'none',color:COLORS.textMuted,cursor:'pointer',padding:4}}><Icon name="x" size={18}/></button>
      </div>

      <div style={{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap'}}>
        <StatCard label="COGS (EGP)" value={fmt(cost.cogs)} color={COLORS.amber} icon="box"/>
        <StatCard label="Production Cost (EGP)" value={fmt(cost.production_cost)} color={COLORS.orange} icon="layers"/>
        <StatCard label="Net Margin" value={cost.commercial?fmtP(m):'—'} color={mc} icon="chart"/>
      </div>

      {/* Materials + Edge Banding unified table */}
      <div style={{marginBottom:16}}>
        <div style={{...lSt(),marginBottom:10}}>Material & Edge Banding Breakdown</div>
        <div style={{background:COLORS.bg,borderRadius:10,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr style={{borderBottom:`1px solid ${COLORS.border}`}}>
              {['Material','Panel','Qty','Unit Area (m²)','Total Area (m²)','Sheets','Cost (EGP)'].map(h=>(
                <th key={h} style={{padding:'8px 12px',textAlign:h==='Material'||h==='Panel'?'left':'right',color:COLORS.textMuted,fontWeight:600,fontSize:11}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {tableRows.map((row,idx)=>{
                if(row.type==='edge') {
                  return <tr key="edge" style={{borderBottom:`1px solid ${COLORS.border}`,background:COLORS.surfaceHover}}>
                    <td style={{padding:'8px 12px',fontWeight:600,color:COLORS.text}}>Edge Banding</td>
                    <td style={{padding:'6px 12px',color:COLORS.textDim}}>All exposed edges</td>
                    <td style={{padding:'6px 12px',textAlign:'right',color:COLORS.textDim}}>—</td>
                    <td style={{padding:'6px 12px',textAlign:'right',fontFamily:'monospace',color:COLORS.textDim}}>—</td>
                    <td style={{padding:'6px 12px',textAlign:'right',fontFamily:'monospace',color:COLORS.text}}>{cost.edge_banding.total_m.toFixed(1)} m</td>
                    <td style={{padding:'8px 12px',textAlign:'right',color:COLORS.textMuted,fontSize:10}}>{fmt(cost.edge_banding.price_per_m)}/m</td>
                    <td style={{padding:'8px 12px',textAlign:'right',fontWeight:700,color:COLORS.accent}}>{fmt(cost.edge_banding.cost)}</td>
                  </tr>
                }
                const {mb,p,j,isFirst,rowSpan}=row
                return <tr key={idx} style={{borderBottom:`1px solid ${COLORS.border}`}}>
                  {isFirst&&<td rowSpan={rowSpan} style={{padding:'8px 12px',fontWeight:600,color:COLORS.text,verticalAlign:'top',borderRight:`1px solid ${COLORS.border}`}}>{mb.material_name}<br/><span style={{fontSize:10,color:COLORS.textMuted}}>{fmt(mb.price_per_sheet)}/sheet</span></td>}
                  <td style={{padding:'6px 12px',color:COLORS.textDim}}>{p.name}</td>
                  <td style={{padding:'6px 12px',textAlign:'right',color:COLORS.textDim}}>{p.quantity}</td>
                  <td style={{padding:'6px 12px',textAlign:'right',fontFamily:'monospace',color:COLORS.textDim}}>{fmtA(p.unit_area_m2)}</td>
                  <td style={{padding:'6px 12px',textAlign:'right',fontFamily:'monospace',color:COLORS.text}}>{fmtA(p.total_area_m2)}</td>
                  {isFirst&&<td rowSpan={rowSpan} style={{padding:'8px 12px',textAlign:'right',fontWeight:700,color:COLORS.text,verticalAlign:'top',borderLeft:`1px solid ${COLORS.border}`}}>{mb.required_sheets}</td>}
                  {isFirst&&<td rowSpan={rowSpan} style={{padding:'8px 12px',textAlign:'right',fontWeight:700,color:COLORS.accent,verticalAlign:'top'}}>{fmt(mb.material_cost)}</td>}
                </tr>
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Accessories */}
      <div style={{marginBottom:16}}>
        <div style={{...lSt(),marginBottom:10}}>Accessories</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))',gap:8}}>
          {cost.accessories.items.map(a=>(
            <div key={a.acc_id||a.name} style={{background:COLORS.bg,borderRadius:8,padding:'10px 12px'}}>
              <div style={{fontSize:11,color:COLORS.textMuted,marginBottom:2}}>{a.name} ({a.area_m2?`${a.area_m2.toFixed(2)} m²`:a.qty})</div>
              <div style={{fontSize:14,fontWeight:700,color:COLORS.text}}>{fmt(a.cost)} EGP</div>
              <div style={{fontSize:10,color:COLORS.textMuted}}>@ {fmt(a.unit_price)} each</div>
            </div>
          ))}
          {cost.accessories.items.length===0&&<div style={{color:COLORS.textMuted,fontSize:12,padding:8}}>No accessories</div>}
        </div>
      </div>

      {/* Commercial Waterfall */}
      <div>
        <div style={{...lSt(),marginBottom:10}}>Commercial Analysis</div>
        <div style={{background:COLORS.bg,borderRadius:10,padding:16}}>
          {/* COGS */}
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:13}}>
            <span style={{color:COLORS.text,fontWeight:700}}>COGS</span><span style={{color:COLORS.text,fontWeight:700}}>{fmt(cost.cogs)} EGP</span>
          </div>
          {/* Overhead */}
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:13}}>
            <span style={{color:COLORS.textDim}}>+ Overhead ({(cost.overhead_percent*100).toFixed(0)}%)</span>
            <span style={{color:COLORS.textDim,fontWeight:600}}>{fmt(cost.overhead_amount)} EGP</span>
          </div>
          <div style={{height:1,background:COLORS.border,margin:'8px 0'}}/>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:10,fontSize:14}}>
            <span style={{color:COLORS.text,fontWeight:800}}>Production Cost</span><span style={{color:COLORS.accent,fontWeight:800}}>{fmt(cost.production_cost)} EGP</span>
          </div>

          {cost.commercial && <>
            <div style={{height:1,background:COLORS.border,margin:'8px 0'}}/>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:13}}>
              <span style={{color:COLORS.textDim}}>+ Seller Margin ({((commercial.seller_margin_percent||0)*100).toFixed(0)}% of Prod. Cost)</span>
              <span style={{color:COLORS.red,fontWeight:600}}>{fmt(cost.commercial.seller_margin)} EGP</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:12,paddingLeft:12}}>
              <span style={{color:COLORS.textMuted,fontStyle:'italic'}}>Subtotal</span>
              <span style={{color:COLORS.textMuted,fontWeight:600}}>{fmt(cost.commercial.subtotal_after_seller)} EGP</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:13}}>
              <span style={{color:COLORS.textDim}}>+ Homzmart Margin ({((commercial.homzmart_margin_percent||commercial.commission_percent||0)*100).toFixed(0)}% of above)</span>
              <span style={{color:COLORS.red,fontWeight:600}}>{fmt(cost.commercial.homzmart_margin)} EGP</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:12,paddingLeft:12}}>
              <span style={{color:COLORS.textMuted,fontStyle:'italic'}}>Subtotal</span>
              <span style={{color:COLORS.textMuted,fontWeight:600}}>{fmt(cost.commercial.subtotal_after_homzmart)} EGP</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:13}}>
              <span style={{color:COLORS.textDim}}>+ VAT ({((commercial.vat_percent||0)*100).toFixed(0)}% of above)</span>
              <span style={{color:COLORS.red,fontWeight:600}}>{fmt(cost.commercial.vat)} EGP</span>
            </div>
            <div style={{height:1,background:COLORS.border,margin:'8px 0'}}/>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:13}}>
              <span style={{color:COLORS.text,fontWeight:600}}>Selling Price</span>
              <span style={{color:COLORS.text,fontWeight:700}}>{fmt(cost.commercial.selling_price)} EGP</span>
            </div>
            <div style={{height:2,background:mc,margin:'10px 0',borderRadius:1}}/>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:16,fontWeight:800}}>
              <span style={{color:COLORS.text}}>Net Profit</span>
              <span style={{color:mc}}>{fmt(cost.commercial.net_profit)} EGP ({fmtP(m)})</span>
            </div>
          </>}

          {/* Recommended Selling Price */}
          <div style={{marginTop:16,padding:'12px 14px',background:COLORS.accent+'12',borderRadius:8,border:`1px solid ${COLORS.accent}30`}}>
            <div style={{fontSize:11,fontWeight:700,color:COLORS.accent,letterSpacing:'0.04em',textTransform:'uppercase',marginBottom:4}}>Recommended Selling Price</div>
            <div style={{fontSize:22,fontWeight:900,color:COLORS.accent}}>{fmt(cost.recommended_selling_price)} EGP</div>
            <div style={{fontSize:11,color:COLORS.textMuted,marginTop:4}}>Break-even price to cover COGS + Overhead + all margins + VAT</div>
          </div>
        </div>
      </div>

      <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:20}}>
        <Btn variant="secondary" size="sm" onClick={onEdit}><Icon name="edit" size={14}/> Edit</Btn>
        <Btn size="sm" onClick={onCalc}><Icon name="calc" size={14}/> Calculator</Btn>
      </div>
    </Modal>
  )
}

export function EditSKUModal({ sku, materials, catDefaults, onSave, onClose }) {
  const [f,setF]=useState({...sku})
  const isNew=sku._isNew
  const set=(k,v)=>setF(p=>{
    const n={...p,[k]:v}
    if(k==='door_type') n.has_sliding_system=v==='Sliding'
    if(k==='sub_category'){const d=catDefaults[v]||catDefaults['Other'];n.body_material_id=d.body;n.back_material_id=d.back;n.door_material_id=d.door}
    return n
  })
  const matOpts=materials.map(m=>({value:m.material_id,label:m.name}))

  return (
    <Modal onClose={onClose} width={600}>
      <h3 style={{fontSize:16,fontWeight:800,color:COLORS.text,marginBottom:20}}>{isNew?'Add New SKU':'Edit SKU'}</h3>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div style={{gridColumn:'1/-1'}}><label style={lSt()}>SKU ID</label><input value={f.sku_code||''} onChange={e=>set('sku_code',e.target.value)} style={iSt()} placeholder="Auto if empty"/></div>
        <div style={{gridColumn:'1/-1'}}><label style={lSt()}>Product Name</label><input type="text" value={f.name||''} onChange={e=>set('name',e.target.value)} style={iSt()}/></div>
        <div style={{gridColumn:'1/-1'}}><label style={lSt()}>Image URL</label><input type="text" value={f.image_link||''} onChange={e=>set('image_link',e.target.value)} style={iSt()} placeholder="https://..."/></div>
        <div><label style={lSt()}>Seller</label><input type="text" value={f.seller||''} onChange={e=>set('seller',e.target.value)} style={iSt()}/></div>
        <div><label style={lSt()}>Category</label><select value={f.sub_category} onChange={e=>set('sub_category',e.target.value)} style={{...iSt(),cursor:'pointer'}}>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
        <div><label style={lSt()}>Width (cm)</label><input type="number" value={f.width_cm} onChange={e=>set('width_cm',+e.target.value)} style={iSt()}/></div>
        <div><label style={lSt()}>Depth (cm)</label><input type="number" value={f.depth_cm} onChange={e=>set('depth_cm',+e.target.value)} style={iSt()}/></div>
        <div><label style={lSt()}>Height (cm)</label><input type="number" value={f.height_cm} onChange={e=>set('height_cm',+e.target.value)} style={iSt()}/></div>
        <div><label style={lSt()}>Door Type</label><select value={f.door_type} onChange={e=>set('door_type',e.target.value)} style={{...iSt(),cursor:'pointer'}}>{DOOR_TYPES.map(d=><option key={d} value={d}>{d}</option>)}</select></div>
        <div><label style={lSt()}>No. of Doors</label><input type="number" value={f.doors_count} onChange={e=>set('doors_count',+e.target.value)} style={iSt()} min={0}/></div>
        <div><label style={lSt()}>No. of Drawers</label><input type="number" value={f.drawers_count} onChange={e=>set('drawers_count',+e.target.value)} style={iSt()} min={0}/></div>
        <div><label style={lSt()}>No. of Shelves</label><input type="number" value={f.shelves_count} onChange={e=>set('shelves_count',+e.target.value)} style={iSt()} min={0}/></div>
        <div><label style={lSt()}>No. of Spaces</label><input type="number" value={f.spaces_count||0} onChange={e=>set('spaces_count',+e.target.value)} style={iSt()} min={0}/></div>
        <div><label style={lSt()}>No. of Hangers</label><input type="number" value={f.hangers_count||0} onChange={e=>set('hangers_count',+e.target.value)} style={iSt()} min={0}/></div>
        <div><label style={lSt()}>Handle Type</label><select value={f.handle_type||'Normal'} onChange={e=>set('handle_type',e.target.value)} style={{...iSt(),cursor:'pointer'}}>{HANDLE_TYPES.map(h=><option key={h} value={h}>{h}</option>)}</select></div>
        <div><label style={lSt()}>Primary Color</label><input type="text" value={f.primary_color||''} onChange={e=>set('primary_color',e.target.value)} style={iSt()}/></div>
        <div><label style={lSt()}>Body Material</label><select value={f.body_material_id} onChange={e=>set('body_material_id',e.target.value)} style={{...iSt(),cursor:'pointer'}}>{matOpts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
        <div><label style={lSt()}>Back Material</label><select value={f.back_material_id} onChange={e=>set('back_material_id',e.target.value)} style={{...iSt(),cursor:'pointer'}}>{matOpts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
        <div><label style={lSt()}>Selling Price (EGP)</label><input type="number" value={f.selling_price} onChange={e=>set('selling_price',+e.target.value)} style={iSt()} min={0}/></div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 0'}}>
          <label style={{...lSt(),marginBottom:0}}>Has Mirror</label><Toggle value={!!f.has_mirror} onChange={v=>set('has_mirror',v)}/>
        </div>
        {f.has_mirror&&<div><label style={lSt()}>Mirror Count</label><input type="number" value={f.mirror_count||0} onChange={e=>set('mirror_count',+e.target.value)} style={iSt()} min={0}/></div>}
      </div>
      <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:20}}>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn onClick={()=>onSave({...f,_isNew:undefined})}>{isNew?'Add SKU':'Save'}</Btn>
      </div>
    </Modal>
  )
}

export function EditMaterialModal({ mat, onSave, onClose }) {
  const [f,setF]=useState({...mat}); const set=(k,v)=>setF(p=>({...p,[k]:v})); const isNew=mat._isNew
  return (
    <Modal onClose={onClose} width={460}>
      <h3 style={{fontSize:16,fontWeight:800,color:COLORS.text,marginBottom:20}}>{isNew?'Add Material':'Edit Material'}</h3>
      <div style={{display:'grid',gap:12}}>
        <div><label style={lSt()}>Material Name</label><input type="text" value={f.name||''} onChange={e=>set('name',e.target.value)} style={iSt()}/></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
          <div><label style={lSt()}>Thickness (mm)</label><input type="number" value={f.thickness_mm} onChange={e=>set('thickness_mm',+e.target.value)} style={iSt()}/></div>
          <div><label style={lSt()}>Sheet W (cm)</label><input type="number" value={f.sheet_width_cm} onChange={e=>set('sheet_width_cm',+e.target.value)} style={iSt()}/></div>
          <div><label style={lSt()}>Sheet H (cm)</label><input type="number" value={f.sheet_height_cm} onChange={e=>set('sheet_height_cm',+e.target.value)} style={iSt()}/></div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div><label style={lSt()}>Price (EGP/sheet)</label><input type="number" value={f.price} onChange={e=>set('price',+e.target.value)} style={iSt()} min={0}/></div>
          <div><label style={lSt()}>Good Quality (EGP)</label><input type="number" value={f.price_good||f.price} onChange={e=>set('price_good',+e.target.value)} style={iSt()} min={0}/></div>
        </div>
      </div>
      <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:20}}>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn onClick={()=>{if(!f.material_id)f.material_id=f.name.replace(/\s+/g,'_').toUpperCase();onSave(f)}}>{isNew?'Add':'Save'}</Btn>
      </div>
    </Modal>
  )
}
