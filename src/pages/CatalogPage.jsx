import { useState, useMemo, useRef } from 'react'
import { COLORS, CATEGORIES, DOOR_TYPES, CSV_COLUMNS } from '../lib/constants'
import { fmt, fmtP, csvRowToSku, skuToCsvRow } from '../lib/engine'
import { Icon, Btn, Card } from '../components/UI'

const iSt=()=>({width:'100%',background:COLORS.inputBg,border:`1px solid ${COLORS.border}`,borderRadius:8,padding:'8px 12px',color:COLORS.text,fontSize:13,outline:'none',lineHeight:1.5,fontFamily:'inherit'})

export default function CatalogPage({ skus, setSkus, skuCosts, setSelectedSku, setEditingSku, toast, catDefaults, onDeleteSkus, onSyncSkus }) {
  const [search,setSearch]=useState('')
  const [filterCat,setFilterCat]=useState('All')
  const [filterDoor,setFilterDoor]=useState('All')
  const [filterSeller,setFilterSeller]=useState('All')
  const [filterMargin,setFilterMargin]=useState('All')
  const [sortBy,setSortBy]=useState('sku_code')
  const [sortDir,setSortDir]=useState('asc')
  const [showFilters,setShowFilters]=useState(false)
  const [selectedCodes,setSelectedCodes]=useState(new Set())
  const [confirmDelete,setConfirmDelete]=useState(false)
  const importRef=useRef()

  const sellers = useMemo(()=>[...new Set(skus.map(s=>s.seller).filter(Boolean))].sort(),[skus])

  const filtered = useMemo(() => {
    let list = skus
    if (filterCat!=='All') list=list.filter(s=>s.sub_category===filterCat)
    if (filterDoor!=='All') list=list.filter(s=>s.door_type===filterDoor)
    if (filterSeller!=='All') list=list.filter(s=>s.seller===filterSeller)
    if (filterMargin==='positive') list=list.filter(s=>(skuCosts[s.sku_code]?.commercial?.net_margin_percent||0)>0)
    if (filterMargin==='negative') list=list.filter(s=>(skuCosts[s.sku_code]?.commercial?.net_margin_percent||0)<=0)
    if (search) { const q=search.toLowerCase(); list=list.filter(s=>s.sku_code?.toLowerCase().includes(q)||s.name?.toLowerCase().includes(q)||s.seller?.toLowerCase().includes(q)) }
    return [...list].sort((a,b)=>{
      const ca=skuCosts[a.sku_code],cb=skuCosts[b.sku_code]; let va,vb
      switch(sortBy){case 'cost':va=ca?.cogs||0;vb=cb?.cogs||0;break;case 'margin':va=ca?.commercial?.net_margin_percent||0;vb=cb?.commercial?.net_margin_percent||0;break;case 'name':va=a.name||'';vb=b.name||'';break;default:va=a.sku_code;vb=b.sku_code}
      if(typeof va==='string') return sortDir==='asc'?va.localeCompare(vb):vb.localeCompare(va)
      return sortDir==='asc'?va-vb:vb-va
    })
  },[skus,filterCat,filterDoor,filterSeller,filterMargin,search,sortBy,sortDir,skuCosts])

  const activeFilters = [filterCat,filterDoor,filterSeller,filterMargin].filter(f=>f!=='All').length
  const toggleSort=(c)=>{if(sortBy===c)setSortDir(d=>d==='asc'?'desc':'asc');else{setSortBy(c);setSortDir('asc')}}
  const SH=({col,children})=><div onClick={()=>toggleSort(col)} style={{cursor:'pointer',display:'flex',alignItems:'center',gap:4,userSelect:'none'}}>{children}{sortBy===col&&<Icon name={sortDir==='asc'?'arrowUp':'arrowDown'} size={12} color={COLORS.accent}/>}</div>

  // Selection helpers
  const allFilteredSelected = filtered.length > 0 && filtered.every(s => selectedCodes.has(s.sku_code))
  const someSelected = selectedCodes.size > 0
  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedCodes(prev => { const n = new Set(prev); filtered.forEach(s => n.delete(s.sku_code)); return n })
    } else {
      setSelectedCodes(prev => { const n = new Set(prev); filtered.forEach(s => n.add(s.sku_code)); return n })
    }
  }
  function toggleSelectOne(code) {
    setSelectedCodes(prev => { const n = new Set(prev); n.has(code) ? n.delete(code) : n.add(code); return n })
  }
  function handleMassDelete() {
    const codes = [...selectedCodes]
    setSkus(p => p.filter(s => !selectedCodes.has(s.sku_code)))
    onDeleteSkus?.(codes)
    toast(`Deleted ${codes.length} SKU${codes.length > 1 ? 's' : ''}`)
    setSelectedCodes(new Set())
    setConfirmDelete(false)
  }

  function exportCSV(){const rows=filtered.map(s=>skuToCsvRow(s));const blob=new Blob([CSV_COLUMNS.join(',')+'\\n'+rows.join('\\n')],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='sku_catalog_export.csv';a.click();toast('CSV exported')}
  function downloadTemplate(){const blob=new Blob([CSV_COLUMNS.join(',')+'\\n'],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='sku_upload_template.csv';a.click();toast('Template downloaded')}
  function handleImport(e){
    const file=e.target.files?.[0];if(!file)return;const reader=new FileReader()
    reader.onload=(ev)=>{try{
      // Strip BOM, normalise CRLF → LF, split
      const raw=ev.target.result.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').replace(/\r/g,'\n')
      const lines=raw.split('\n').filter(l=>l.trim())
      if(lines.length<2){toast('Empty file — no data rows found','error');return}
      const hdrs=lines[0].split(',').map(h=>h.trim())
      const imported=[]
      for(let i=1;i<lines.length;i++){
        const vals=[];let cur='',inQ=false
        for(const ch of lines[i]){if(ch==='"'){inQ=!inQ}else if(ch===','&&!inQ){vals.push(cur.trim());cur=''}else cur+=ch}
        vals.push(cur.trim())
        const row={};hdrs.forEach((h,j)=>{row[h]=vals[j]?.replace(/^"|"$/g,'').replace(/#N\/A/g,'').trim()})
        if(!row['SKU']&&!row['Product name'])continue
        imported.push(csvRowToSku(row,catDefaults))
      }
      if(imported.length===0){toast('No valid SKU rows found in file','error');return}
      setSkus(prev=>{const existing=new Set(prev.map(s=>s.sku_code));const newOnes=imported.filter(s=>!existing.has(s.sku_code));const updated=imported.filter(s=>existing.has(s.sku_code));const merged=prev.map(s=>{const u=updated.find(x=>x.sku_code===s.sku_code);return u||s});const result=[...merged,...newOnes];toast(`Imported ${newOnes.length} new, updated ${updated.length} SKUs`);onSyncSkus?.(result);return result})
    }catch(err){toast('Import failed: '+err.message,'error')}};reader.readAsText(file,{encoding:'utf-8'});e.target.value=''
  }

  const cbStyle = { width: 15, height: 15, cursor: 'pointer', accentColor: COLORS.accent }

  return (
    <div style={{padding:'24px 28px',overflowY:'auto',flex:1}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:10}}>
        <div>
          <h2 style={{fontSize:20,fontWeight:800,color:COLORS.text,letterSpacing:'-0.02em',marginBottom:4}}>SKU Catalog</h2>
          <p style={{fontSize:13,color:COLORS.textMuted}}>{filtered.length} of {skus.length} items · Click row for cost report</p>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <input type="file" ref={importRef} accept=".csv" onChange={handleImport} style={{display:'none'}}/>
          <Btn variant="secondary" size="sm" onClick={downloadTemplate}><Icon name="fileText" size={14}/> Template</Btn>
          <Btn variant="secondary" size="sm" onClick={()=>importRef.current?.click()}><Icon name="upload" size={14}/> Upload CSV</Btn>
          <Btn variant="secondary" size="sm" onClick={exportCSV}><Icon name="download" size={14}/> Export</Btn>
          <Btn size="sm" onClick={()=>{const def=catDefaults['Wardrobes'];setEditingSku({sku_code:'',name:'',image_link:'',seller:'',sub_category:'Wardrobes',commercial_material:'MDF',width_cm:100,depth_cm:60,height_cm:210,door_type:'Hinged',doors_count:2,drawers_count:0,shelves_count:4,spaces_count:2,hangers_count:1,internal_division:'NO',unit_type:'Floor Standing',has_mirror:false,mirror_count:0,primary_color:'',handle_type:'Normal',has_back_panel:'Close',body_material_id:def.body,back_material_id:def.back,door_material_id:def.door,selling_price:0,_isNew:true})}}><Icon name="plus" size={14}/> Add SKU</Btn>
        </div>
      </div>

      {/* Mass delete bar */}
      {someSelected && (
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'10px 16px',marginBottom:12,background:COLORS.red+'18',border:`1px solid ${COLORS.red}44`,borderRadius:10}}>
          <span style={{fontSize:13,fontWeight:600,color:COLORS.red}}>{selectedCodes.size} SKU{selectedCodes.size>1?'s':''} selected</span>
          <div style={{flex:1}}/>
          <Btn variant="ghost" size="sm" onClick={()=>setSelectedCodes(new Set())} style={{color:COLORS.textMuted}}>Deselect all</Btn>
          {!confirmDelete
            ? <Btn size="sm" onClick={()=>setConfirmDelete(true)} style={{background:COLORS.red,borderColor:COLORS.red,color:'#fff'}}><Icon name="trash" size={14}/> Delete {selectedCodes.size} SKU{selectedCodes.size>1?'s':''}</Btn>
            : <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:12,color:COLORS.red,fontWeight:600}}>Confirm delete {selectedCodes.size} SKUs?</span>
                <Btn size="sm" onClick={handleMassDelete} style={{background:COLORS.red,borderColor:COLORS.red,color:'#fff'}}>Yes, delete</Btn>
                <Btn variant="ghost" size="sm" onClick={()=>setConfirmDelete(false)}>Cancel</Btn>
              </div>
          }
        </div>
      )}

      <div style={{display:'flex',gap:10,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
        <div style={{position:'relative',flex:1,minWidth:200}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search SKU, name, seller..." style={{...iSt(),paddingLeft:34}}/>
          <div style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}><Icon name="search" size={14} color={COLORS.textMuted}/></div>
        </div>
        <Btn variant={showFilters?'primary':'secondary'} size="sm" onClick={()=>setShowFilters(!showFilters)}>
          <Icon name="filter" size={14}/> Filters{activeFilters>0&&` (${activeFilters})`}
        </Btn>
      </div>
      {showFilters&&<div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap',padding:'12px 14px',background:COLORS.surface,borderRadius:10,border:`1px solid ${COLORS.border}`}}>
        <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{...iSt(),width:'auto',minWidth:130,cursor:'pointer'}}><option value="All">All Categories</option>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select>
        <select value={filterDoor} onChange={e=>setFilterDoor(e.target.value)} style={{...iSt(),width:'auto',minWidth:110,cursor:'pointer'}}><option value="All">All Door Types</option>{DOOR_TYPES.map(d=><option key={d} value={d}>{d}</option>)}</select>
        <select value={filterSeller} onChange={e=>setFilterSeller(e.target.value)} style={{...iSt(),width:'auto',minWidth:120,cursor:'pointer'}}><option value="All">All Sellers</option>{sellers.map(s=><option key={s} value={s}>{s}</option>)}</select>
        <select value={filterMargin} onChange={e=>setFilterMargin(e.target.value)} style={{...iSt(),width:'auto',minWidth:120,cursor:'pointer'}}><option value="All">All Margins</option><option value="positive">Positive</option><option value="negative">Negative / Zero</option></select>
        {activeFilters>0&&<Btn variant="ghost" size="sm" onClick={()=>{setFilterCat('All');setFilterDoor('All');setFilterSeller('All');setFilterMargin('All')}}>Clear all</Btn>}
      </div>}
      <Card style={{padding:0,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead><tr style={{borderBottom:`1px solid ${COLORS.border}`}}>
              <th style={{padding:'10px 12px',width:36}}>
                <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAll} style={cbStyle} title="Select all visible"/>
              </th>
              {[{c:'_img',l:''},{c:'sku_code',l:'SKU'},{c:'name',l:'Name'},{c:'sub_category',l:'Category'},{c:'_dims',l:'W×D×H (cm)'},{c:'cost',l:'COGS (EGP)'},{c:'_rec',l:'Rec. Price'},{c:'_cur',l:'Current Price'},{c:'_var',l:'Variance'},{c:'margin',l:'Margin %'},{c:'_act',l:''}].map(h=>(
                <th key={h.c} style={{padding:'10px 12px',textAlign:'left',fontSize:11,fontWeight:700,color:COLORS.textMuted,letterSpacing:'0.06em',textTransform:'uppercase',whiteSpace:'nowrap'}}>{!h.c.startsWith('_')?<SH col={h.c}>{h.l}</SH>:h.l}</th>
              ))}
            </tr></thead>
            <tbody>{filtered.map(s=>{
              const c=skuCosts[s.sku_code],m=c?.commercial?.net_margin_percent||0,mc=m>20?COLORS.green:m>0?COLORS.amber:COLORS.red
              const isSelected = selectedCodes.has(s.sku_code)
              return <tr key={s.sku_code} style={{borderBottom:`1px solid ${COLORS.border}`,cursor:'pointer',transition:'background 0.1s',background:isSelected?COLORS.accent+'12':''}} onMouseEnter={e=>{if(!isSelected)e.currentTarget.style.background=COLORS.surfaceHover}} onMouseLeave={e=>{e.currentTarget.style.background=isSelected?COLORS.accent+'12':''}}>
                <td style={{padding:'6px 12px',width:36}} onClick={e=>e.stopPropagation()}>
                  <input type="checkbox" checked={isSelected} onChange={()=>toggleSelectOne(s.sku_code)} style={cbStyle}/>
                </td>
                <td style={{padding:'6px 12px',width:44}} onClick={()=>setSelectedSku(s)}>{s.image_link?<img src={s.image_link} alt="" style={{width:36,height:36,objectFit:'cover',borderRadius:6,background:COLORS.bg}} onError={e=>{e.target.style.display='none'}}/>:<div style={{width:36,height:36,borderRadius:6,background:COLORS.bg,display:'flex',alignItems:'center',justifyContent:'center'}}><Icon name="box" size={14} color={COLORS.textMuted}/></div>}</td>
                <td style={{padding:'8px 12px',fontWeight:600,color:COLORS.accent,fontSize:11,fontFamily:'monospace'}} onClick={()=>setSelectedSku(s)}>{s.sku_code}</td>
                <td style={{padding:'8px 12px',color:COLORS.text,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} onClick={()=>setSelectedSku(s)}>{s.name}</td>
                <td style={{padding:'8px 12px'}} onClick={()=>setSelectedSku(s)}><span style={{background:COLORS.purple+'18',color:COLORS.purple,padding:'2px 8px',borderRadius:4,fontSize:11,fontWeight:600}}>{s.sub_category}</span></td>
                <td style={{padding:'8px 12px',color:COLORS.textDim,fontSize:12,fontFamily:'monospace'}} onClick={()=>setSelectedSku(s)}>{s.width_cm}×{s.depth_cm}×{s.height_cm}</td>
                <td style={{padding:'8px 12px',fontWeight:700,color:COLORS.text}} onClick={()=>setSelectedSku(s)}>{c?fmt(c.cogs):'—'}</td>
                <td style={{padding:'8px 12px'}} onClick={()=>setSelectedSku(s)}><span style={{color:COLORS.accent,fontWeight:700}}>{c?fmt(c.recommended_selling_price):'—'}</span></td>
                <td style={{padding:'8px 12px',color:COLORS.textDim}} onClick={()=>setSelectedSku(s)}>{s.selling_price?fmt(s.selling_price):'—'}</td>
                <td style={{padding:'8px 12px'}} onClick={()=>setSelectedSku(s)}>{(()=>{
                  if(!c||!s.selling_price)return<span style={{color:COLORS.textMuted}}>—</span>
                  const variance=s.selling_price-c.recommended_selling_price
                  const pct=(variance/c.recommended_selling_price*100).toFixed(1)
                  const isPos=variance>0
                  return<span style={{color:isPos?COLORS.green:COLORS.red,fontWeight:700,fontSize:12}}>{isPos?'+':''}{fmt(variance)}<span style={{fontSize:10,fontWeight:400,marginLeft:3}}>({isPos?'+':''}{pct}%)</span></span>
                })()}</td>
                <td style={{padding:'8px 12px'}} onClick={()=>setSelectedSku(s)}><span style={{color:mc,fontWeight:700}}>{c?.commercial?fmtP(m):'—'}</span></td>
                <td style={{padding:'8px 12px'}}><div style={{display:'flex',gap:4}}>
                  <button onClick={e=>{e.stopPropagation();setEditingSku({...s})}} style={{background:'none',border:'none',cursor:'pointer',padding:4,color:COLORS.textMuted}}><Icon name="edit" size={14}/></button>
                  <button onClick={e=>{e.stopPropagation();setSkus(p=>p.filter(x=>x.sku_code!==s.sku_code));onDeleteSkus?.([s.sku_code]);toast('Removed')}} style={{background:'none',border:'none',cursor:'pointer',padding:4,color:COLORS.textMuted}}><Icon name="trash" size={14}/></button>
                </div></td>
              </tr>
            })}</tbody>
          </table>
        </div>
        {filtered.length===0&&<div style={{padding:40,textAlign:'center',color:COLORS.textMuted}}>No SKUs match</div>}
      </Card>
    </div>
  )
}
