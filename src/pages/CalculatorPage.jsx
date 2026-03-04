import { useState, useMemo, useEffect } from 'react'
import { COLORS, CATEGORIES, DOOR_TYPES } from '../lib/constants'
import { calculateSKUCost, skuToEngineInput, fmt, fmtP } from '../lib/engine'
import { Icon, Btn, Card, Toggle } from '../components/UI'

const iSt = () => ({
  width: '100%', background: COLORS.inputBg, border: `1px solid ${COLORS.border}`,
  borderRadius: 8, padding: '8px 12px', color: COLORS.text, fontSize: 13,
  outline: 'none', lineHeight: 1.5, fontFamily: 'inherit',
})
const lSt = () => ({
  fontSize: 11, fontWeight: 700, color: COLORS.textMuted,
  letterSpacing: '0.06em', textTransform: 'uppercase',
  display: 'block', marginBottom: 6, lineHeight: 1.4,
})

export default function CalculatorPage({ materials, accessories, commercial, setSkus, toast, prefill, clearPrefill }) {
  const defaultForm = {
    name: 'New Estimate', seller: '', sub_category: 'Wardrobes',
    width_cm: 120, depth_cm: 60, height_cm: 210,
    door_type: 'Hinged', doors_count: 2, drawers_count: 0,
    shelves_count: 4, partitions_count: 1,
    has_sliding_system: false, has_mirror: false,
    body_material_id: 'MDF_17', back_material_id: 'MDF_4', door_material_id: 'MDF_17',
    selling_price: 0,
  }

  const [form, setForm] = useState(prefill || defaultForm)

  useEffect(() => {
    if (prefill) { setForm(prefill); clearPrefill() }
  }, [prefill])

  const set = (k, v) => setForm(p => {
    const next = { ...p, [k]: v }
    if (k === 'door_type') next.has_sliding_system = v === 'Sliding'
    return next
  })

  const input = skuToEngineInput(form)
  const cost = useMemo(() => calculateSKUCost(input, materials, accessories, commercial), [form, materials, accessories, commercial])
  const m = cost?.commercial?.net_margin_percent || 0
  const mc = m > 20 ? COLORS.green : m > 0 ? COLORS.amber : COLORS.red

  const matOpts = materials.map(mt => ({ value: mt.material_id, label: `${mt.name} (${fmt(mt.price_per_sheet)}/sheet)` }))

  function Field({ label, k, type = 'number', options, min = 0 }) {
    if (options) return (
      <div>
        <label style={lSt()}>{label}</label>
        <select value={form[k]} onChange={e => set(k, e.target.value)} style={{ ...iSt(), cursor: 'pointer' }}>
          {options.map(o => typeof o === 'string'
            ? <option key={o} value={o}>{o}</option>
            : <option key={o.value} value={o.value}>{o.label}</option>
          )}
        </select>
      </div>
    )
    if (type === 'toggle') return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
        <label style={{ ...lSt(), marginBottom: 0 }}>{label}</label>
        <Toggle value={form[k]} onChange={v => set(k, v)} />
      </div>
    )
    return (
      <div>
        <label style={lSt()}>{label}</label>
        <input type={type === 'text' ? 'text' : 'number'} value={form[k] ?? ''} onChange={e => set(k, type === 'text' ? e.target.value : Number(e.target.value))} min={min} style={iSt()} />
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: COLORS.text, letterSpacing: '-0.02em', marginBottom: 4 }}>Quick Calculator</h2>
      <p style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 20 }}>Enter dimensions and attributes — cost updates live as you type</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px,1fr) minmax(280px,1fr)', gap: 24, alignItems: 'start' }}>
        {/* LEFT — inputs */}
        <Card>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 16 }}>SKU Attributes</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1/-1' }}><Field label="Product Name" k="name" type="text" /></div>
            <Field label="Category" k="sub_category" options={CATEGORIES} />
            <Field label="Door Type" k="door_type" options={DOOR_TYPES} />
            <Field label="Width (cm)" k="width_cm" />
            <Field label="Depth (cm)" k="depth_cm" />
            <Field label="Height (cm)" k="height_cm" />
            <Field label="No. of Doors" k="doors_count" />
            <Field label="No. of Drawers" k="drawers_count" />
            <Field label="No. of Shelves" k="shelves_count" />
            <Field label="No. of Partitions" k="partitions_count" />
            <div />

            {/* Material Assignment per spec */}
            <div style={{ gridColumn: '1/-1', borderTop: `1px solid ${COLORS.border}`, paddingTop: 12, marginTop: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.textDim, marginBottom: 10 }}>Material Assignment</div>
            </div>
            <Field label="Body Material" k="body_material_id" options={matOpts} />
            <Field label="Door Material" k="door_material_id" options={matOpts} />
            <Field label="Back Material" k="back_material_id" options={matOpts} />
            <div />

            <div style={{ gridColumn: '1/-1' }}><Field label="Has Mirror" k="has_mirror" type="toggle" /></div>

            <div style={{ gridColumn: '1/-1', borderTop: `1px solid ${COLORS.border}`, paddingTop: 12 }}>
              <Field label="Selling Price (optional — for margin)" k="selling_price" />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <Btn size="sm" onClick={() => {
              const newSku = { ...form, sku_code: `EST-${Date.now().toString(36).toUpperCase()}` }
              setSkus(prev => [...prev, newSku])
              toast('Saved to catalog')
            }}><Icon name="save" size={14} /> Save to Catalog</Btn>
          </div>
        </Card>

        {/* RIGHT — live results */}
        <div>
          {cost && !cost.error && (
            <>
              {/* Cost breakdown */}
              <Card style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>Cost Breakdown</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="zap" size={14} color={COLORS.amber} />
                    <span style={{ fontSize: 11, color: COLORS.amber, fontWeight: 600 }}>Live</span>
                  </div>
                </div>
                {[
                  { label: 'Material Cost', val: cost.total_material_cost },
                  { label: `Edge Banding (${cost.edge_banding.total_edge_meters.toFixed(1)} m)`, val: cost.edge_banding.edge_cost },
                  { label: `Accessories (${cost.accessories.items.length} items)`, val: cost.accessories.total },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${COLORS.border}`, fontSize: 13 }}>
                    <span style={{ color: COLORS.textDim }}>{r.label}</span>
                    <span style={{ fontWeight: 600, color: COLORS.text }}>{fmt(r.val)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontWeight: 800, fontSize: 17 }}>
                  <span style={{ color: COLORS.text }}>Production Cost</span>
                  <span style={{ color: COLORS.accent }}>{fmt(cost.production_cost)}</span>
                </div>
              </Card>

              {/* Margin */}
              {form.selling_price > 0 && cost.commercial && (
                <Card style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 12 }}>Margin Analysis</div>
                  <div style={{ textAlign: 'center', padding: '16px 0' }}>
                    <div style={{ fontSize: 40, fontWeight: 900, color: mc, letterSpacing: '-0.03em' }}>{fmtP(m)}</div>
                    <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>Net Margin</div>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: COLORS.border, overflow: 'hidden', marginBottom: 12 }}>
                    <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, m + 50))}%`, background: mc, borderRadius: 4, transition: 'width 0.4s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: COLORS.textDim }}>Net Profit</span>
                    <span style={{ fontWeight: 700, color: mc }}>{fmt(cost.commercial.net_profit)}</span>
                  </div>
                </Card>
              )}

              {/* Sheet Utilization */}
              <Card>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 12 }}>Sheet Utilization</div>
                {cost.materials_breakdown.map((mb, i) => {
                  const util = (mb.total_area_cm2 / (mb.required_sheets * mb.sheet_area_cm2)) * 100
                  const uc = util > 80 ? COLORS.green : util > 50 ? COLORS.amber : COLORS.red
                  return (
                    <div key={i} style={{ marginBottom: i < cost.materials_breakdown.length - 1 ? 12 : 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                        <span style={{ color: COLORS.textDim }}>{mb.material_name} — {mb.required_sheets} sheet{mb.required_sheets > 1 ? 's' : ''}</span>
                        <span style={{ fontWeight: 600, color: uc }}>{util.toFixed(0)}%</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: COLORS.border }}>
                        <div style={{ height: '100%', borderRadius: 3, width: `${util}%`, background: uc, transition: 'width 0.4s' }} />
                      </div>
                    </div>
                  )
                })}
              </Card>
            </>
          )}
          {cost?.error && <Card><p style={{ color: COLORS.red, fontSize: 13 }}>Error: {cost.error}</p></Card>}
        </div>
      </div>
    </div>
  )
}
