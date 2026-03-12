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

// Price variance thresholds — within ±5% of recommended = "correctly priced"
const VARIANCE_TOLERANCE = 0.05

function classifyPricing(sp, recSP) {
  if (!sp || !recSP || recSP <= 0) return 'unpriced'
  const pct = (sp - recSP) / recSP
  if (pct < -VARIANCE_TOLERANCE) return 'underpriced'
  if (pct > VARIANCE_TOLERANCE) return 'overpriced'
  return 'correct'
}

const STATUS_META = {
  underpriced: { label: 'Underpriced', color: COLORS.red, desc: 'Below recommended price' },
  correct: { label: 'Correctly Priced', color: COLORS.green, desc: 'Within ±5% of recommended' },
  overpriced: { label: 'Overpriced', color: COLORS.amber, desc: 'Above recommended price' },
  unpriced: { label: 'Not Priced', color: COLORS.textMuted, desc: 'No selling price set' },
}

export default function AnalyticsPage({ skus, skuCosts, setSelectedSku, userName }) {
  const greeting = getGreeting(userName || 'there')
  const [varSort, setVarSort] = useState('worst')

  const stats = useMemo(() => {
    const items = skus.map(s => ({ sku: s, cost: skuCosts[s.sku_code] })).filter(x => x.cost && !x.cost.error)
    if (!items.length) return null

    // Classify each SKU by pricing status
    const classified = items.map(x => ({
      ...x,
      status: classifyPricing(x.sku.selling_price, x.cost.recommended_selling_price),
      variance: (x.sku.selling_price > 0 && x.cost.recommended_selling_price > 0)
        ? x.sku.selling_price - x.cost.recommended_selling_price : null,
      variancePct: (x.sku.selling_price > 0 && x.cost.recommended_selling_price > 0)
        ? ((x.sku.selling_price - x.cost.recommended_selling_price) / x.cost.recommended_selling_price) * 100 : null,
    }))

    const pricedItems = classified.filter(x => x.status !== 'unpriced')
    const underpriced = classified.filter(x => x.status === 'underpriced').length
    const overpriced = classified.filter(x => x.status === 'overpriced').length
    const correct = classified.filter(x => x.status === 'correct').length
    const unpriced = classified.filter(x => x.status === 'unpriced').length

    const avgVariance = pricedItems.length
      ? pricedItems.reduce((a, x) => a + (x.variance || 0), 0) / pricedItems.length : 0
    const maxAbsVariance = pricedItems.length
      ? Math.max(...pricedItems.map(x => Math.abs(x.variance || 0)), 1) : 1

    // Category breakdown
    const byCat = {}
    classified.forEach(({ sku: s, cost: c, status, variance }) => {
      const cat = s.sub_category || 'Other'
      if (!byCat[cat]) byCat[cat] = { count: 0, underpriced: 0, overpriced: 0, correct: 0, unpriced: 0, totalVariance: 0, pricedCount: 0, totalCogs: 0 }
      byCat[cat].count++
      byCat[cat][status]++
      byCat[cat].totalCogs += c.cogs || 0
      if (variance !== null) { byCat[cat].totalVariance += variance; byCat[cat].pricedCount++ }
    })

    return { items: classified, pricedItems, underpriced, overpriced, correct, unpriced, total: items.length, avgVariance, maxAbsVariance, byCat }
  }, [skus, skuCosts])

  const sortedVariance = useMemo(() => {
    if (!stats?.pricedItems) return []
    return [...stats.pricedItems].sort((a, b) => {
      const va = a.variance || 0, vb = b.variance || 0
      return varSort === 'worst' ? va - vb : vb - va
    }).slice(0, 15)
  }, [stats, varSort])

  return (
    <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: COLORS.text, letterSpacing: '-0.02em', marginBottom: 4 }}>
          {greeting.text} {greeting.emoji}
        </h2>
        <p style={{ fontSize: 13, color: COLORS.textMuted }}>Here's your pricing intelligence overview</p>
      </div>

      {!stats ? <div style={{ padding: 40, textAlign: 'center', color: COLORS.textMuted }}>Upload SKUs to see analytics</div> : <>

        {/* ── TOP STATS CARDS ── */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <StatCard label="Total SKUs" value={stats.total} icon="grid" color={COLORS.accent} />
          <StatCard label="Underpriced" value={stats.underpriced} sub={`of ${stats.pricedItems.length} priced`} icon="arrowDown" color={COLORS.red} />
          <StatCard label="Correctly Priced" value={stats.correct} sub="within ±5% of rec." icon="check" color={COLORS.green} />
          <StatCard label="Overpriced" value={stats.overpriced} sub={`of ${stats.pricedItems.length} priced`} icon="arrowUp" color={COLORS.amber} />
          <StatCard label="Avg. Variance" value={(stats.avgVariance >= 0 ? '+' : '') + fmt(stats.avgVariance) + ' EGP'} icon="chart" color={stats.avgVariance >= 0 ? COLORS.green : COLORS.red} />
        </div>

        {/* ── PRICING HEALTH + CATEGORY PERF ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

          {/* Pricing Health */}
          <Card>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 16 }}>Pricing Health</div>
            {stats.pricedItems.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: COLORS.textMuted, fontSize: 12 }}>Add selling prices to SKUs to see pricing health</div>
            ) : (<>
              {/* Three-segment bar */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                {[
                  { key: 'underpriced', ...STATUS_META.underpriced, count: stats.underpriced },
                  { key: 'correct', ...STATUS_META.correct, count: stats.correct },
                  { key: 'overpriced', ...STATUS_META.overpriced, count: stats.overpriced },
                ].map(s => (
                  <div key={s.key} style={{ flex: 1, textAlign: 'center', padding: '14px 8px', background: s.color + '12', borderRadius: 10, border: `1px solid ${s.color}25` }}>
                    <div style={{ fontSize: 26, fontWeight: 900, color: s.color }}>{s.count}</div>
                    <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 3, fontWeight: 600 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {/* Stacked bar */}
              <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', background: COLORS.border }}>
                {stats.underpriced > 0 && <div style={{ width: `${(stats.underpriced / stats.pricedItems.length) * 100}%`, background: COLORS.red, transition: 'width 0.4s' }} />}
                {stats.correct > 0 && <div style={{ width: `${(stats.correct / stats.pricedItems.length) * 100}%`, background: COLORS.green, transition: 'width 0.4s' }} />}
                {stats.overpriced > 0 && <div style={{ width: `${(stats.overpriced / stats.pricedItems.length) * 100}%`, background: COLORS.amber, transition: 'width 0.4s' }} />}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: COLORS.textMuted }}>
                <span>{stats.underpriced} underpriced</span>
                <span>{stats.correct} correct</span>
                <span>{stats.overpriced} overpriced</span>
              </div>
              {stats.unpriced > 0 && (
                <div style={{ marginTop: 10, fontSize: 11, color: COLORS.textMuted, textAlign: 'center' }}>
                  {stats.unpriced} SKU{stats.unpriced > 1 ? 's' : ''} have no selling price set
                </div>
              )}
            </>)}
          </Card>

          {/* Category Performance */}
          <Card>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 16 }}>Category Performance</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                {['Category', 'SKUs', 'Under', 'Correct', 'Over', 'Avg Variance'].map(h => (
                  <th key={h} style={{ padding: '8px 8px', textAlign: h === 'Category' ? 'left' : 'right', fontSize: 10, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{Object.entries(stats.byCat).sort((a, b) => b[1].count - a[1].count).map(([cat, d]) => {
                const av = d.pricedCount > 0 ? d.totalVariance / d.pricedCount : null
                return <tr key={cat} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <td style={{ padding: '8px 8px', fontWeight: 600, color: COLORS.text, fontSize: 12 }}>{cat}</td>
                  <td style={{ padding: '8px 8px', textAlign: 'right', color: COLORS.textDim }}>{d.count}</td>
                  <td style={{ padding: '8px 8px', textAlign: 'right', color: d.underpriced > 0 ? COLORS.red : COLORS.textMuted, fontWeight: d.underpriced > 0 ? 700 : 400 }}>{d.underpriced || '—'}</td>
                  <td style={{ padding: '8px 8px', textAlign: 'right', color: d.correct > 0 ? COLORS.green : COLORS.textMuted, fontWeight: d.correct > 0 ? 700 : 400 }}>{d.correct || '—'}</td>
                  <td style={{ padding: '8px 8px', textAlign: 'right', color: d.overpriced > 0 ? COLORS.amber : COLORS.textMuted, fontWeight: d.overpriced > 0 ? 700 : 400 }}>{d.overpriced || '—'}</td>
                  <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, color: av === null ? COLORS.textMuted : av >= 0 ? COLORS.green : COLORS.red }}>
                    {av === null ? '—' : (av >= 0 ? '+' : '') + fmt(av)}
                  </td>
                </tr>
              })}</tbody>
            </table>
          </Card>
        </div>

        {/* ── TOP 15 VARIANCE TABLE ── */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>Price Variance — Top 15</div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>Current price vs. recommended · click to view SKU</div>
            </div>
            <div style={{ display: 'flex', gap: 1, background: COLORS.bg, borderRadius: 8, padding: 3, border: `1px solid ${COLORS.border}` }}>
              {[['worst', 'Most underpriced'], ['best', 'Most overpriced']].map(([v, l]) => (
                <button key={v} onClick={() => setVarSort(v)} style={{
                  padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', borderRadius: 6, border: 'none', fontFamily: 'inherit',
                  background: varSort === v ? COLORS.surface : 'transparent',
                  color: varSort === v ? (v === 'worst' ? COLORS.red : COLORS.green) : COLORS.textMuted,
                  transition: 'all 0.15s'
                }}>{l}</button>
              ))}
            </div>
          </div>
          {sortedVariance.length === 0
            ? <div style={{ padding: 24, textAlign: 'center', color: COLORS.textMuted, fontSize: 12 }}>No SKUs with selling prices yet</div>
            : sortedVariance.map(({ sku: s, cost: c, variance, variancePct, status }) => {
              const isPos = variance >= 0
              const barPct = Math.min(Math.abs(variance) / stats.maxAbsVariance * 100, 100)
              const statusMeta = STATUS_META[status]
              return (
                <div key={s.sku_code} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7, cursor: 'pointer' }} onClick={() => setSelectedSku(s)}>
                  {s.image_link
                    ? <img src={s.image_link} alt="" style={{ width: 26, height: 26, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} onError={e => { e.target.style.display = 'none' }} />
                    : <div style={{ width: 26, height: 26, borderRadius: 4, background: COLORS.bg, flexShrink: 0 }} />
                  }
                  <span style={{ fontSize: 11, color: COLORS.textMuted, width: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{s.sku_code}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, flexShrink: 0,
                    background: statusMeta.color + '18', color: statusMeta.color,
                  }}>{statusMeta.label}</span>
                  <div style={{ flex: 1, height: 20, background: COLORS.bg, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${barPct}%`,
                      background: isPos ? `linear-gradient(90deg,${COLORS.green}88,${COLORS.green})` :
                        `linear-gradient(90deg,${COLORS.red}88,${COLORS.red})`,
                      borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6, minWidth: 4
                    }}>
                      {barPct > 25 && <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>{isPos ? '+' : ''}{fmt(variance)}</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: isPos ? COLORS.green : COLORS.red, width: 100, textAlign: 'right', flexShrink: 0 }}>
                    {isPos ? '+' : ''}{fmt(variance)} <span style={{ fontSize: 9, fontWeight: 400 }}>({isPos ? '+' : ''}{variancePct?.toFixed(1)}%)</span>
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
