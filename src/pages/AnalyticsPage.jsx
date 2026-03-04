import { useMemo } from 'react'
import { COLORS } from '../lib/constants'
import { fmt, fmtP } from '../lib/engine'
import { Card, StatCard } from '../components/UI'

export default function AnalyticsPage({ skus, skuCosts, setSelectedSku }) {
  const stats = useMemo(() => {
    const items = skus.map(s=>({sku:s,cost:skuCosts[s.sku_code]})).filter(x=>x.cost&&!x.cost.error)
    if (!items.length) return null
    const prods = items.map(x=>x.cost.production_cost)
    const margins = items.map(x=>x.cost.commercial?.net_margin_percent||0)
    const avgCost = prods.reduce((a,b)=>a+b,0)/prods.length
    const avgMargin = margins.reduce((a,b)=>a+b,0)/margins.length
    const profitable = margins.filter(m=>m>0).length
    const maxCost = Math.max(...prods)
    const byCat = {}
    items.forEach(({sku:s,cost:c})=>{
      const cat=s.sub_category||'Other'
      if(!byCat[cat]) byCat[cat]={count:0,totalCost:0,totalMargin:0}
      byCat[cat].count++; byCat[cat].totalCost+=c.production_cost; byCat[cat].totalMargin+=c.commercial?.net_margin_percent||0
    })
    return {items,avgCost,avgMargin,profitable,negative:items.length-profitable,total:items.length,maxCost,byCat}
  },[skus,skuCosts])

  if (!stats) return <div style={{padding:40,textAlign:'center',color:COLORS.textMuted}}>No data to analyze</div>

  return (
    <div style={{padding:'24px 28px',overflowY:'auto',flex:1}}>
      <h2 style={{fontSize:20,fontWeight:800,color:COLORS.text,letterSpacing:'-0.02em',marginBottom:20}}>Cost Analytics</h2>
      <div style={{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap'}}>
        <StatCard label="Avg. Prod. Cost" value={fmt(stats.avgCost)} icon="box" color={COLORS.amber}/>
        <StatCard label="Avg. Net Margin" value={fmtP(stats.avgMargin)} icon="chart" color={stats.avgMargin>0?COLORS.green:COLORS.red}/>
        <StatCard label="Profitable" value={stats.profitable} sub={`of ${stats.total}`} icon="check" color={COLORS.green}/>
        <StatCard label="Negative Margin" value={stats.negative} icon="info" color={COLORS.red}/>
      </div>

      <Card style={{marginBottom:20}}>
        <div style={{fontSize:14,fontWeight:700,color:COLORS.text,marginBottom:16}}>Category Performance</div>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
          <thead><tr style={{borderBottom:`1px solid ${COLORS.border}`}}>
            {['Category','Count','Avg. Cost','Avg. Margin'].map(h=>(
              <th key={h} style={{padding:'8px 12px',textAlign:h==='Category'?'left':'right',fontSize:11,fontWeight:700,color:COLORS.textMuted,textTransform:'uppercase',letterSpacing:'0.06em'}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{Object.entries(stats.byCat).sort((a,b)=>b[1].count-a[1].count).map(([cat,d])=>{
            const am=d.totalMargin/d.count
            return <tr key={cat} style={{borderBottom:`1px solid ${COLORS.border}`}}>
              <td style={{padding:'10px 12px',fontWeight:600,color:COLORS.text}}>{cat}</td>
              <td style={{padding:'10px 12px',textAlign:'right',color:COLORS.textDim}}>{d.count}</td>
              <td style={{padding:'10px 12px',textAlign:'right',fontWeight:600,color:COLORS.text}}>{fmt(d.totalCost/d.count)}</td>
              <td style={{padding:'10px 12px',textAlign:'right',fontWeight:700,color:am>0?COLORS.green:COLORS.red}}>{fmtP(am)}</td>
            </tr>
          })}</tbody>
        </table>
      </Card>

      <Card>
        <div style={{fontSize:14,fontWeight:700,color:COLORS.text,marginBottom:16}}>Top 15 by Production Cost</div>
        {stats.items.sort((a,b)=>b.cost.production_cost-a.cost.production_cost).slice(0,15).map(({sku:s,cost:c})=>(
          <div key={s.sku_code} style={{display:'flex',alignItems:'center',gap:10,marginBottom:6,cursor:'pointer'}} onClick={()=>setSelectedSku(s)}>
            <span style={{fontSize:11,color:COLORS.textMuted,width:130,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flexShrink:0}}>{s.sku_code}</span>
            <div style={{flex:1,height:20,background:COLORS.bg,borderRadius:4,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${(c.production_cost/stats.maxCost)*100}%`,background:`linear-gradient(90deg,${COLORS.accent},${COLORS.purple})`,borderRadius:4,display:'flex',alignItems:'center',justifyContent:'flex-end',paddingRight:6}}>
                {(c.production_cost/stats.maxCost)>0.3 && <span style={{fontSize:10,color:'#fff',fontWeight:700}}>{fmt(c.production_cost)}</span>}
              </div>
            </div>
            {(c.production_cost/stats.maxCost)<=0.3 && <span style={{fontSize:10,color:COLORS.textMuted,fontWeight:600}}>{fmt(c.production_cost)}</span>}
          </div>
        ))}
      </Card>
    </div>
  )
}
