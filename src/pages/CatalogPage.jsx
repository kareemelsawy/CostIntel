import { useState, useMemo, useRef, useEffect } from 'react'
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
  const [importProgress, setImportProgress] = useState(null) // {phase,current,total,label}
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
    if (filterMargin==='underpriced') list=list.filter(s=>{const c=skuCosts[s.sku_code];if(!c||!s.selling_price||!c.recommended_selling_price)return false;return(s.selling_price-c.recommended_selling_price)/c.recommended_selling_price<-0.05})
    if (filterMargin==='correct') list=list.filter(s=>{const c=skuCosts[s.sku_code];if(!c||!s.selling_price||!c.recommended_selling_price)return false;const p=(s.selling_price-c.recommended_selling_price)/c.recommended_selling_price;return p>=-0.05&&p<=0.05})
    if (filterMargin==='overpriced') list=list.filter(s=>{const c=skuCosts[s.sku_code];if(!c||!s.selling_price||!c.recommended_selling_price)return false;return(s.selling_price-c.recommended_selling_price)/c.recommended_selling_price>0.05})
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

  function exportCSV(){
    // Extended headers: original attributes + calculated waterfall columns
    const calcHeaders = ['COGS (EGP)','Production Cost (EGP)','Recommended Price (EGP)','Seller Margin (EGP)','Homzmart Margin (EGP)','VAT (EGP)','Net Profit (EGP)','Net Margin %','Variance (EGP)','Variance %','Pricing Status']
    const allHeaders = [...CSV_COLUMNS, ...calcHeaders]
    const rows = filtered.map(s => {
      const base = skuToCsvRow(s)
      const c = skuCosts[s.sku_code]
      if (!c || c.error) return base + ',' + calcHeaders.map(() => '').join(',')
      const sp = s.selling_price || 0
      const recSP = c.recommended_selling_price || 0
      const variance = sp > 0 && recSP > 0 ? sp - recSP : ''
      const variancePct = sp > 0 && recSP > 0 ? (((sp - recSP) / recSP) * 100).toFixed(1) : ''
      const status = !sp || !recSP ? 'Unpriced' : (sp - recSP) / recSP < -0.05 ? 'Underpriced' : (sp - recSP) / recSP > 0.05 ? 'Overpriced' : 'Correctly Priced'
      const cm = c.commercial
      return base + ',' + [
        (c.cogs||0).toFixed(0),
        (c.production_cost||0).toFixed(0),
        (recSP||0).toFixed(0),
        (cm?.seller_margin||0).toFixed(0),
        (cm?.homzmart_margin||0).toFixed(0),
        (cm?.vat||0).toFixed(0),
        (cm?.net_profit||0).toFixed(0),
        cm?.net_margin_percent!=null ? cm.net_margin_percent.toFixed(1) : '',
        variance !== '' ? variance.toFixed(0) : '',
        variancePct,
        status,
      ].join(',')
    })
    const csvContent = allHeaders.join(',') + '\n' + rows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'sku_catalog_export.csv'
    a.click()
    toast('CSV exported with ' + filtered.length + ' SKUs')
  }
  function downloadTemplate(){
    const blob = new Blob([CSV_COLUMNS.join(',') + '\n'], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'sku_upload_template.csv'
    a.click()
    toast('Template downloaded')
  }
  // ── Robust CSV parser — handles quoted newlines, escaped quotes, BOM ──────
  function parseCSV(text) {
    const rows = []
    let cur = [], field = '', inQ = false, i = 0
    while (i < text.length) {
      const ch = text[i]
      if (inQ) {
        if (ch === '"') {
          if (i + 1 < text.length && text[i + 1] === '"') {
            field += '"'; i += 2 // escaped quote ""
          } else {
            inQ = false; i++ // end of quoted field
          }
        } else {
          field += ch; i++
        }
      } else {
        if (ch === '"') { inQ = true; i++ }
        else if (ch === ',') { cur.push(field.trim()); field = ''; i++ }
        else if (ch === '\n' || ch === '\r') {
          cur.push(field.trim()); field = ''
          if (ch === '\r' && i + 1 < text.length && text[i + 1] === '\n') i++ // skip \r\n
          if (cur.length > 1 || cur[0] !== '') rows.push(cur)
          cur = []; i++
        } else {
          field += ch; i++
        }
      }
    }
    // Last field/row
    cur.push(field.trim())
    if (cur.length > 1 || cur[0] !== '') rows.push(cur)
    return rows
  }

  function handleImport(e){
    const file=e.target.files?.[0]
    if(e.target) e.target.value=''
    if(!file)return
    setImportProgress({phase:'reading',current:0,total:0,label:'Reading file…'})
    const reader=new FileReader()
    reader.onerror=()=>{setImportProgress(null);toast('Failed to read file','error')}
    reader.onload=async(ev)=>{
      try{
        const raw=ev.target.result.replace(/^\uFEFF/,'') // strip BOM
        setImportProgress({phase:'parsing',current:0,total:0,label:'Parsing CSV…'})
        await new Promise(r=>setTimeout(r,50))

        const allRows = parseCSV(raw)
        if(allRows.length<2){setImportProgress(null);toast('Empty file — no data rows found','error');return}

        const hdrs = allRows[0].map(h => h.replace(/^"|"$/g,'').trim())
        const dataRows = allRows.slice(1)
        const total = dataRows.length

        // ── Header validation ──
        const requiredHeaders = ['SKU', 'Width (cm)', 'Depth (cm)', 'Height (cm)']
        const missingRequired = requiredHeaders.filter(h => !hdrs.includes(h))
        if (missingRequired.length > 0) {
          setImportProgress(null)
          toast(`Missing required columns: ${missingRequired.join(', ')}. Check your CSV headers.`, 'error')
          return
        }
        // Check for known headers to warn about unmapped columns
        const knownHeaders = new Set(CSV_COLUMNS)
        const unmappedHeaders = hdrs.filter(h => h && !knownHeaders.has(h))

        setImportProgress({phase:'parsing',current:0,total,label:`Parsing ${total.toLocaleString()} rows…`})
        await new Promise(r=>setTimeout(r,0))

        const CHUNK=500
        const imported=[]
        const warnings=[] // { rowNum, sku, issues[] }
        let skippedEmpty = 0

        for(let i=0;i<dataRows.length;i+=CHUNK){
          const end=Math.min(i+CHUNK,dataRows.length)
          for(let j=i;j<end;j++){
            const vals = dataRows[j]
            const row = {}
            hdrs.forEach((h,k)=>{
              row[h] = (vals[k] || '').replace(/^"|"$/g,'').replace(/#N\/A/gi,'').trim()
            })

            // Skip completely empty rows
            if(!row['SKU'] && !row['Product name']) { skippedEmpty++; continue }

            // Per-row validation
            const rowIssues = []
            const skuCode = row['SKU'] || ''
            if (!skuCode) rowIssues.push('Missing SKU code')

            // Numeric field validation
            const numFields = [
              { key: 'Width (cm)', label: 'Width', min: 0, max: 1000 },
              { key: 'Depth (cm)', label: 'Depth', min: 0, max: 200 },
              { key: 'Height (cm)', label: 'Height', min: 0, max: 500 },
              { key: 'No. of Doors', label: 'Doors', min: 0, max: 20 },
              { key: 'No. of Drawers', label: 'Drawers', min: 0, max: 20 },
              { key: 'No. of Shelves', label: 'Shelves', min: 0, max: 50 },
              { key: 'No. of Spaces', label: 'Spaces', min: 0, max: 20 },
              { key: 'No. of Hangers', label: 'Hangers', min: 0, max: 20 },
              { key: 'Selling Price', label: 'Price', min: 0, max: 9999999 },
            ]
            numFields.forEach(nf => {
              const rawVal = row[nf.key]
              if (rawVal !== undefined && rawVal !== '') {
                const num = Number(rawVal)
                if (isNaN(num)) rowIssues.push(`${nf.label}: "${rawVal}" is not a number`)
                else if (num < nf.min) rowIssues.push(`${nf.label}: ${num} below minimum (${nf.min})`)
                else if (num > nf.max) rowIssues.push(`${nf.label}: ${num} above maximum (${nf.max})`)
              }
            })

            // Enum validation (case-insensitive — csvRowToSku normalizes these)
            const rawDoor = (row['Door Type']||'').trim().toLowerCase()
            if (rawDoor && !['hinged','sliding','open'].includes(rawDoor)) {
              rowIssues.push(`Door Type: "${row['Door Type']}" invalid (expected Hinged/Sliding/Open)`)
            }
            const rawHandle = (row['Handle Type']||'').trim().toLowerCase()
            if (rawHandle && !['normal','handleless','hidden'].includes(rawHandle)) {
              rowIssues.push(`Handle Type: "${row['Handle Type']}" invalid (expected Normal/Handleless/Hidden)`)
            }

            // Warn on zero dimensions (not an error — row still imports)
            const w = Number(row['Width (cm)'])||0, d = Number(row['Depth (cm)'])||0, h = Number(row['Height (cm)'])||0
            if (w === 0 || d === 0 || h === 0) {
              rowIssues.push('Missing or zero dimensions — cost calculation will fail')
            }

            if (rowIssues.length > 0) {
              warnings.push({ rowNum: j + 2, sku: skuCode || `Row ${j+2}`, issues: rowIssues })
            }

            // Only skip if critical fields are truly broken (non-numeric text in dimension fields)
            const rawW = row['Width (cm)'], rawD = row['Depth (cm)'], rawH = row['Height (cm)']
            if ((rawW && isNaN(Number(rawW))) || (rawD && isNaN(Number(rawD))) || (rawH && isNaN(Number(rawH)))) {
              continue // skip rows with unparseable dimensions
            }

            imported.push(csvRowToSku(row, catDefaults))
          }
          const done=Math.min(i+CHUNK,total)
          setImportProgress({phase:'parsing',current:done,total,label:`Parsed ${done.toLocaleString()} of ${total.toLocaleString()} rows`})
          await new Promise(r=>setTimeout(r,0))
        }

        if(imported.length===0){setImportProgress(null);toast('No valid SKU rows found in file','error');return}

        // Yield so the 100% progress bar renders before we move to next phase
        setImportProgress({phase:'parsing',current:total,total,label:`Parsed ${total.toLocaleString()} rows — checking duplicates…`})
        await new Promise(r=>setTimeout(r,100))

        // Check for duplicates
        const existing=new Set(skus.map(s=>s.sku_code))
        const newSkus=imported.filter(s=>!existing.has(s.sku_code))
        const dupeSkus=imported.filter(s=>existing.has(s.sku_code))

        const importMeta = { warnings, skippedEmpty, unmappedHeaders, totalParsed: imported.length }

        if(dupeSkus.length>0 && newSkus.length===0){
          setImportProgress({
            phase:'duplicates', current:imported.length, total:imported.length,
            label:`All ${dupeSkus.length} SKUs already exist in catalog.`,
            dupeCount:dupeSkus.length, newCount:0, imported, newSkus, dupeSkus, ...importMeta,
          })
        } else if(dupeSkus.length>0){
          setImportProgress({
            phase:'duplicates', current:imported.length, total:imported.length,
            label:`${newSkus.length} new + ${dupeSkus.length} already exist.`,
            dupeCount:dupeSkus.length, newCount:newSkus.length, imported, newSkus, dupeSkus, ...importMeta,
          })
        } else {
          // All new — yield then finish
          await new Promise(r=>setTimeout(r,50))
          finishImport(newSkus, [], 'add', importMeta)
        }
      }catch(err){setImportProgress(null);toast('Import failed: '+err.message,'error')}
    }
    reader.readAsText(file,'utf-8')
  }

  function finishImport(newSkus, dupeSkus, mode, meta) {
    setSkus(prev => {
      let result
      if (mode === 'add') {
        result = [...prev, ...newSkus]
      } else if (mode === 'merge') {
        const dupeMap = {}
        dupeSkus.forEach(s => { dupeMap[s.sku_code] = s })
        result = prev.map(s => dupeMap[s.sku_code] ? { ...s, ...dupeMap[s.sku_code] } : s)
        result = [...result, ...newSkus]
      } else {
        const dupeMap = {}
        dupeSkus.forEach(s => { dupeMap[s.sku_code] = s })
        result = prev.map(s => dupeMap[s.sku_code] ? { ...s, ...dupeMap[s.sku_code] } : s)
      }
      onSyncSkus?.(result)
      return result
    })

    const totalAffected = newSkus.length + (mode !== 'add' ? dupeSkus.length : 0)
    const summary = []
    if (newSkus.length > 0) summary.push(`${newSkus.length} added`)
    if (dupeSkus.length > 0 && mode !== 'add') summary.push(`${dupeSkus.length} updated`)
    if (dupeSkus.length > 0 && mode === 'add') summary.push(`${dupeSkus.length} skipped`)

    setImportProgress({
      phase: 'done', current: totalAffected, total: totalAffected,
      label: summary.join(', '),
      newCount: newSkus.length, dupeCount: mode !== 'add' ? dupeSkus.length : 0,
      ...(meta || {}),
    })
    toast(`✓ Import complete: ${summary.join(', ')}`)
  }

  function downloadIssuesCSV(warnings) {
    if (!warnings || warnings.length === 0) return
    const issueHeaders = [...CSV_COLUMNS, 'Issues']
    // Build rows: for each warning, find the SKU in the current skus list and export it with its issues
    const rows = warnings.map(w => {
      const sku = skus.find(s => s.sku_code === w.sku) || { sku_code: w.sku }
      const base = skuToCsvRow(sku)
      const issueText = `"${w.issues.join('; ').replace(/"/g, '""')}"`
      return base + ',' + issueText
    })
    const csvContent = issueHeaders.join(',') + '\n' + rows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'skus_with_issues.csv'
    a.click()
    toast(`Downloaded ${warnings.length} SKUs with issues`)
  }

  const cbStyle = { width: 15, height: 15, cursor: 'pointer', accentColor: COLORS.accent }

  return (
    <div style={{padding:'24px 28px',overflowY:'auto',flex:1,position:'relative'}}>
      {importProgress && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.6)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'}}>
          <div style={{background:COLORS.surface,borderRadius:16,padding:'28px 36px',width:420,boxShadow:'0 20px 60px rgba(0,0,0,0.5)',border:`1px solid ${COLORS.border}`}}>

            {/* READING / PARSING */}
            {(importProgress.phase==='reading'||importProgress.phase==='parsing') && (<>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                <div style={{width:24,height:24,border:`3px solid ${COLORS.accent}`,borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
                <div style={{fontSize:15,fontWeight:700,color:COLORS.text}}>Uploading SKUs…</div>
              </div>
              <div style={{fontSize:12,color:COLORS.textMuted,marginBottom:16}}>{importProgress.label}</div>
              {importProgress.total>0 && (
                <>
                  <div style={{background:COLORS.bg,borderRadius:999,height:8,overflow:'hidden',marginBottom:6}}>
                    <div style={{height:'100%',borderRadius:999,background:COLORS.accent,width:`${Math.round((importProgress.current/importProgress.total)*100)}%`,transition:'width 0.2s'}}/>
                  </div>
                  <div style={{fontSize:11,color:COLORS.textMuted,textAlign:'right'}}>{Math.round((importProgress.current/importProgress.total)*100)}%</div>
                </>
              )}
            </>)}

            {/* DUPLICATES — ask user what to do */}
            {importProgress.phase==='duplicates' && (<>
              <div style={{fontSize:15,fontWeight:700,color:COLORS.amber,marginBottom:8}}>⚠ Duplicate SKUs Found</div>
              <div style={{fontSize:13,color:COLORS.text,marginBottom:6,lineHeight:1.6}}>{importProgress.label}</div>
              <div style={{fontSize:12,color:COLORS.textMuted,marginBottom:12,lineHeight:1.5}}>
                {importProgress.newCount>0 && <div style={{marginBottom:4}}><span style={{color:COLORS.green,fontWeight:700}}>{importProgress.newCount}</span> new SKUs ready to add</div>}
                <div><span style={{color:COLORS.amber,fontWeight:700}}>{importProgress.dupeCount}</span> SKUs already exist in catalog</div>
              </div>
              {/* Show parsing warnings if any */}
              {importProgress.warnings?.length > 0 && (
                <div style={{marginBottom:12,padding:'8px 12px',background:COLORS.red+'10',border:`1px solid ${COLORS.red}25`,borderRadius:8,maxHeight:120,overflowY:'auto'}}>
                  <div style={{fontSize:11,fontWeight:700,color:COLORS.red,marginBottom:4}}>{importProgress.warnings.length} row{importProgress.warnings.length!==1?'s':''} with issues:</div>
                  {importProgress.warnings.slice(0,10).map((w,i)=>(
                    <div key={i} style={{fontSize:10,color:COLORS.textMuted,lineHeight:1.5}}>
                      <span style={{color:COLORS.text,fontWeight:600}}>Row {w.rowNum}</span> ({w.sku}): {w.issues.join('; ')}
                    </div>
                  ))}
                  {importProgress.warnings.length>10 && <div style={{fontSize:10,color:COLORS.textMuted,marginTop:4}}>…and {importProgress.warnings.length-10} more</div>}
                </div>
              )}
              {importProgress.unmappedHeaders?.length > 0 && (
                <div style={{marginBottom:12,padding:'8px 12px',background:COLORS.amber+'10',border:`1px solid ${COLORS.amber}25`,borderRadius:8}}>
                  <div style={{fontSize:11,fontWeight:700,color:COLORS.amber,marginBottom:2}}>Unmapped columns (ignored):</div>
                  <div style={{fontSize:10,color:COLORS.textMuted}}>{importProgress.unmappedHeaders.join(', ')}</div>
                </div>
              )}
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {importProgress.newCount>0 && (
                  <button onClick={()=>finishImport(importProgress.newSkus,importProgress.dupeSkus,'merge',{warnings:importProgress.warnings,skippedEmpty:importProgress.skippedEmpty,unmappedHeaders:importProgress.unmappedHeaders,totalParsed:importProgress.totalParsed})} style={{
                    padding:'10px 16px',borderRadius:10,border:'none',cursor:'pointer',fontFamily:'inherit',fontWeight:700,fontSize:13,
                    background:COLORS.accent,color:'#fff',textAlign:'left',
                  }}>
                    Add new + Update existing ({importProgress.newCount + importProgress.dupeCount} total)
                  </button>
                )}
                {importProgress.newCount>0 && (
                  <button onClick={()=>finishImport(importProgress.newSkus,[],'add',{warnings:importProgress.warnings,skippedEmpty:importProgress.skippedEmpty,unmappedHeaders:importProgress.unmappedHeaders,totalParsed:importProgress.totalParsed})} style={{
                    padding:'10px 16px',borderRadius:10,border:`1px solid ${COLORS.border}`,cursor:'pointer',fontFamily:'inherit',fontWeight:600,fontSize:13,
                    background:COLORS.surface,color:COLORS.text,textAlign:'left',
                  }}>
                    Add only new ({importProgress.newCount}), skip duplicates
                  </button>
                )}
                {importProgress.dupeCount>0 && (
                  <button onClick={()=>finishImport([],importProgress.dupeSkus,'replace',{warnings:importProgress.warnings,skippedEmpty:importProgress.skippedEmpty,unmappedHeaders:importProgress.unmappedHeaders,totalParsed:importProgress.totalParsed})} style={{
                    padding:'10px 16px',borderRadius:10,border:`1px solid ${COLORS.amber}40`,cursor:'pointer',fontFamily:'inherit',fontWeight:600,fontSize:13,
                    background:COLORS.amber+'12',color:COLORS.amber,textAlign:'left',
                  }}>
                    Update existing only ({importProgress.dupeCount})
                  </button>
                )}
                <button onClick={()=>setImportProgress(null)} style={{
                  padding:'10px 16px',borderRadius:10,border:`1px solid ${COLORS.border}`,cursor:'pointer',fontFamily:'inherit',fontWeight:600,fontSize:13,
                  background:'transparent',color:COLORS.textMuted,textAlign:'left',
                }}>
                  Cancel — don't import anything
                </button>
              </div>
            </>)}

            {/* DONE — confirmation with warnings summary */}
            {importProgress.phase==='done' && (<>
              <div style={{textAlign:'center',padding:'8px 0'}}>
                <div style={{fontSize:36,marginBottom:8}}>✅</div>
                <div style={{fontSize:16,fontWeight:800,color:COLORS.green,marginBottom:6}}>Import Complete</div>
                <div style={{fontSize:13,color:COLORS.text,marginBottom:4}}>{importProgress.label}</div>
                {importProgress.newCount>0 && <div style={{fontSize:12,color:COLORS.green}}>+{importProgress.newCount} new SKUs added</div>}
                {importProgress.dupeCount>0 && <div style={{fontSize:12,color:COLORS.amber}}>{importProgress.dupeCount} existing SKUs updated</div>}
                {importProgress.skippedEmpty>0 && <div style={{fontSize:11,color:COLORS.textMuted,marginTop:4}}>{importProgress.skippedEmpty} empty rows skipped</div>}
              </div>
              {/* Warnings summary */}
              {importProgress.warnings?.length > 0 && (
                <div style={{marginTop:12,padding:'10px 14px',background:COLORS.amber+'10',border:`1px solid ${COLORS.amber}25`,borderRadius:8,maxHeight:160,overflowY:'auto'}}>
                  <div style={{fontSize:11,fontWeight:700,color:COLORS.amber,marginBottom:6}}>⚠ {importProgress.warnings.length} row{importProgress.warnings.length!==1?'s':''} imported with issues:</div>
                  {importProgress.warnings.slice(0,15).map((w,i)=>(
                    <div key={i} style={{fontSize:10,color:COLORS.textMuted,lineHeight:1.6,paddingLeft:8,borderLeft:`2px solid ${COLORS.amber}30`,marginBottom:3}}>
                      <span style={{color:COLORS.text,fontWeight:600}}>Row {w.rowNum}</span> <span style={{color:COLORS.accent,fontFamily:'monospace',fontSize:9}}>{w.sku}</span>
                      <div style={{color:COLORS.textMuted}}>{w.issues.join(' · ')}</div>
                    </div>
                  ))}
                  {importProgress.warnings.length>15 && <div style={{fontSize:10,color:COLORS.textMuted,marginTop:4,fontWeight:600}}>…and {importProgress.warnings.length-15} more rows with issues</div>}
                </div>
              )}
              {importProgress.unmappedHeaders?.length > 0 && (
                <div style={{marginTop:8,padding:'8px 12px',background:COLORS.surface,border:`1px solid ${COLORS.border}`,borderRadius:8}}>
                  <div style={{fontSize:10,fontWeight:700,color:COLORS.textMuted,marginBottom:2}}>Columns in file not recognized (ignored):</div>
                  <div style={{fontSize:10,color:COLORS.textMuted}}>{importProgress.unmappedHeaders.join(', ')}</div>
                </div>
              )}
              <div style={{display:'flex',gap:8,marginTop:16}}>
                {importProgress.warnings?.length > 0 && (
                  <button onClick={()=>downloadIssuesCSV(importProgress.warnings)} style={{
                    flex:1,padding:'10px 16px',borderRadius:10,border:`1px solid ${COLORS.amber}40`,cursor:'pointer',fontFamily:'inherit',fontWeight:700,fontSize:12,
                    background:COLORS.amber+'12',color:COLORS.amber,display:'flex',alignItems:'center',justifyContent:'center',gap:6,
                  }}>
                    <Icon name="download" size={13} color={COLORS.amber}/> Download {importProgress.warnings.length} SKUs with issues
                  </button>
                )}
                <button onClick={()=>setImportProgress(null)} style={{
                  flex:1,padding:'10px 16px',borderRadius:10,border:'none',cursor:'pointer',fontFamily:'inherit',fontWeight:700,fontSize:13,
                  background:COLORS.accent,color:'#fff',
                }}>
                  Done
                </button>
              </div>
            </>)}
          </div>
        </div>
      )}
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
        <select value={filterMargin} onChange={e=>setFilterMargin(e.target.value)} style={{...iSt(),width:'auto',minWidth:140,cursor:'pointer'}}><option value="All">All Pricing</option><option value="underpriced">Underpriced</option><option value="correct">Correctly Priced</option><option value="overpriced">Overpriced</option></select>
        {activeFilters>0&&<Btn variant="ghost" size="sm" onClick={()=>{setFilterCat('All');setFilterDoor('All');setFilterSeller('All');setFilterMargin('All')}}>Clear all</Btn>}
      </div>}
      <Card style={{padding:0,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead><tr style={{borderBottom:`1px solid ${COLORS.border}`}}>
              <th style={{padding:'10px 12px',width:36}}>
                <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAll} style={cbStyle} title="Select all visible"/>
              </th>
              {[{c:'_img',l:''},{c:'sku_code',l:'SKU'},{c:'name',l:'Name'},{c:'sub_category',l:'Category'},{c:'_dims',l:'W×D×H (cm)'},{c:'cost',l:'COGS (EGP)'},{c:'_rec',l:'Rec. Price'},{c:'_cur',l:'Current Price'},{c:'_var',l:'Variance'},{c:'_status',l:'Status'},{c:'_act',l:''}].map(h=>(
                <th key={h.c} style={{padding:'10px 12px',textAlign:'left',fontSize:11,fontWeight:700,color:COLORS.textMuted,letterSpacing:'0.06em',textTransform:'uppercase',whiteSpace:'nowrap'}}>{!h.c.startsWith('_')?<SH col={h.c}>{h.l}</SH>:h.l}</th>
              ))}
            </tr></thead>
            <tbody>{filtered.map(s=>{
              const c=skuCosts[s.sku_code]
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
                <td style={{padding:'8px 12px'}} onClick={()=>setSelectedSku(s)}>{(()=>{
                  if(!c||!s.selling_price||!c.recommended_selling_price)return<span style={{fontSize:10,color:COLORS.textMuted,fontWeight:600}}>—</span>
                  const pct=(s.selling_price-c.recommended_selling_price)/c.recommended_selling_price
                  const st=pct<-0.05?{l:'Underpriced',cl:COLORS.red}:pct>0.05?{l:'Overpriced',cl:COLORS.amber}:{l:'Correct',cl:COLORS.green}
                  return<span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:5,background:st.cl+'18',color:st.cl}}>{st.l}</span>
                })()}</td>
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
