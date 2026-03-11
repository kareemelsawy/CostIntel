import { useMemo, useState } from 'react'
import { COLORS } from '../lib/constants'
import { fmt, fmtP } from '../lib/engine'
import { Card, StatCard, Icon } from '../components/UI'

function getGreeting(userName) {
  const h = new Date().getHours()
  if (h < 12) return { text: `Hey ${userName}, Good morning!`, emoji: '☀️' }
  if (h < 17) return { text: `Hey ${userName}, Good afternoon!`, emoji: '🌤️' }
  return { text: `Hey ${userName}, Good evening!`, emoji: '🌙' }
}

export default function AnalyticsPage({ skus, skuCosts, setSelectedSku, userName }) {
  const greeting = getGreeting(userName || 'there')
  // 'worst' = largest negative variance (most underpriced), 'best' = largest positive variance (most overpriced)
  const [varSort, setVarSort] = useState('worst')

  const stats = useMemo(() => {
    const items = skus.map(s=>({sku:s,cost:skuCosts[s.sku_code]})).filter(x=>x.cost&&!x.cost.error)
    if (!items.length) return null
    const margins=items.map(x=>x.cost.commercial?.net_margin_percent||0)
    const avgMargin=margins.reduce((a,b)=>a+b,0)/margins.length
    const profitable=margins.filter(m=>m>0).length
    // Items with both a selling price and a recommended price
    const pricedItems = items.filter(x=>x.sku.selling_price>0&&x.cost.recommended_selling_price>0)
    const avgVariance = pricedItems.length
      ? pricedItems.reduce((a,x)=>a+(x.sku.selling_price-x.cost.recommended_selling_price),0)/pricedItems.length
      : 0
    const underpriced = pricedItems.filter(x=>x.sku.selling_price<x.cost.recommended_selling_price).length
    const maxAbsVariance = pricedItems.length
      ? Math.max(...pricedItems.map(x=>Math.abs(x.sku.selling_price-x.cost.recommended_selling_price)))
      : 1
    const byCat={}
    items.forEach(({sku:s,cost:c})=>{
      const cat=s.sub_category||'Other'
      if(!byCat[cat])byCat[cat]={count:0,totalCogs:0,totalMargin:0,totalVariance:0,pricedCount:0}
      byCat[cat].count++
      byCat[cat].totalCogs+=c.cogs
      byCat[cat].totalMargin+=c.commercial?.net_margin_percent||0
      if(s.selling_price>0&&c.recommended_selling_price>0){
        byCat[cat].totalVariance+=(s.selling_price-c.recommended_selling_price)
        byCat[cat].pricedCount++
      }
    })
    return {items,pricedItems,avgMargin,profitable,underpriced,negative:items.length-profitable,total:items.length,maxAbsVariance,avgVariance,byCat}
  },[skus,skuCosts])

  const sortedVariance = useMemo(() => {
    if (!stats?.pricedItems) return []
    return [...stats.pricedItems].sort((a,b)=>{
      const va = a.sku.selling_price - a.cost.recommended_selling_price
      const vb = b.sku.selling_price - b.cost.recommended_selling_price
      return varSort === 'worst' ? va - vb : vb - va  // worst = most negative first; best = most positive first
    }).slice(0,15)
  },[stats, varSort])

  return (
    <div style={{padding:'24px 28px',overflowY:'auto',flex:1}}>
      <div style={{marginBottom:24}}>
        <h2 style={{fontSize:24,fontWeight:800,color:COLORS.text,letterSpacing:'-0.02em',marginBottom:4}}>
          {greeting.text} {greeting.emoji}
        </h2>
        <p style={{fontSize:13,color:COLORS.textMuted}}>Here's your pricing intelligence overview</p>
      </div>

      {!stats ? <div style={{padding:40,textAlign:'center',color:COLORS.textMuted}}>Upload SKUs to see analytics</div> : <>
        <div style={{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap'}}>
          <StatCard label="Total SKUs" value={stats.total} icon="grid" color={COLORS.accent}/>
          <StatCard label="Avg. Price Variance" value={(stats.avgVariance>=0?'+':'')+fmt(stats.avgVariance)} icon="chart" color={stats.avgVariance>=0?COLORS.green:COLORS.red}/>
          <StatCard label="Avg. Net Margin" value={fmtP(stats.avgMargin)} icon="box" color={stats.avgMargin>0?COLORS.green:COLORS.red}/>
          <StatCard label="Underpriced SKUs" value={stats.underpriced} sub={`of ${stats.pricedItems.length} priced`} icon="tag" color={COLORS.red}/>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
          <Card>
            <div style={{fontSize:14,fontWeight:700,color:COLORS.text,marginBottom:16}}>Category Performance</div>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead><tr style={{borderBottom:`1px solid ${COLORS.border}`}}>
                {['Category','SKUs','Avg. Variance','Avg. Margin %'].map(h=>(
                  <th key={h} style={{padding:'8px 10px',textAlign:h==='Category'?'left':'right',fontSize:11,fontWeight:700,color:COLORS.textMuted,textTransform:'uppercase',letterSpacing:'0.06em'}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{Object.entries(stats.byCat).sort((a,b)=>b[1].count-a[1].count).map(([cat,d])=>{
                const am=d.totalMargin/d.count
                const av=d.pricedCount>0?d.totalVariance/d.pricedCount:null
                return <tr key={cat} style={{borderBottom:`1px solid ${COLORS.border}`}}>
                  <td style={{padding:'10px',fontWeight:600,color:COLORS.text}}>{cat}</td>
                  <td style={{padding:'10px',textAlign:'right',color:COLORS.textDim}}>{d.count}</td>
                  <td style={{padding:'10px',textAlign:'right',fontWeight:700,color:av===null?COLORS.textMuted:av>=0?COLORS.green:COLORS.red}}>
                    {av===null?'—':(av>=0?'+':'')+fmt(av)+' EGP'}
                  </td>
                  <td style={{padding:'10px',textAlign:'right',fontWeight:700,color:am>0?COLORS.green:COLORS.red}}>{fmtP(am)}</td>
                </tr>
              })}</tbody>
            </table>
          </Card>

          <Card>
            <div style={{fontSize:14,fontWeight:700,color:COLORS.text,marginBottom:16}}>Pricing Health</div>
            <div style={{display:'flex',gap:12,marginBottom:16}}>
              <div style={{flex:1,textAlign:'center',padding:'16px 12px',background:COLORS.green+'12',borderRadius:10}}>
                <div style={{fontSize:28,fontWeight:900,color:COLORS.green}}>{stats.pricedItems.length-stats.underpriced}</div>
                <div style={{fontSize:11,color:COLORS.textMuted,marginTop:4}}>Correctly priced</div>
              </div>
              <div style={{flex:1,textAlign:'center',padding:'16px 12px',background:COLORS.red+'12',borderRadius:10}}>
                <div style={{fontSize:28,fontWeight:900,color:COLORS.red}}>{stats.underpriced}</div>
                <div style={{fontSize:11,color:COLORS.textMuted,marginTop:4}}>Underpriced</div>
              </div>
            </div>
            <div style={{height:8,borderRadius:4,background:COLORS.border,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${stats.pricedItems.length?((stats.pricedItems.length-stats.underpriced)/stats.pricedItems.length)*100:0}%`,background:COLORS.green,borderRadius:4}}/>
            </div>
            <div style={{fontSize:11,color:COLORS.textMuted,marginTop:6,textAlign:'center'}}>
              {stats.pricedItems.length?`${(((stats.pricedItems.length-stats.underpriced)/stats.pricedItems.length)*100).toFixed(0)}% at or above recommended price`:`No priced SKUs yet`}
            </div>
            {stats.pricedItems.length===0&&<div style={{marginTop:12,fontSize:12,color:COLORS.textMuted,textAlign:'center'}}>Add selling prices to SKUs to see pricing health</div>}
          </Card>
        </div>

        <Card>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:COLORS.text}}>Price Variance — Top 15</div>
              <div style={{fontSize:12,color:COLORS.textMuted,marginTop:2}}>Current price vs. recommended break-even · click to view SKU</div>
            </div>
            <div style={{display:'flex',gap:1,background:COLORS.bg,borderRadius:8,padding:3,border:`1px solid ${COLORS.border}`}}>
              {[['worst','Most underpriced'],['best','Most overpriced']].map(([v,l])=>(
                <button key={v} onClick={()=>setVarSort(v)} style={{
                  padding:'5px 12px',fontSize:11,fontWeight:700,cursor:'pointer',borderRadius:6,border:'none',fontFamily:'inherit',
                  background:varSort===v?COLORS.surface:'transparent',
                  color:varSort===v?(v==='worst'?COLORS.red:COLORS.green):COLORS.textMuted,
                  transition:'all 0.15s'
                }}>{l}</button>
              ))}
            </div>
          </div>
          {sortedVariance.length===0
            ? <div style={{padding:24,textAlign:'center',color:COLORS.textMuted,fontSize:12}}>No SKUs with selling prices yet</div>
            : sortedVariance.map(({sku:s,cost:c})=>{
                const variance = s.selling_price - c.recommended_selling_price
                const isPos = variance >= 0
                const barPct = Math.min(Math.abs(variance)/stats.maxAbsVariance*100, 100)
                return (
                  <div key={s.sku_code} style={{display:'flex',alignItems:'center',gap:10,marginBottom:7,cursor:'pointer'}} onClick={()=>setSelectedSku(s)}>
                    {s.image_link
                      ? <img src={s.image_link} alt="" style={{width:26,height:26,objectFit:'cover',borderRadius:4,flexShrink:0}} onError={e=>{e.target.style.display='none'}}/>
                      : <div style={{width:26,height:26,borderRadius:4,background:COLORS.bg,flexShrink:0}}/>
                    }
                    <span style={{fontSize:11,color:COLORS.textMuted,width:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flexShrink:0}}>{s.sku_code}</span>
                    <div style={{flex:1,height:20,background:COLORS.bg,borderRadius:4,overflow:'hidden'}}>
                      <div style={{
                        height:'100%', width:`${barPct}%`,
                        background:isPos?`linear-gradient(90deg,${COLORS.green}88,${COLORS.green})`:
                                        `linear-gradient(90deg,${COLORS.red}88,${COLORS.red})`,
                        borderRadius:4,display:'flex',alignItems:'center',justifyContent:'flex-end',paddingRight:6,minWidth:4
                      }}>
                        {barPct>25&&<span style={{fontSize:10,color:'#fff',fontWeight:700}}>{isPos?'+':''}{fmt(variance)}</span>}
                      </div>
                    </div>
                    <span style={{fontSize:11,fontWeight:700,color:isPos?COLORS.green:COLORS.red,width:80,textAlign:'right',flexShrink:0}}>
                      {isPos?'+':''}{fmt(variance)} EGP
                    </span>
                  </div>
                )
              })
          }
        </Card>
      </>}
    </div>
  )
}
