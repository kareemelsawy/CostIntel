import { useState, useMemo, useEffect } from 'react'
import { COLORS, CATEGORIES, DOOR_TYPES, HANDLE_TYPES } from '../lib/constants'
import { calculateSKUCost, skuToEngineInput, fmt, fmtP } from '../lib/engine'
import { Icon, Btn, Card, Toggle } from '../components/UI'

const iSt=()=>({width:'100%',background:COLORS.inputBg,border:`1px solid ${COLORS.border}`,borderRadius:8,padding:'8px 12px',color:COLORS.text,fontSize:13,outline:'none',lineHeight:1.5,fontFamily:'inherit'})
const lSt=()=>({fontSize:11,fontWeight:700,color:COLORS.textMuted,letterSpacing:'0.06em',textTransform:'uppercase',display:'block',marginBottom:6,lineHeight:1.4})

export default function CalculatorPage({ materials, accessories, commercial, setSkus, toast, prefill, clearPrefill, catDefaults }) {
  const [useGood,setUseGood]=useState(false)
  const defaultCat=prefill?.sub_category||'Wardrobes'
  const def=catDefaults[defaultCat]||catDefaults['Other']
  const [form,setForm]=useState(prefill||{name:'New Estimate',seller:'',sub_category:'Wardrobes',width_cm:120,depth_cm:60,height_cm:210,door_type:'Hinged',doors_count:2,drawers_count:0,shelves_count:4,spaces_count:2,hangers_count:1,handle_type:'Normal',has_mirror:false,mirror_count:0,body_material_id:def.body,back_material_id:def.back,door_material_id:def.door,selling_price:0})
  useEffect(()=>{if(prefill)clearPrefill()},[])
  const set=(k,v)=>setForm(p=>{const n={...p,[k]:v};if(k==='door_type')n.has_sliding_system=v==='Sliding';if(k==='sub_category'){const d=catDefaults[v]||catDefaults['Other'];n.body_material_id=d.body;n.back_material_id=d.back;n.door_material_id=d.door};return n})
  const input=skuToEngineInput(form)
  const cost=useMemo(()=>calculateSKUCost(input,materials,accessories,commercial,useGood),[form,materials,accessories,commercial,useGood])
  const m=cost?.commercial?.net_margin_percent||0,mc=m>20?COLORS.green:m>0?COLORS.amber:COLORS.red

  function Field({label,k,type='number',options,min=0}){
    if(options)return<div><label style={lSt()}>{label}</label><select value={form[k]||''} onChange={e=>set(k,e.target.value)} style={{...iSt(),cursor:'pointer'}}>{options.map(o=>typeof o==='string'?<option key={o} value={o}>{o}</option>:<option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
    if(type==='toggle')return<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 0'}}><label style={{...lSt(),marginBottom:0}}>{label}</label><Toggle value={!!form[k]} onChange={v=>set(k,v)}/></div>
    if(type==='text')return<div><label style={lSt()}>{label}</label><input type="text" value={form[k]||''} onChange={e=>set(k,e.target.value)} style={iSt()}/></div>
    return<div><label style={lSt()}>{label}</label><input type="number" value={form[k]||0} onChange={e=>set(k,Number(e.target.value))} min={min} style={iSt()}/></div>
  }

  return (
    <div style={{padding:'24px 28px',overflowY:'auto',flex:1}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div><h2 style={{fontSize:20,fontWeight:800,color:COLORS.text,letterSpacing:'-0.02em',marginBottom:4}}>Quick Calculator</h2><p style={{fontSize:13,color:COLORS.textMuted}}>Live cost estimation</p></div>
        <div style={{display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:12,color:COLORS.textMuted}}>Good Quality</span><Toggle value={useGood} onChange={setUseGood}/></div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'minmax(300px,1fr) minmax(300px,1fr)',gap:24,alignItems:'start'}}>
        <Card>
          <div style={{fontSize:14,fontWeight:700,color:COLORS.text,marginBottom:16}}>SKU Attributes</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div style={{gridColumn:'1/-1'}}><Field label="Product Name" k="name" type="text"/></div>
            <Field label="Category" k="sub_category" options={CATEGORIES}/><Field label="Door Type" k="door_type" options={DOOR_TYPES}/>
            <Field label="Width (cm)" k="width_cm"/><Field label="Depth (cm)" k="depth_cm"/>
            <Field label="Height (cm)" k="height_cm"/><Field label="No. of Doors" k="doors_count"/>
            <Field label="No. of Drawers" k="drawers_count"/><Field label="No. of Shelves" k="shelves_count"/>
            <Field label="No. of Spaces" k="spaces_count"/><Field label="No. of Hangers" k="hangers_count"/>
            <Field label="Handle Type" k="handle_type" options={HANDLE_TYPES}/><div/>
            <div style={{gridColumn:'1/-1'}}><Field label="Has Mirror" k="has_mirror" type="toggle"/></div>
            {form.has_mirror&&<Field label="Mirror Count" k="mirror_count"/>}
            <div style={{gridColumn:'1/-1',borderTop:`1px solid ${COLORS.border}`,paddingTop:12}}><Field label="Selling Price (EGP)" k="selling_price"/></div>
          </div>
          <Btn size="sm" style={{marginTop:16}} onClick={()=>{const s={...form,sku_code:`EST-${Date.now().toString(36).toUpperCase()}`};setSkus(p=>[...p,s]);toast('Saved to catalog')}}><Icon name="save" size={14}/> Save to Catalog</Btn>
        </Card>
        <div>
          {cost&&!cost.error&&<>
            <Card style={{marginBottom:16}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}><span style={{fontSize:14,fontWeight:700,color:COLORS.text}}>Cost Breakdown</span><div style={{display:'flex',alignItems:'center',gap:6}}><Icon name="zap" size={14} color={COLORS.amber}/><span style={{fontSize:11,color:COLORS.amber,fontWeight:600}}>Live</span></div></div>
              {cost.derived_partitions>0&&<div style={{fontSize:12,color:COLORS.teal,marginBottom:8,padding:'4px 8px',background:COLORS.teal+'12',borderRadius:6}}>Derived {cost.derived_partitions} partition{cost.derived_partitions>1?'s':''} from {form.spaces_count} spaces</div>}
              {[{l:'Materials (EGP)',v:cost.total_material_cost},{l:`Edge Banding ${cost.edge_banding.total_m.toFixed(1)} m (EGP)`,v:cost.edge_banding.cost},{l:'Accessories (EGP)',v:cost.accessories.total}].map(r=>(<div key={r.l} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:`1px solid ${COLORS.border}`,fontSize:13}}><span style={{color:COLORS.textDim}}>{r.l}</span><span style={{fontWeight:600,color:COLORS.text}}>{fmt(r.v)}</span></div>))}
              <div style={{display:'flex',justifyContent:'space-between',padding:'10px 0',fontWeight:700,fontSize:14,borderBottom:`1px solid ${COLORS.border}`}}><span style={{color:COLORS.text}}>COGS</span><span style={{color:COLORS.text}}>{fmt(cost.cogs)} EGP</span></div>
              <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:`1px solid ${COLORS.border}`,fontSize:13}}><span style={{color:COLORS.textDim}}>Overhead ({(cost.overhead_percent*100).toFixed(0)}%)</span><span style={{fontWeight:600,color:COLORS.text}}>{fmt(cost.overhead_amount)}</span></div>
              <div style={{display:'flex',justifyContent:'space-between',padding:'12px 0',fontWeight:800,fontSize:17}}><span style={{color:COLORS.text}}>Production Cost</span><span style={{color:COLORS.accent}}>{fmt(cost.production_cost)} EGP</span></div>
            </Card>
            {form.selling_price>0&&cost.commercial&&<Card style={{marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:700,color:COLORS.text,marginBottom:12}}>Margin Analysis</div>
              <div style={{textAlign:'center',padding:'16px 0'}}><div style={{fontSize:40,fontWeight:900,color:mc,letterSpacing:'-0.03em'}}>{fmtP(m)}</div><div style={{fontSize:12,color:COLORS.textMuted,marginTop:4}}>Net Margin</div></div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginTop:8}}><span style={{color:COLORS.textDim}}>Net Profit</span><span style={{fontWeight:700,color:mc}}>{fmt(cost.commercial.net_profit)} EGP</span></div>
              <div style={{marginTop:12,padding:'10px 12px',background:COLORS.accent+'12',borderRadius:8,border:`1px solid ${COLORS.accent}30`}}>
                <div style={{fontSize:11,fontWeight:700,color:COLORS.accent,textTransform:'uppercase',marginBottom:2}}>Recommended Selling Price</div>
                <div style={{fontSize:20,fontWeight:900,color:COLORS.accent}}>{fmt(cost.recommended_selling_price)} EGP</div>
              </div>
            </Card>}
            <Card>
              <div style={{fontSize:14,fontWeight:700,color:COLORS.text,marginBottom:12}}>Sheet Utilization</div>
              {cost.materials_breakdown.map((mb,i)=>{const u=(mb.total_area_m2/(mb.required_sheets*mb.sheet_area_m2))*100,uc=u>80?COLORS.green:u>50?COLORS.amber:COLORS.red
                return<div key={i} style={{marginBottom:i<cost.materials_breakdown.length-1?12:0}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:12}}><span style={{color:COLORS.textDim}}>{mb.material_name} — {mb.required_sheets} sheet{mb.required_sheets>1?'s':''}</span><span style={{fontWeight:600,color:uc}}>{u.toFixed(0)}%</span></div><div style={{height:6,borderRadius:3,background:COLORS.border}}><div style={{height:'100%',borderRadius:3,width:`${u}%`,background:uc,transition:'width 0.4s'}}/></div></div>})}
            </Card>
          </>}
          {cost?.error&&<Card><p style={{color:COLORS.red}}>{cost.error}</p></Card>}
        </div>
      </div>
    </div>
  )
}
