import { useMemo } from 'react'
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

  const stats = useMemo(() => {
    const items = skus.map(s=>({sku:s,cost:skuCosts[s.sku_code]})).filter(x=>x.cost&&!x.cost.error)
    if (!items.length) return null
    const cogs=items.map(x=>x.cost.cogs)
    const margins=items.map(x=>x.cost.commercial?.net_margin_percent||0)
    const avgCogs=cogs.reduce((a,b)=>a+b,0)/cogs.length
    const avgMargin=margins.reduce((a,b)=>a+b,0)/margins.length
    const profitable=margins.filter(m=>m>0).length
    const maxCogs=Math.max(...cogs)
    const byCat={}
    items.forEach(({sku:s,cost:c})=>{
      const cat=s.sub_category||'Other'
      if(!byCat[cat])byCat[cat]={count:0,totalCogs:0,totalMargin:0}
      byCat[cat].count++;byCat[cat].totalCogs+=c.cogs;byCat[cat].totalMargin+=c.commercial?.net_margin_percent||0
    })
    return {items,avgCogs,avgMargin,profitable,negative:items.length-profitable,total:items.length,maxCogs,byCat}
  },[skus,skuCosts])

  return (
    <div style={{padding:'24px 28px',overflowY:'auto',flex:1}}>
      <div style={{marginBottom:24}}>
        <h2 style={{fontSize:24,fontWeight:800,color:COLORS.text,letterSpacing:'-0.02em',marginBottom:4}}>
          {greeting.text} {greeting.emoji}
        </h2>
        <p style={{fontSize:13,color:COLORS.textMuted}}>Here's your cost intelligence overview</p>
      </div>

      {!stats ? <div style={{padding:40,textAlign:'center',color:COLORS.textMuted}}>Upload SKUs to see analytics</div> : <>
        <div style={{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap'}}>
          <StatCard label="Total SKUs" value={stats.total} icon="grid" color={COLORS.accent}/>
          <StatCard label="Avg. COGS (EGP)" value={fmt(stats.avgCogs)} icon="box" color={COLORS.amber}/>
          <StatCard label="Avg. Net Margin" value={fmtP(stats.avgMargin)} icon="chart" color={stats.avgMargin>0?COLORS.green:COLORS.red}/>
          <StatCard label="Profitable" value={stats.profitable} sub={`of ${stats.total}`} icon="check" color={COLORS.green}/>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
          <Card>
            <div style={{fontSize:14,fontWeight:700,color:COLORS.text,marginBottom:16}}>Category Performance</div>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead><tr style={{borderBottom:`1px solid ${COLORS.border}`}}>
                {['Category','Count','Avg. COGS (EGP)','Avg. Margin %'].map(h=>(
                  <th key={h} style={{padding:'8px 10px',textAlign:h==='Category'?'left':'right',fontSize:11,fontWeight:700,color:COLORS.textMuted,textTransform:'uppercase',letterSpacing:'0.06em'}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{Object.entries(stats.byCat).sort((a,b)=>b[1].count-a[1].count).map(([cat,d])=>{
                const am=d.totalMargin/d.count
                return <tr key={cat} style={{borderBottom:`1px solid ${COLORS.border}`}}>
                  <td style={{padding:'10px',fontWeight:600,color:COLORS.text}}>{cat}</td>
                  <td style={{padding:'10px',textAlign:'right',color:COLORS.textDim}}>{d.count}</td>
                  <td style={{padding:'10px',textAlign:'right',fontWeight:600,color:COLORS.text}}>{fmt(d.totalCogs/d.count)}</td>
                  <td style={{padding:'10px',textAlign:'right',fontWeight:700,color:am>0?COLORS.green:COLORS.red}}>{fmtP(am)}</td>
                </tr>
              })}</tbody>
            </table>
          </Card>

          <Card>
            <div style={{fontSize:14,fontWeight:700,color:COLORS.text,marginBottom:16}}>Margin Distribution</div>
            <div style={{display:'flex',gap:12,marginBottom:16}}>
              <div style={{flex:1,textAlign:'center',padding:'16px 12px',background:COLORS.green+'12',borderRadius:10}}>
                <div style={{fontSize:28,fontWeight:900,color:COLORS.green}}>{stats.profitable}</div>
                <div style={{fontSize:11,color:COLORS.textMuted,marginTop:4}}>Profitable</div>
              </div>
              <div style={{flex:1,textAlign:'center',padding:'16px 12px',background:COLORS.red+'12',borderRadius:10}}>
                <div style={{fontSize:28,fontWeight:900,color:COLORS.red}}>{stats.negative}</div>
                <div style={{fontSize:11,color:COLORS.textMuted,marginTop:4}}>Loss-making</div>
              </div>
            </div>
            <div style={{height:8,borderRadius:4,background:COLORS.border,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${(stats.profitable/stats.total)*100}%`,background:COLORS.green,borderRadius:4}}/>
            </div>
            <div style={{fontSize:11,color:COLORS.textMuted,marginTop:6,textAlign:'center'}}>{((stats.profitable/stats.total)*100).toFixed(0)}% profitable</div>
          </Card>
        </div>

        <Card>
          <div style={{fontSize:14,fontWeight:700,color:COLORS.text,marginBottom:16}}>Top 15 by COGS (EGP)</div>
          {stats.items.sort((a,b)=>b.cost.cogs-a.cost.cogs).slice(0,15).map(({sku:s,cost:c})=>(
            <div key={s.sku_code} style={{display:'flex',alignItems:'center',gap:10,marginBottom:6,cursor:'pointer'}} onClick={()=>setSelectedSku(s)}>
              {s.image_link&&<img src={s.image_link} alt="" style={{width:24,height:24,objectFit:'cover',borderRadius:4,flexShrink:0}} onError={e=>{e.target.style.display='none'}}/>}
              <span style={{fontSize:11,color:COLORS.textMuted,width:110,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flexShrink:0}}>{s.sku_code}</span>
              <div style={{flex:1,height:20,background:COLORS.bg,borderRadius:4,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${(c.cogs/stats.maxCogs)*100}%`,background:`linear-gradient(90deg,${COLORS.accent},${COLORS.purple})`,borderRadius:4,display:'flex',alignItems:'center',justifyContent:'flex-end',paddingRight:6}}>
                  {(c.cogs/stats.maxCogs)>0.3&&<span style={{fontSize:10,color:'#fff',fontWeight:700}}>{fmt(c.cogs)}</span>}
                </div>
              </div>
              {(c.cogs/stats.maxCogs)<=0.3&&<span style={{fontSize:10,color:COLORS.textMuted,fontWeight:600}}>{fmt(c.cogs)}</span>}
            </div>
          ))}
        </Card>
      </>}
    </div>
  )
}
