import { useMemo, useState } from 'react'
import { COLORS } from '../lib/constants'
import { fmt } from '../lib/engine'
import { Card, StatCard, Icon } from '../components/UI'

function getGreeting(userName) {
  const h = new Date().getHours()
  if (h < 12) return { text: `Good morning, ${userName}`, emoji: '☀️' }
  if (h < 17) return { text: `Good afternoon, ${userName}`, emoji: '🌤️' }
  return { text: `Good evening, ${userName}`, emoji: '🌙' }
}

const TOL = 0.05

function classify(sp, rec) {
  if (!sp || !rec || rec <= 0) return 'unpriced'
  const p = (sp - rec) / rec
  if (p < -TOL) return 'underpriced'
  if (p > TOL) return 'overpriced'
  return 'correct'
}

const SM = {
  underpriced: { label: 'Underpriced', color: COLORS.red },
  correct: { label: 'Correctly Priced', color: COLORS.green },
  overpriced: { label: 'Overpriced', color: COLORS.amber },
  unpriced: { label: 'Unpriced', color: COLORS.textMuted },
}

export default function AnalyticsPage({ skus, skuCosts, setSelectedSku, userName }) {
  const greeting = getGreeting(userName || 'there')
  const [varSort, setVarSort] = useState('worst')

  const stats = useMemo(() => {
    const items = skus.map(s => ({ sku: s, cost: skuCosts[s.sku_code] })).filter(x => x.cost && !x.cost.error)
    if (!items.length) return null

    const classified = items.map(x => {
      const sp = x.sku.selling_price, rec = x.cost.recommended_selling_price
      return {
        ...x,
        status: classify(sp, rec),
        variance: (sp > 0 && rec > 0) ? sp - rec : null,
        variancePct: (sp > 0 && rec > 0) ? ((sp - rec) / rec) * 100 : null,
      }
    })

    const priced = classified.filter(x => x.status !== 'unpriced')
    const under = classified.filter(x => x.status === 'underpriced')
    const over = classified.filter(x => x.status === 'overpriced')
    const correct = classified.filter(x => x.status === 'correct')
    const unpriced = classified.filter(x => x.status === 'unpriced')

    const avgVarPct = priced.length ? priced.reduce((a, x) => a + (x.variancePct || 0), 0) / priced.length : 0
    const maxAbsVar = priced.length ? Math.max(...priced.map(x => Math.abs(x.variance || 0)), 1) : 1

    // Pricing health %
    const healthPct = priced.length ? (correct.length / priced.length) * 100 : 0

    // Sellers
    const sellers = [...new Set(skus.map(s => s.seller).filter(Boolean))]

    // Category breakdown
    const byCat = {}
    classified.forEach(({ sku: s, cost: c, status, variancePct }) => {
      const cat = s.sub_category || 'Other'
      if (!byCat[cat]) byCat[cat] = { count: 0, underpriced: 0, overpriced: 0, correct: 0, unpriced: 0, varPcts: [], pricedCount: 0 }
      byCat[cat].count++
      byCat[cat][status]++
      if (variancePct !== null) { byCat[cat].varPcts.push(variancePct); byCat[cat].pricedCount++ }
    })

    // Seller breakdown
    const bySeller = {}
    classified.forEach(({ sku: s, status, variancePct }) => {
      const seller = s.seller || 'Unknown'
      if (!bySeller[seller]) bySeller[seller] = { count: 0, underpriced: 0, overpriced: 0, correct: 0, unpriced: 0, pricedCount: 0, varPcts: [] }
      bySeller[seller].count++
      bySeller[seller][status]++
      if (variancePct !== null) { bySeller[seller].varPcts.push(variancePct); bySeller[seller].pricedCount++ }
    })

    return {
      items: classified, priced, under, over, correct, unpriced,
      total: items.length, avgVarPct, maxAbsVar, healthPct,
      sellerCount: sellers.length, byCat, bySeller,
    }
  }, [skus, skuCosts])

  const sorted = useMemo(() => {
    if (!stats?.priced) return []
    return [...stats.priced].sort((a, b) => {
      return varSort === 'worst' ? (a.variancePct||0) - (b.variancePct||0) : (b.variancePct||0) - (a.variancePct||0)
    }).slice(0, 20)
  }, [stats, varSort])

  if (!stats) return (
    <div style={{ padding: '24px 28px', flex: 1 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: COLORS.text, marginBottom: 8 }}>{greeting.text} {greeting.emoji}</h2>
      <div style={{ padding: 60, textAlign: 'center', color: COLORS.textMuted }}>Upload SKUs to see your pricing dashboard</div>
    </div>
  )

  const underPct = stats.priced.length ? (stats.under.length / stats.priced.length * 100).toFixed(0) : 0
  const correctPct = stats.priced.length ? (stats.correct.length / stats.priced.length * 100).toFixed(0) : 0
  const overPct = stats.priced.length ? (stats.over.length / stats.priced.length * 100).toFixed(0) : 0

  return (
    <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: COLORS.text, letterSpacing: '-0.02em', marginBottom: 4 }}>
          {greeting.text} {greeting.emoji}
        </h2>
        <p style={{ fontSize: 13, color: COLORS.textMuted }}>
          {stats.total.toLocaleString()} SKUs across {stats.sellerCount} sellers · {stats.priced.length.toLocaleString()} priced, {stats.unpriced.length.toLocaleString()} unpriced
        </p>
      </div>

      {/* ── TOP CARDS — all % based ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <Card style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Pricing Health</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: stats.healthPct >= 70 ? COLORS.green : stats.healthPct >= 40 ? COLORS.amber : COLORS.red, letterSpacing: '-0.03em' }}>
            {stats.healthPct.toFixed(0)}%
          </div>
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>of priced SKUs within ±5% of recommended</div>
        </Card>
        <Card style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Avg. Variance</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: stats.avgVarPct >= 0 ? COLORS.green : COLORS.red, letterSpacing: '-0.03em' }}>
            {stats.avgVarPct >= 0 ? '+' : ''}{stats.avgVarPct.toFixed(1)}%
          </div>
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>avg. deviation from recommended price</div>
        </Card>
        <Card style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.red, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Underpriced</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: COLORS.red, letterSpacing: '-0.03em' }}>{underPct}%</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.textMuted }}>({stats.under.length})</span>
          </div>
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>priced below recommended</div>
        </Card>
        <Card style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.amber, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Overpriced</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: COLORS.amber, letterSpacing: '-0.03em' }}>{overPct}%</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.textMuted }}>({stats.over.length})</span>
          </div>
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>priced above recommended</div>
        </Card>
      </div>

      {/* ── PRICING HEALTH BAR ── */}
      <Card style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 12 }}>Pricing Distribution</div>
        <div style={{ display: 'flex', height: 28, borderRadius: 8, overflow: 'hidden', background: COLORS.bg, marginBottom: 10 }}>
          {stats.under.length > 0 && <div style={{ width: `${underPct}%`, background: COLORS.red, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: stats.under.length > 0 ? 30 : 0, transition: 'width 0.4s' }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>{underPct}%</span>
          </div>}
          {stats.correct.length > 0 && <div style={{ width: `${correctPct}%`, background: COLORS.green, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: stats.correct.length > 0 ? 30 : 0, transition: 'width 0.4s' }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>{correctPct}%</span>
          </div>}
          {stats.over.length > 0 && <div style={{ width: `${overPct}%`, background: COLORS.amber, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: stats.over.length > 0 ? 30 : 0, transition: 'width 0.4s' }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>{overPct}%</span>
          </div>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
          <span style={{ color: COLORS.red, fontWeight: 600 }}>⬤ {stats.under.length} Underpriced</span>
          <span style={{ color: COLORS.green, fontWeight: 600 }}>⬤ {stats.correct.length} Correct</span>
          <span style={{ color: COLORS.amber, fontWeight: 600 }}>⬤ {stats.over.length} Overpriced</span>
          {stats.unpriced.length > 0 && <span style={{ color: COLORS.textMuted, fontWeight: 600 }}>⬤ {stats.unpriced.length} Unpriced</span>}
        </div>
      </Card>

      {/* ── CATEGORY + SELLER SIDE BY SIDE ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Category variance */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>Variance by Category</div>
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ borderBottom: `1px solid ${COLORS.border}`, position: 'sticky', top: 0, background: COLORS.surface }}>
                {['Category', 'SKUs', 'Health', 'Avg Var %'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Category' ? 'left' : 'right', fontSize: 10, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{Object.entries(stats.byCat).sort((a, b) => {
                const aAvg = a[1].varPcts.length ? a[1].varPcts.reduce((s, v) => s + v, 0) / a[1].varPcts.length : 999
                const bAvg = b[1].varPcts.length ? b[1].varPcts.reduce((s, v) => s + v, 0) / b[1].varPcts.length : 999
                return aAvg - bAvg // worst variance first
              }).map(([cat, d]) => {
                const hp = d.pricedCount > 0 ? (d.correct / d.pricedCount * 100) : null
                const av = d.varPcts.length ? d.varPcts.reduce((s, v) => s + v, 0) / d.varPcts.length : null
                const hc = hp === null ? COLORS.textMuted : hp >= 70 ? COLORS.green : hp >= 40 ? COLORS.amber : COLORS.red
                return <tr key={cat} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <td style={{ padding: '8px 10px', fontWeight: 600, color: COLORS.text, fontSize: 11 }}>{cat}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: COLORS.textDim }}>{d.count}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                    <span style={{ fontWeight: 700, color: hc }}>{hp !== null ? hp.toFixed(0) + '%' : '—'}</span>
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: av === null ? COLORS.textMuted : av >= 0 ? COLORS.green : COLORS.red }}>
                    {av !== null ? (av >= 0 ? '+' : '') + av.toFixed(1) + '%' : '—'}
                  </td>
                </tr>
              })}</tbody>
            </table>
          </div>
        </Card>

        {/* Top sellers by worst pricing */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>Sellers Needing Attention</div>
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ borderBottom: `1px solid ${COLORS.border}`, position: 'sticky', top: 0, background: COLORS.surface }}>
                {['Seller', 'SKUs', 'Under', 'Health', 'Avg Var %'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Seller' ? 'left' : 'right', fontSize: 10, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{Object.entries(stats.bySeller).sort((a, b) => {
                const aAvg = a[1].varPcts.length ? a[1].varPcts.reduce((s, v) => s + v, 0) / a[1].varPcts.length : 999
                const bAvg = b[1].varPcts.length ? b[1].varPcts.reduce((s, v) => s + v, 0) / b[1].varPcts.length : 999
                return aAvg - bAvg
              }).slice(0, 15).map(([seller, d]) => {
                const hp = d.pricedCount > 0 ? (d.correct / d.pricedCount * 100) : null
                const av = d.varPcts.length ? d.varPcts.reduce((s, v) => s + v, 0) / d.varPcts.length : null
                const hc = hp === null ? COLORS.textMuted : hp >= 70 ? COLORS.green : hp >= 40 ? COLORS.amber : COLORS.red
                return <tr key={seller} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <td style={{ padding: '8px 10px', fontWeight: 600, color: COLORS.text, fontSize: 11, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{seller}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: COLORS.textDim }}>{d.count}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: d.underpriced > 0 ? COLORS.red : COLORS.textMuted, fontWeight: d.underpriced > 0 ? 700 : 400 }}>{d.underpriced || '—'}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                    <span style={{ fontWeight: 700, color: hc }}>{hp !== null ? hp.toFixed(0) + '%' : '—'}</span>
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: av === null ? COLORS.textMuted : av >= 0 ? COLORS.green : COLORS.red }}>
                    {av !== null ? (av >= 0 ? '+' : '') + av.toFixed(1) + '%' : '—'}
                  </td>
                </tr>
              })}</tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ── TOP VARIANCE LIST ── */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>Biggest Price Deviations — Top 20</div>
            <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>Click to view full cost report</div>
          </div>
          <div style={{ display: 'flex', gap: 1, background: COLORS.bg, borderRadius: 8, padding: 3, border: `1px solid ${COLORS.border}` }}>
            {[['worst', 'Most underpriced'], ['best', 'Most overpriced']].map(([v, l]) => (
              <button key={v} onClick={() => setVarSort(v)} style={{
                padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', borderRadius: 6, border: 'none', fontFamily: 'inherit',
                background: varSort === v ? COLORS.surface : 'transparent',
                color: varSort === v ? (v === 'worst' ? COLORS.red : COLORS.green) : COLORS.textMuted,
              }}>{l}</button>
            ))}
          </div>
        </div>
        {sorted.length === 0
          ? <div style={{ padding: 24, textAlign: 'center', color: COLORS.textMuted, fontSize: 12 }}>No priced SKUs yet</div>
          : sorted.map(({ sku: s, cost: c, variance, variancePct, status }) => {
            const isPos = variancePct >= 0
            const barPct = Math.min(Math.abs(variancePct) / Math.max(...sorted.map(x => Math.abs(x.variancePct || 0)), 1) * 100, 100)
            const sm = SM[status]
            return (
              <div key={s.sku_code} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, cursor: 'pointer', padding: '4px 0' }} onClick={() => setSelectedSku(s)}>
                {s.image_link
                  ? <img src={s.image_link} alt="" style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 5, flexShrink: 0 }} onError={e => { e.target.style.display = 'none' }} />
                  : <div style={{ width: 28, height: 28, borderRadius: 5, background: COLORS.bg, flexShrink: 0 }} />
                }
                <div style={{ width: 110, flexShrink: 0, overflow: 'hidden' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.sku_code}</div>
                  <div style={{ fontSize: 9, color: COLORS.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.seller}</div>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, flexShrink: 0, background: sm.color + '18', color: sm.color }}>{sm.label}</span>
                <div style={{ flex: 1, height: 22, background: COLORS.bg, borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${barPct}%`,
                    background: isPos ? `linear-gradient(90deg,${COLORS.green}88,${COLORS.green})` : `linear-gradient(90deg,${COLORS.red}88,${COLORS.red})`,
                    borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8, minWidth: 4,
                  }}>
                    {barPct > 20 && <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>{isPos ? '+' : ''}{variancePct?.toFixed(1)}%</span>}
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 800, color: isPos ? COLORS.green : COLORS.red, width: 70, textAlign: 'right', flexShrink: 0 }}>
                  {isPos ? '+' : ''}{variancePct?.toFixed(1)}%
                </span>
              </div>
            )
          })
        }
      </Card>
    </div>
  )
}
