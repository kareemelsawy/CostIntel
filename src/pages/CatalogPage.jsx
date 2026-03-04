import { useState, useMemo, useRef } from 'react'
import { COLORS, CATEGORIES } from '../lib/constants'
import { fmt, fmtP } from '../lib/engine'
import { Icon, Btn, Card } from '../components/UI'

const iSt = () => ({ width:'100%', background:COLORS.inputBg, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:'8px 12px', color:COLORS.text, fontSize:13, outline:'none', lineHeight:1.5, fontFamily:'inherit' })

export default function CatalogPage({ skus, setSkus, skuCosts, setSelectedSku, setEditingSku, toast, materials, catDefaults }) {
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('All')
  const [sortBy, setSortBy] = useState('sku_code')
  const [sortDir, setSortDir] = useState('asc')
  const importRef = useRef()

  const filtered = useMemo(() => {
    let list = skus
    if (filterCat !== 'All') list = list.filter(s => s.sub_category === filterCat)
    if (search) { const q = search.toLowerCase(); list = list.filter(s => s.sku_code?.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q) || s.seller?.toLowerCase().includes(q)) }
    return [...list].sort((a, b) => {
      const ca = skuCosts[a.sku_code], cb = skuCosts[b.sku_code]
      let va, vb
      switch (sortBy) {
        case 'cost': va=ca?.production_cost||0; vb=cb?.production_cost||0; break
        case 'margin': va=ca?.commercial?.net_margin_percent||0; vb=cb?.commercial?.net_margin_percent||0; break
        case 'name': va=a.name||''; vb=b.name||''; break
        default: va=a.sku_code; vb=b.sku_code
      }
      if (typeof va==='string') return sortDir==='asc'?va.localeCompare(vb):vb.localeCompare(va)
      return sortDir==='asc'?va-vb:vb-va
    })
  }, [skus, filterCat, search, sortBy, sortDir, skuCosts])

  function toggleSort(c) { if(sortBy===c) setSortDir(d=>d==='asc'?'desc':'asc'); else { setSortBy(c); setSortDir('asc') } }
  function SH({ col, children }) {
    return <div onClick={()=>toggleSort(col)} style={{cursor:'pointer',display:'flex',alignItems:'center',gap:4,userSelect:'none'}}>{children}{sortBy===col && <Icon name={sortDir==='asc'?'arrowUp':'arrowDown'} size={12} color={COLORS.accent}/>}</div>
  }

  function exportCSV() {
    const h = 'SKU,Name,Seller,Category,W,D,H,Doors,Drawers,Shelves,Partitions,DoorType,Sliding,Mirror,BodyMat,BackMat,DoorMat,SellingPrice,ProductionCost,Margin'
    const rows = filtered.map(s => {
      const c = skuCosts[s.sku_code]
      return [s.sku_code,`"${(s.name||'').replace(/"/g,'""')}"`,`"${s.seller||''}"`,s.sub_category,s.width_cm,s.depth_cm,s.height_cm,s.doors_count,s.drawers_count,s.shelves_count,s.partitions_count,s.door_type,s.has_sliding_system,s.has_mirror,s.body_material_id,s.back_material_id,s.door_material_id,s.selling_price,c?.production_cost?.toFixed(0)||'',c?.commercial?.net_margin_percent?.toFixed(1)||''].join(',')
    })
    const blob = new Blob([[h,...rows].join('\n')], {type:'text/csv'})
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='sku_export.csv'; a.click()
    toast('CSV exported')
  }

  function handleImport(e) {
    const file = e.target.files?.[0]; if(!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const lines = ev.target.result.split('\n').filter(l=>l.trim())
        if (lines.length<2) { toast('Empty file','error'); return }
        const hdrs = lines[0].split(',').map(h=>h.trim())
        const imported = []
        for (let i=1;i<lines.length;i++) {
          // Simple CSV parse (handles quoted fields)
          const vals = []; let cur='', inQ=false
          for (const ch of lines[i]) { if(ch==='"'){inQ=!inQ} else if(ch===','&&!inQ){vals.push(cur.trim());cur=''} else cur+=ch }
          vals.push(cur.trim())
          const row = {}; hdrs.forEach((h,j)=>{row[h]=vals[j]?.replace(/^"|"$/g,'')})
          const cat = row.Category||row.sub_category||'Wardrobes'
          const def = catDefaults[cat] || catDefaults['Other']
          imported.push({
            sku_code: row.SKU||row.sku_code||`IMP-${Date.now().toString(36)}-${i}`,
            name: row.Name||row.name||'', seller: row.Seller||row.seller||'',
            sub_category: cat,
            width_cm: Number(row.W||row.width_cm)||100, depth_cm: Number(row.D||row.depth_cm)||60, height_cm: Number(row.H||row.height_cm)||210,
            door_type: row.DoorType||row.door_type||'Hinged',
            doors_count: Number(row.Doors||row.doors_count)||0, drawers_count: Number(row.Drawers||row.drawers_count)||0,
            shelves_count: Number(row.Shelves||row.shelves_count)||0, partitions_count: Number(row.Partitions||row.partitions_count)||0,
            has_sliding_system: row.Sliding==='true', has_mirror: row.Mirror==='true',
            body_material_id: row.BodyMat||row.body_material_id||def.body,
            back_material_id: row.BackMat||row.back_material_id||def.back,
            door_material_id: row.DoorMat||row.door_material_id||def.door,
            selling_price: Number(row.SellingPrice||row.selling_price)||0,
          })
        }
        setSkus(prev => [...prev, ...imported])
        toast(`Imported ${imported.length} SKUs`)
      } catch(err) { toast('Import failed: '+err.message,'error') }
    }
    reader.readAsText(file); e.target.value=''
  }

  return (
    <div style={{padding:'24px 28px',overflowY:'auto',flex:1}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:10}}>
        <div>
          <h2 style={{fontSize:20,fontWeight:800,color:COLORS.text,letterSpacing:'-0.02em',marginBottom:4}}>SKU Catalog</h2>
          <p style={{fontSize:13,color:COLORS.textMuted}}>{filtered.length} of {skus.length} items · Click any row for full cost report</p>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <input type="file" ref={importRef} accept=".csv" onChange={handleImport} style={{display:'none'}} />
          <Btn variant="secondary" size="sm" onClick={()=>importRef.current?.click()}><Icon name="upload" size={14}/> Mass Upload CSV</Btn>
          <Btn variant="secondary" size="sm" onClick={exportCSV}><Icon name="download" size={14}/> Export CSV</Btn>
          <Btn size="sm" onClick={()=>{
            const def = catDefaults['Wardrobes']
            setEditingSku({sku_code:'',name:'',seller:'',sub_category:'Wardrobes',width_cm:100,depth_cm:60,height_cm:210,door_type:'Hinged',doors_count:2,drawers_count:0,shelves_count:4,partitions_count:1,has_sliding_system:false,has_mirror:false,body_material_id:def.body,back_material_id:def.back,door_material_id:def.door,selling_price:0,_isNew:true})
          }}><Icon name="plus" size={14}/> Add SKU</Btn>
        </div>
      </div>

      <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
        <div style={{position:'relative',flex:1,minWidth:200}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search SKU, name, or seller..." style={{...iSt(),paddingLeft:34}} />
          <div style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}><Icon name="search" size={14} color={COLORS.textMuted}/></div>
        </div>
        <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{...iSt(),width:'auto',minWidth:150,cursor:'pointer'}}>
          <option value="All">All Categories</option>
          {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <Card style={{padding:0,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead>
              <tr style={{borderBottom:`1px solid ${COLORS.border}`}}>
                {[{c:'sku_code',l:'SKU ID'},{c:'name',l:'Name'},{c:'sub_category',l:'Category'},{c:'_dims',l:'W×D×H'},{c:'cost',l:'Prod. Cost'},{c:'_sp',l:'Sell Price'},{c:'margin',l:'Margin'},{c:'_act',l:''}].map(h=>(
                  <th key={h.c} style={{padding:'12px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:COLORS.textMuted,letterSpacing:'0.06em',textTransform:'uppercase',whiteSpace:'nowrap'}}>
                    {!h.c.startsWith('_') ? <SH col={h.c}>{h.l}</SH> : h.l}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const c = skuCosts[s.sku_code], m = c?.commercial?.net_margin_percent||0
                const mc = m>20?COLORS.green:m>0?COLORS.amber:COLORS.red
                return (
                  <tr key={s.sku_code} onClick={()=>setSelectedSku(s)} style={{borderBottom:`1px solid ${COLORS.border}`,cursor:'pointer',transition:'background 0.1s'}}
                    onMouseEnter={e=>e.currentTarget.style.background=COLORS.surfaceHover} onMouseLeave={e=>e.currentTarget.style.background=''}>
                    <td style={{padding:'10px 14px',fontWeight:600,color:COLORS.accent,fontSize:12,fontFamily:'monospace'}}>{s.sku_code}</td>
                    <td style={{padding:'10px 14px',color:COLORS.text,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.name}</td>
                    <td style={{padding:'10px 14px'}}><span style={{background:COLORS.purple+'18',color:COLORS.purple,padding:'2px 8px',borderRadius:4,fontSize:11,fontWeight:600}}>{s.sub_category}</span></td>
                    <td style={{padding:'10px 14px',color:COLORS.textDim,fontSize:12,fontFamily:'monospace'}}>{s.width_cm}×{s.depth_cm}×{s.height_cm}</td>
                    <td style={{padding:'10px 14px',fontWeight:700,color:COLORS.text}}>{c?fmt(c.production_cost):'—'}</td>
                    <td style={{padding:'10px 14px',color:COLORS.textDim}}>{s.selling_price?fmt(s.selling_price):'—'}</td>
                    <td style={{padding:'10px 14px'}}><span style={{color:mc,fontWeight:700}}>{c?.commercial?fmtP(m):'—'}</span></td>
                    <td style={{padding:'10px 14px'}}>
                      <div style={{display:'flex',gap:4}}>
                        <button onClick={e=>{e.stopPropagation();setEditingSku({...s})}} style={{background:'none',border:'none',cursor:'pointer',padding:4,color:COLORS.textMuted}}><Icon name="edit" size={14}/></button>
                        <button onClick={e=>{e.stopPropagation();setSkus(p=>p.filter(x=>x.sku_code!==s.sku_code));toast('SKU removed')}} style={{background:'none',border:'none',cursor:'pointer',padding:4,color:COLORS.textMuted}}><Icon name="trash" size={14}/></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filtered.length===0 && <div style={{padding:40,textAlign:'center',color:COLORS.textMuted}}>No SKUs match your filters</div>}
      </Card>
    </div>
  )
}
