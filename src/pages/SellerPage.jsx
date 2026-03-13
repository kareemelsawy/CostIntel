import { useMemo, useState } from 'react'
import { COLORS } from '../lib/constants'
import { fmt, fmtP } from '../lib/engine'
import { Card, Icon, Btn } from '../components/UI'

// ── Attribute validation rules ───────────────────────────────────────────────
// Flags SKUs with suspicious attributes that sellers commonly get wrong
const VALIDATION_RULES = [
  {
    id: 'zero_dims', label: 'Zero dimensions',
    test: s => !s.width_cm || !s.height_cm || !s.depth_cm,
    severity: 'error', desc: 'Width, height, or depth is 0',
  },
  {
    id: 'tiny_wardrobe', label: 'Unusually small',
    test: s => (s.sub_category === 'Wardrobes' || s.sub_category === 'Dressings') && (s.width_cm < 50 || s.height_cm < 80),
    severity: 'warning', desc: 'Wardrobe/dressing under 50cm wide or 80cm tall',
  },
  {
    id: 'giant_depth', label: 'Excessive depth',
    test: s => s.depth_cm > 100,
    severity: 'warning', desc: 'Depth > 100 cm is unusual for standard furniture',
  },
  {
    id: 'doors_but_open', label: 'Doors with Open type',
    test: s => s.doors_count > 0 && s.door_type === 'Open',
    severity: 'warning', desc: 'Door count > 0 but door type is Open (contradictory)',
  },
  {
    id: 'no_doors_hinged', label: 'Hinged with 0 doors',
    test: s => s.doors_count === 0 && s.door_type === 'Hinged',
    severity: 'warning', desc: 'Door type is Hinged but door count is 0',
  },
  {
    id: 'too_many_doors', label: 'Too many doors',
    test: s => s.doors_count > 0 && s.width_cm > 0 && (s.width_cm / s.doors_count) < 25,
    severity: 'warning', desc: 'Each door would be < 25 cm wide (too narrow)',
  },
  {
    id: 'shelves_exceed_height', label: 'Too many shelves',
    test: s => s.shelves_count > 0 && s.height_cm > 0 && (s.height_cm / s.shelves_count) < 10,
    severity: 'warning', desc: 'Shelf spacing would be < 10 cm (impossibly tight)',
  },
  {
    id: 'spaces_no_match', label: 'Spaces mismatch',
    test: s => s.spaces_count > 0 && s.doors_count > 0 && s.door_type !== 'Open' && s.spaces_count > s.doors_count * 3,
    severity: 'info', desc: 'Spaces count seems very high relative to doors',
  },
  {
    id: 'mirror_no_doors', label: 'Mirror without doors',
    test: s => s.has_mirror && (!s.doors_count || s.doors_count === 0),
    severity: 'info', desc: 'Has mirror but no doors (mirror usually goes on a door)',
  },
  {
    id: 'no_selling_price', label: 'No selling price',
    test: s => !s.selling_price || s.selling_price <= 0,
    severity: 'info', desc: 'Selling price not set — cannot calculate variance',
  },
]

const SEV_COLORS = {
  error: COLORS.red,
  warning: COLORS.amber,
  info: COLORS.textMuted,
}

function validateSku(sku) {
  return VALIDATION_RULES.filter(r => r.test(sku)).map(r => ({ ...r }))
}

// ── Pricing classification (same logic as dashboard) ─────────────────────────
function classifyPricing(sp, recSP) {
  if (!sp || !recSP || recSP <= 0) return 'unpriced'
  const pct = (sp - recSP) / recSP
  if (pct < -0.05) return 'underpriced'
  if (pct > 0.05) return 'overpriced'
  return 'correct'
}

