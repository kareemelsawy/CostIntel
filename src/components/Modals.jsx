import { useState } from 'react'
import { COLORS, CATEGORIES, DOOR_TYPES } from '../lib/constants'
import { calculateSKUCost, skuToEngineInput, fmt, fmtP } from '../lib/engine'
import { Icon, Btn, Modal, StatCard, Toggle } from '../components/UI'

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

// ═════════════════════════════════════════════════════════════════════════════
// SKU DETAIL — full traceable cost report
// ═════════════════════════════════════════════════════════════════════════════
export function SKUDetailModal({ sku, materials, accessories, commercial, onClose, onEdit, onCalc }) {
  if (!sku) return null
  const input = skuToEngineInput(sku)
  const cost = calculateSKUCost(input, materials, accessories, commercial)
  if (cost.error) return <Modal onClose={onClose}><p style={{ color: COLORS.red }}>{cost.error}</p></Modal>

  const m = cost.commercial?.net_margin_percent || 0
  const mc = m > 20 ? COLORS.green : m > 0 ? COLORS.amber : COLORS.red

  return (
    <Modal onClose={onClose} width={720}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.accent, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Cost Intelligence Report</div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: COLORS.text }}>{sku.name || sku.sku_code}</h3>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>
            {sku.sku_code} · {sku.sub_category} · {sku.width_cm}×{sku.depth_cm}×{sku.height_cm} cm
            {sku.doors_count > 0 && ` · ${sku.doors_count} ${sku.door_type} door${sku.doors_count > 1 ? 's' : ''}`}
            {sku.drawers_count > 0 && ` · ${sku.drawers_count} drawer${sku.drawers_count > 1 ? 's' : ''}`}
            {sku.partitions_count > 0 && ` · ${sku.partitions_count} partition${sku.partitions_count > 1 ? 's' : ''}`}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', padding: 4 }}><Icon name="x" size={18} /></button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard label="Production Cost" value={fmt(cost.production_cost)} color={COLORS.amber} icon="box" />
        <StatCard label="Net Profit" value={cost.commercial ? fmt(cost.commercial.net_profit) : '—'} color={cost.commercial?.net_profit > 0 ? COLORS.green : COLORS.red} icon="dollar" />
        <StatCard label="Net Margin" value={cost.commercial ? fmtP(m) : '—'} color={mc} icon="chart" />
      </div>

      {/* MATERIAL BREAKDOWN — fully traceable panel-by-panel */}
      <div style={{ marginBottom: 16 }}>
        <div style={lSt()}>Material Breakdown (traceable)</div>
        <div style={{ background: COLORS.bg, borderRadius: 10, overflow: 'hidden', marginTop: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                {['Material', 'Panel', 'Qty', 'Unit Area', 'Total Area', 'Sheets', 'Cost'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Material' || h === 'Panel' ? 'left' : 'right', color: COLORS.textMuted, fontWeight: 600, fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cost.materials_breakdown.map((mb, i) =>
                mb.panels.map((p, j) => (
                  <tr key={`${i}-${j}`} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                    {j === 0 && (
                      <td rowSpan={mb.panels.length} style={{ padding: '8px 10px', fontWeight: 600, color: COLORS.text, verticalAlign: 'top', borderRight: `1px solid ${COLORS.border}` }}>
                        {mb.material_name}<br /><span style={{ fontSize: 10, color: COLORS.textMuted }}>{fmt(mb.price_per_sheet)}/sheet</span>
                      </td>
                    )}
                    <td style={{ padding: '6px 10px', color: COLORS.textDim }}>{p.name}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', color: COLORS.textDim }}>{p.quantity}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', color: COLORS.textDim }}>{fmt(p.unit_area_cm2)}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', color: COLORS.text }}>{fmt(p.total_area_cm2)}</td>
                    {j === 0 && <td rowSpan={mb.panels.length} style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: COLORS.text, verticalAlign: 'top', borderLeft: `1px solid ${COLORS.border}` }}>{mb.required_sheets}</td>}
                    {j === 0 && <td rowSpan={mb.panels.length} style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: COLORS.accent, verticalAlign: 'top' }}>{fmt(mb.material_cost)}</td>}
                  </tr>
                ))
              )}
              <tr style={{ background: COLORS.surfaceHover }}>
                <td colSpan={5} style={{ padding: '8px 10px', fontWeight: 700, color: COLORS.text }}>Edge Banding ({cost.edge_banding.total_edge_meters.toFixed(1)} m)</td>
                <td />
                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: COLORS.accent }}>{fmt(cost.edge_banding.edge_cost)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ACCESSORIES */}
      <div style={{ marginBottom: 16 }}>
        <div style={lSt()}>Accessories</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8, marginTop: 8 }}>
          {cost.accessories.items.map(a => (
            <div key={a.name} style={{ background: COLORS.bg, borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 2 }}>{a.name} ({a.area_m2 ? `${a.area_m2.toFixed(2)} m²` : a.quantity})</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{fmt(a.cost)}</div>
              <div style={{ fontSize: 10, color: COLORS.textMuted }}>@ {fmt(a.unit_price)} each</div>
            </div>
          ))}
          {cost.accessories.items.length === 0 && <div style={{ color: COLORS.textMuted, fontSize: 12 }}>No accessories</div>}
        </div>
      </div>

      {/* COMMERCIAL WATERFALL */}
      {cost.commercial && (
        <div>
          <div style={lSt()}>Commercial Analysis</div>
          <div style={{ background: COLORS.bg, borderRadius: 10, padding: 16, marginTop: 8 }}>
            {[
              { label: 'Selling Price', val: cost.commercial.selling_price, color: COLORS.text, sign: '' },
              { label: `Commission (${(commercial.commission_percent * 100).toFixed(0)}%)`, val: cost.commercial.commission, color: COLORS.red, sign: '−' },
              { label: `VAT (${(commercial.vat_percent * 100).toFixed(0)}%)`, val: cost.commercial.vat, color: COLORS.red, sign: '−' },
              { label: 'Production Cost', val: cost.production_cost, color: COLORS.red, sign: '−' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: COLORS.textDim }}>{r.label}</span>
                <span style={{ color: r.color, fontWeight: 600 }}>{r.sign}{fmt(r.val)}</span>
              </div>
            ))}
            <div style={{ height: 1, background: COLORS.border, margin: '12px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800 }}>
              <span style={{ color: COLORS.text }}>Net Profit</span>
              <span style={{ color: mc }}>{fmt(cost.commercial.net_profit)} ({fmtP(m)})</span>
            </div>
            <div style={{ marginTop: 12, height: 8, borderRadius: 4, background: COLORS.border, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, m + 50))}%`, background: mc, borderRadius: 4, transition: 'width 0.4s' }} />
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
        <Btn variant="secondary" size="sm" onClick={() => { onEdit(sku); onClose() }}><Icon name="edit" size={14} /> Edit</Btn>
        <Btn size="sm" onClick={() => { onCalc(sku); onClose() }}><Icon name="calc" size={14} /> Open in Calculator</Btn>
      </div>
    </Modal>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// EDIT SKU MODAL
// ═════════════════════════════════════════════════════════════════════════════
export function EditSKUModal({ sku, materials, onSave, onClose }) {
  const [f, setF] = useState({ ...sku })
  const set = (k, v) => setF(p => {
    const next = { ...p, [k]: v }
    if (k === 'door_type') next.has_sliding_system = v === 'Sliding'
    return next
  })
  const isNew = sku._isNew

  const matOpts = materials.map(m => ({ value: m.material_id, label: m.name }))

  function save() {
    if (!f.sku_code && isNew) f.sku_code = `SKU-${Date.now().toString(36).toUpperCase()}`
    onSave(f, isNew)
    onClose()
  }

  return (
    <Modal onClose={onClose} width={540}>
      <h3 style={{ fontSize: 16, fontWeight: 800, color: COLORS.text, marginBottom: 20 }}>{isNew ? 'Add New SKU' : 'Edit SKU'}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={lSt()}>SKU Code</label>
          <input value={f.sku_code || ''} onChange={e => set('sku_code', e.target.value)} style={iSt()} placeholder="Auto-generated if empty" />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={lSt()}>Product Name</label>
          <input value={f.name || ''} onChange={e => set('name', e.target.value)} style={iSt()} />
        </div>
        <div>
          <label style={lSt()}>Seller</label>
          <input value={f.seller || ''} onChange={e => set('seller', e.target.value)} style={iSt()} />
        </div>
        <div>
          <label style={lSt()}>Category</label>
          <select value={f.sub_category} onChange={e => set('sub_category', e.target.value)} style={{ ...iSt(), cursor: 'pointer' }}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div><label style={lSt()}>Width (cm)</label><input type="number" value={f.width_cm} onChange={e => set('width_cm', Number(e.target.value))} style={iSt()} min={0} /></div>
        <div><label style={lSt()}>Depth (cm)</label><input type="number" value={f.depth_cm} onChange={e => set('depth_cm', Number(e.target.value))} style={iSt()} min={0} /></div>
        <div><label style={lSt()}>Height (cm)</label><input type="number" value={f.height_cm} onChange={e => set('height_cm', Number(e.target.value))} style={iSt()} min={0} /></div>
        <div>
          <label style={lSt()}>Door Type</label>
          <select value={f.door_type} onChange={e => set('door_type', e.target.value)} style={{ ...iSt(), cursor: 'pointer' }}>
            {DOOR_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div><label style={lSt()}>No. of Doors</label><input type="number" value={f.doors_count} onChange={e => set('doors_count', Number(e.target.value))} style={iSt()} min={0} /></div>
        <div><label style={lSt()}>No. of Drawers</label><input type="number" value={f.drawers_count} onChange={e => set('drawers_count', Number(e.target.value))} style={iSt()} min={0} /></div>
        <div><label style={lSt()}>No. of Shelves</label><input type="number" value={f.shelves_count} onChange={e => set('shelves_count', Number(e.target.value))} style={iSt()} min={0} /></div>
        <div><label style={lSt()}>No. of Partitions</label><input type="number" value={f.partitions_count} onChange={e => set('partitions_count', Number(e.target.value))} style={iSt()} min={0} /></div>

        {/* Material selectors */}
        <div>
          <label style={lSt()}>Body Material</label>
          <select value={f.body_material_id} onChange={e => set('body_material_id', e.target.value)} style={{ ...iSt(), cursor: 'pointer' }}>
            {matOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label style={lSt()}>Door Material</label>
          <select value={f.door_material_id} onChange={e => set('door_material_id', e.target.value)} style={{ ...iSt(), cursor: 'pointer' }}>
            {matOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label style={lSt()}>Back Material</label>
          <select value={f.back_material_id} onChange={e => set('back_material_id', e.target.value)} style={{ ...iSt(), cursor: 'pointer' }}>
            {matOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div><label style={lSt()}>Selling Price</label><input type="number" value={f.selling_price} onChange={e => set('selling_price', Number(e.target.value))} style={iSt()} min={0} /></div>

        <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
          <label style={{ ...lSt(), marginBottom: 0 }}>Has Mirror</label>
          <Toggle value={f.has_mirror} onChange={v => set('has_mirror', v)} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save}>{isNew ? 'Add SKU' : 'Save Changes'}</Btn>
      </div>
    </Modal>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// EDIT MATERIAL MODAL
// ═════════════════════════════════════════════════════════════════════════════
export function EditMaterialModal({ mat, onSave, onClose }) {
  const [f, setF] = useState({ ...mat })
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const isNew = mat._isNew

  function save() {
    if (!f.material_id) f.material_id = f.name.replace(/\s+/g, '_').toUpperCase()
    onSave(f, isNew)
    onClose()
  }

  return (
    <Modal onClose={onClose} width={440}>
      <h3 style={{ fontSize: 16, fontWeight: 800, color: COLORS.text, marginBottom: 20 }}>{isNew ? 'Add Raw Material' : 'Edit Material'}</h3>
      <div style={{ display: 'grid', gap: 12 }}>
        <div>
          <label style={lSt()}>Material Name</label>
          <input value={f.name || ''} onChange={e => set('name', e.target.value)} style={iSt()} placeholder="e.g. MDF 25mm" />
        </div>
        <div>
          <label style={lSt()}>Material ID</label>
          <input value={f.material_id || ''} onChange={e => set('material_id', e.target.value)} style={iSt()} placeholder="e.g. MDF_25 (auto if empty)" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div><label style={lSt()}>Thickness (mm)</label><input type="number" value={f.thickness_mm} onChange={e => set('thickness_mm', Number(e.target.value))} style={iSt()} /></div>
          <div><label style={lSt()}>Sheet W (cm)</label><input type="number" value={f.sheet_width_cm} onChange={e => set('sheet_width_cm', Number(e.target.value))} style={iSt()} /></div>
          <div><label style={lSt()}>Sheet H (cm)</label><input type="number" value={f.sheet_height_cm} onChange={e => set('sheet_height_cm', Number(e.target.value))} style={iSt()} /></div>
        </div>
        <div>
          <label style={lSt()}>Price per Sheet</label>
          <input type="number" value={f.price_per_sheet} onChange={e => set('price_per_sheet', Number(e.target.value))} style={iSt()} min={0} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save}>{isNew ? 'Add Material' : 'Save'}</Btn>
      </div>
    </Modal>
  )
}