// ── Score calculation (0–100) ────────────────────────────────────────────────
function calcSellerScore(sellerSkus, skuCosts) {
  if (!sellerSkus.length) return { score: 0, breakdown: {} }

  let pricingScore = 50  // base
  let attrScore = 50     // base
  const priced = sellerSkus.filter(s => {
    const c = skuCosts[s.sku_code]
    return s.selling_price > 0 && c?.recommended_selling_price > 0
  })

  // Pricing accuracy: % correctly priced
  if (priced.length > 0) {
    const correct = priced.filter(s => {
      const c = skuCosts[s.sku_code]
      return classifyPricing(s.selling_price, c.recommended_selling_price) === 'correct'
    }).length
    pricingScore = Math.round((correct / priced.length) * 100)
  }

  // Attribute quality: % without validation flags
  const clean = sellerSkus.filter(s => {
    const flags = validateSku(s)
    return flags.filter(f => f.severity !== 'info').length === 0
  }).length
  attrScore = Math.round((clean / sellerSkus.length) * 100)

  const overall = Math.round(pricingScore * 0.6 + attrScore * 0.4)  // weighted: 60% pricing, 40% attributes

  return { score: overall, pricingScore, attrScore, pricedCount: priced.length }
}

function ScoreBadge({ score, size = 'md' }) {
  const color = score >= 75 ? COLORS.green : score >= 50 ? COLORS.amber : COLORS.red
  const sz = size === 'lg' ? 52 : size === 'md' ? 36 : 26
  const fs = size === 'lg' ? 18 : size === 'md' ? 13 : 10
  return (
    <div style={{
      width: sz, height: sz, borderRadius: sz, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: color + '18', border: `2px solid ${color}`, flexShrink: 0,
    }}>
      <span style={{ fontSize: fs, fontWeight: 900, color }}>{score}</span>
    </div>
  )
}

function StatusDot({ status }) {
  const m = { underpriced: { c: COLORS.red, l: 'Under' }, correct: { c: COLORS.green, l: 'OK' }, overpriced: { c: COLORS.amber, l: 'Over' }, unpriced: { c: COLORS.textMuted, l: '—' } }
  const s = m[status] || m.unpriced
  return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: s.c + '18', color: s.c }}>{s.l}</span>
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN SELLER INTELLIGENCE PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function SellerPage({ skus, skuCosts, setSelectedSku }) {
  const [selectedSeller, setSelectedSeller] = useState(null)
  const [flagFilter, setFlagFilter] = useState('all')  // all | errors | warnings

  // ── Compute seller stats ───────────────────────────────────────────────────
  const sellerData = useMemo(() => {
    const bySeller = {}
    skus.forEach(s => {
      const seller = s.seller || 'Unknown'
      if (!bySeller[seller]) bySeller[seller] = []
      bySeller[seller].push(s)
    })

    return Object.entries(bySeller).map(([name, items]) => {
      const scores = calcSellerScore(items, skuCosts)
      const priced = items.filter(s => {
        const c = skuCosts[s.sku_code]
        return s.selling_price > 0 && c?.recommended_selling_price > 0
      })
      const underpriced = priced.filter(s => classifyPricing(s.selling_price, skuCosts[s.sku_code]?.recommended_selling_price) === 'underpriced').length
      const overpriced = priced.filter(s => classifyPricing(s.selling_price, skuCosts[s.sku_code]?.recommended_selling_price) === 'overpriced').length
      const correct = priced.filter(s => classifyPricing(s.selling_price, skuCosts[s.sku_code]?.recommended_selling_price) === 'correct').length

      // Count attribute flags
      let totalFlags = 0, errorFlags = 0, warnFlags = 0
      const flaggedSkus = []
      items.forEach(s => {
        const flags = validateSku(s)
        const serious = flags.filter(f => f.severity !== 'info')
        if (serious.length > 0) {
          flaggedSkus.push({ sku: s, flags: serious })
          totalFlags += serious.length
          errorFlags += serious.filter(f => f.severity === 'error').length
          warnFlags += serious.filter(f => f.severity === 'warning').length
        }
      })

      const avgVariance = priced.length > 0
        ? priced.reduce((a, s) => a + (s.selling_price - (skuCosts[s.sku_code]?.recommended_selling_price || 0)), 0) / priced.length
        : 0

      const categories = [...new Set(items.map(s => s.sub_category))].sort()

      return {
        name, items, scores, priced, underpriced, overpriced, correct,
        totalFlags, errorFlags, warnFlags, flaggedSkus, avgVariance, categories,
      }
    }).sort((a, b) => a.scores.score - b.scores.score)  // worst scores first
  }, [skus, skuCosts])

  const selected = selectedSeller ? sellerData.find(s => s.name === selectedSeller) : null
  const [slSort, setSlSort] = useState({ col: 'score', dir: 'asc' })

  // Sortable header helper
  const STH = ({ col, children, align }) => {
    const active = slSort.col === col
    return (
      <th onClick={() => setSlSort(s => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' })}
        style={{ padding: '10px 12px', textAlign: align || 'center', fontSize: 10, fontWeight: 700, color: active ? COLORS.accent : COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
        {children} {active && <Icon name={slSort.dir === 'asc' ? 'arrowUp' : 'arrowDown'} size={10} color={COLORS.accent} style={{ verticalAlign: 'middle' }}/>}
      </th>
    )
  }

  const sortedSellers = useMemo(() => {
    return [...sellerData].sort((a, b) => {
      let va, vb
      switch(slSort.col) {
        case 'name': va = a.name; vb = b.name; break
        case 'skus': va = a.items.length; vb = b.items.length; break
        case 'pricing': va = a.scores.pricingScore; vb = b.scores.pricingScore; break
        case 'under': va = a.underpriced; vb = b.underpriced; break
        case 'correct': va = a.correct; vb = b.correct; break
        case 'over': va = a.overpriced; vb = b.overpriced; break
        case 'flags': va = a.totalFlags; vb = b.totalFlags; break
        case 'variance': va = a.priced.length ? a.avgVariance : -999999; vb = b.priced.length ? b.avgVariance : -999999; break
        default: va = a.scores.score; vb = b.scores.score
      }
      if (typeof va === 'string') return slSort.dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      return slSort.dir === 'asc' ? va - vb : vb - va
    })
  }, [sellerData, slSort])

  return (
    <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: COLORS.text, letterSpacing: '-0.02em', marginBottom: 4 }}>Seller Intelligence</h2>
        <p style={{ fontSize: 13, color: COLORS.textMuted }}>
          Compare sellers by pricing accuracy, attribute quality, and flag habitual issues. Score = 60% pricing accuracy + 40% attribute quality.
        </p>
      </div>

      {sellerData.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: COLORS.textMuted }}>No sellers found. Import SKUs to see seller data.</div>
      ) : !selected ? (
        /* ── SELLER LIST VIEW ── */
        <>
          {/* Summary cards */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <Card style={{ flex: 1, minWidth: 150, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Total Sellers</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.text }}>{sellerData.length}</div>
            </Card>
            <Card style={{ flex: 1, minWidth: 150, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.red, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Need Attention</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.red }}>{sellerData.filter(s => s.scores.score < 50).length}</div>
              <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 2 }}>Score below 50</div>
            </Card>
            <Card style={{ flex: 1, minWidth: 150, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.amber, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Attribute Flags</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.amber }}>{sellerData.reduce((a, s) => a + s.totalFlags, 0)}</div>
              <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 2 }}>across all sellers</div>
            </Card>
            <Card style={{ flex: 1, minWidth: 150, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.green, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Avg Score</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.green }}>{sellerData.length ? Math.round(sellerData.reduce((a, s) => a + s.scores.score, 0) / sellerData.length) : 0}</div>
            </Card>
          </div>

          {/* Seller table */}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                <STH col="score">Score</STH>
                <STH col="name" align="left">Seller</STH>
                <STH col="skus">SKUs</STH>
                <STH col="pricing">Pricing Accuracy</STH>
                <STH col="under">Under</STH>
                <STH col="correct">Correct</STH>
                <STH col="over">Over</STH>
                <STH col="flags">Attr Flags</STH>
                <STH col="variance">Avg Variance</STH>
                <th style={{ padding: '10px 12px', width: 30 }}/>
              </tr></thead>
              <tbody>{sortedSellers.map(s => {
                const sc = s.scores.score
                const scColor = sc >= 75 ? COLORS.green : sc >= 50 ? COLORS.amber : COLORS.red
                return (
                  <tr key={s.name} style={{ borderBottom: `1px solid ${COLORS.border}`, cursor: 'pointer' }}
                    onClick={() => setSelectedSeller(s.name)}
                    onMouseEnter={e => e.currentTarget.style.background = COLORS.surfaceHover}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}><ScoreBadge score={sc} /></td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: COLORS.text }}>
                      {s.name}
                      <div style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: 400, marginTop: 2 }}>{s.categories.join(', ')}</div>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: COLORS.textDim }}>{s.items.length}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <div style={{ width: 50, height: 5, borderRadius: 3, background: COLORS.border, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${s.scores.pricingScore}%`, background: s.scores.pricingScore >= 70 ? COLORS.green : s.scores.pricingScore >= 40 ? COLORS.amber : COLORS.red, borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.textDim }}>{s.scores.pricingScore}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: s.underpriced > 0 ? COLORS.red : COLORS.textMuted, fontWeight: s.underpriced > 0 ? 700 : 400 }}>{s.underpriced || '—'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: s.correct > 0 ? COLORS.green : COLORS.textMuted, fontWeight: s.correct > 0 ? 700 : 400 }}>{s.correct || '—'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: s.overpriced > 0 ? COLORS.amber : COLORS.textMuted, fontWeight: s.overpriced > 0 ? 700 : 400 }}>{s.overpriced || '—'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      {s.totalFlags > 0 ? (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
                          background: s.errorFlags > 0 ? COLORS.red + '18' : COLORS.amber + '18',
                          color: s.errorFlags > 0 ? COLORS.red : COLORS.amber,
                        }}>{s.totalFlags} flag{s.totalFlags > 1 ? 's' : ''}</span>
                      ) : <span style={{ fontSize: 11, color: COLORS.green, fontWeight: 600 }}>✓ Clean</span>}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, fontSize: 12, color: s.avgVariance >= 0 ? COLORS.green : COLORS.red }}>
                      {s.priced.length > 0 ? (s.avgVariance >= 0 ? '+' : '') + fmt(s.avgVariance) : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <Icon name="eye" size={14} color={COLORS.textMuted} />
                    </td>
                  </tr>
                )
              })}</tbody>
            </table>
          </Card>
        </>
      ) : (
        /* ── SELLER DETAIL VIEW ── */
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <button onClick={() => setSelectedSeller(null)} style={{
              background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8,
              padding: '6px 12px', color: COLORS.textMuted, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>← Back to all sellers</button>
          </div>

          {/* Seller header / scorecard */}
          <Card style={{ marginBottom: 20, padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <ScoreBadge score={selected.scores.score} size="lg" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.text }}>{selected.name}</div>
                <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 3 }}>
                  {selected.items.length} SKUs · {selected.categories.join(', ')}
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 18 }}>
              <div style={{ textAlign: 'center', padding: '12px 8px', background: COLORS.bg, borderRadius: 10 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: selected.scores.pricingScore >= 70 ? COLORS.green : selected.scores.pricingScore >= 40 ? COLORS.amber : COLORS.red }}>{selected.scores.pricingScore}%</div>
                <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 3, fontWeight: 600 }}>Pricing Accuracy</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px 8px', background: COLORS.bg, borderRadius: 10 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: selected.scores.attrScore >= 70 ? COLORS.green : selected.scores.attrScore >= 40 ? COLORS.amber : COLORS.red }}>{selected.scores.attrScore}%</div>
                <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 3, fontWeight: 600 }}>Attribute Quality</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px 8px', background: COLORS.bg, borderRadius: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                  <span style={{ color: COLORS.red, fontWeight: 800, fontSize: 16 }}>{selected.underpriced}</span>
                  <span style={{ color: COLORS.green, fontWeight: 800, fontSize: 16 }}>{selected.correct}</span>
                  <span style={{ color: COLORS.amber, fontWeight: 800, fontSize: 16 }}>{selected.overpriced}</span>
                </div>
                <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 3, fontWeight: 600 }}>Under · OK · Over</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px 8px', background: COLORS.bg, borderRadius: 10 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: selected.totalFlags > 0 ? COLORS.amber : COLORS.green }}>{selected.totalFlags}</div>
                <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 3, fontWeight: 600 }}>Attribute Flags</div>
              </div>
            </div>
          </Card>

          {/* Attribute flags section */}
          {selected.flaggedSkus.length > 0 && (
            <Card style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>⚠ Attribute Issues</div>
                  <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>SKUs with suspicious or contradictory attributes — likely submitted incorrectly by the seller</div>
                </div>
                <div style={{ display: 'flex', gap: 4, background: COLORS.bg, borderRadius: 8, padding: 3 }}>
                  {[['all', 'All'], ['errors', 'Errors'], ['warnings', 'Warnings']].map(([v, l]) => (
                    <button key={v} onClick={() => setFlagFilter(v)} style={{
                      padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', borderRadius: 5, border: 'none', fontFamily: 'inherit',
                      background: flagFilter === v ? COLORS.surface : 'transparent',
                      color: flagFilter === v ? COLORS.text : COLORS.textMuted,
                    }}>{l}</button>
                  ))}
                </div>
              </div>
              {selected.flaggedSkus
                .filter(({ flags }) => flagFilter === 'all' || flags.some(f => f.severity === (flagFilter === 'errors' ? 'error' : 'warning')))
                .map(({ sku, flags }) => (
                  <div key={sku.sku_code} style={{
                    padding: '10px 14px', marginBottom: 6, background: COLORS.bg, borderRadius: 8,
                    border: `1px solid ${COLORS.border}`, cursor: 'pointer',
                  }} onClick={() => setSelectedSku(sku)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.accent, fontFamily: 'monospace' }}>{sku.sku_code}</span>
                      <span style={{ fontSize: 11, color: COLORS.textMuted, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sku.name}</span>
                      <span style={{ fontSize: 10, color: COLORS.textMuted }}>{sku.width_cm}×{sku.depth_cm}×{sku.height_cm} cm</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {flags.filter(f => flagFilter === 'all' || f.severity === (flagFilter === 'errors' ? 'error' : 'warning')).map(f => (
                        <span key={f.id} style={{
                          fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                          background: SEV_COLORS[f.severity] + '15', color: SEV_COLORS[f.severity],
                        }} title={f.desc}>{f.label}</span>
                      ))}
                    </div>
                  </div>
                ))}
            </Card>
          )}

          {/* SKU list for this seller */}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>All SKUs by {selected.name}</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  {['SKU', 'Name', 'Category', 'Dims', 'COGS', 'Rec. Price', 'Selling Price', 'Status', 'Flags'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>{selected.items.map(s => {
                  const c = skuCosts[s.sku_code]
                  const status = c ? classifyPricing(s.selling_price, c?.recommended_selling_price) : 'unpriced'
                  const flags = validateSku(s).filter(f => f.severity !== 'info')
                  return (
                    <tr key={s.sku_code} style={{ borderBottom: `1px solid ${COLORS.border}`, cursor: 'pointer' }}
                      onClick={() => setSelectedSku(s)}
                      onMouseEnter={e => e.currentTarget.style.background = COLORS.surfaceHover}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: COLORS.accent, fontSize: 11, fontFamily: 'monospace' }}>{s.sku_code}</td>
                      <td style={{ padding: '8px 12px', color: COLORS.text, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</td>
                      <td style={{ padding: '8px 12px' }}><span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: COLORS.purple + '18', color: COLORS.purple }}>{s.sub_category}</span></td>
                      <td style={{ padding: '8px 12px', color: COLORS.textMuted, fontFamily: 'monospace', fontSize: 11 }}>{s.width_cm}×{s.depth_cm}×{s.height_cm}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: COLORS.text }}>{c ? fmt(c.cogs) : '—'}</td>
                      <td style={{ padding: '8px 12px', color: COLORS.accent, fontWeight: 700 }}>{c ? fmt(c.recommended_selling_price) : '—'}</td>
                      <td style={{ padding: '8px 12px', color: COLORS.textDim }}>{s.selling_price ? fmt(s.selling_price) : '—'}</td>
                      <td style={{ padding: '8px 12px' }}><StatusDot status={status} /></td>
                      <td style={{ padding: '8px 12px' }}>
                        {flags.length > 0 ? (
                          <span style={{ fontSize: 10, fontWeight: 600, color: flags.some(f => f.severity === 'error') ? COLORS.red : COLORS.amber }}>
                            {flags.length} flag{flags.length > 1 ? 's' : ''}
                          </span>
                        ) : <span style={{ fontSize: 10, color: COLORS.green }}>✓</span>}
                      </td>
                    </tr>
                  )
                })}</tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
