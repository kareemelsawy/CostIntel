import { useState } from 'react'
import { COLORS } from '../lib/constants'
import { fmt } from '../lib/engine'
import { Icon, Btn, Card } from '../components/UI'

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

export default function PricingPage({ materials, setMaterials, accessories, setAccessories, commercial, setCommercial, setEditingMat, toast }) {
  const [accForm, setAccForm] = useState({ ...accessories })
  const [comForm, setComForm] = useState({ ...commercial })

  function savePricing() {
    setAccessories({ ...accForm })
    setCommercial({ ...comForm })
    toast('Pricing configuration updated')
  }

  function AccField({ label, k, unit }) {
    return (
      <div>
        <label style={lSt()}>{label}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="number" value={accForm[k]} onChange={e => setAccForm(p => ({ ...p, [k]: Number(e.target.value) }))} style={iSt()} min={0} />
          {unit && <span style={{ fontSize: 11, color: COLORS.textMuted, whiteSpace: 'nowrap' }}>{unit}</span>}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: COLORS.text, letterSpacing: '-0.02em', marginBottom: 4 }}>Price Configuration</h2>
          <p style={{ fontSize: 13, color: COLORS.textMuted }}>Manage raw materials, accessories, and commercial terms. All calculations pull from here.</p>
        </div>
        <Btn onClick={savePricing}><Icon name="check" size={14} /> Save Changes</Btn>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
        {/* Materials */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>Raw Materials</span>
            <Btn variant="secondary" size="sm" onClick={() => setEditingMat({ material_id: '', name: '', thickness_mm: 17, sheet_width_cm: 244, sheet_height_cm: 122, price_per_sheet: 0, _isNew: true })}>
              <Icon name="plus" size={14} /> Add
            </Btn>
          </div>
          {materials.map(m => (
            <div key={m.material_id} style={{ background: COLORS.bg, borderRadius: 10, padding: '14px 16px', marginBottom: 8, border: `1px solid ${COLORS.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>
                    {m.thickness_mm}mm · Sheet: {m.sheet_width_cm}×{m.sheet_height_cm} cm · ID: {m.material_id}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => setEditingMat({ ...m })} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: COLORS.textMuted }}><Icon name="edit" size={14} /></button>
                  <button onClick={() => { setMaterials(prev => prev.filter(x => x.material_id !== m.material_id)); toast('Material removed') }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: COLORS.textMuted }}><Icon name="trash" size={14} /></button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: COLORS.accent }}>{fmt(m.price_per_sheet)}</span>
                <span style={{ fontSize: 11, color: COLORS.textMuted }}>/ sheet</span>
              </div>
            </div>
          ))}
          {materials.length === 0 && <div style={{ color: COLORS.textMuted, fontSize: 13, padding: 12 }}>No materials configured. Add one above.</div>}
        </Card>

        <div>
          {/* Accessories */}
          <Card style={{ marginBottom: 20 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, display: 'block', marginBottom: 16 }}>Accessories Pricing</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <AccField label="Hinge" k="hinge_price" unit="/pc" />
              <AccField label="Drawer Slide" k="drawer_slide_price" unit="/pair" />
              <AccField label="Handle" k="handle_price" unit="/pc" />
              <AccField label="Shelf Support" k="shelf_support_price" unit="/pc" />
              <AccField label="Sliding Mechanism" k="sliding_mechanism_price" unit="/set" />
              <AccField label="Mirror" k="mirror_price_per_m2" unit="/m²" />
              <div style={{ gridColumn: '1/-1' }}>
                <AccField label="Edge Banding" k="edge_banding_price_per_meter" unit="/meter" />
              </div>
            </div>
          </Card>

          {/* Commercial */}
          <Card>
            <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, display: 'block', marginBottom: 16 }}>Commercial Terms</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lSt()}>VAT (%)</label>
                <input type="number" value={(comForm.vat_percent * 100).toFixed(0)} onChange={e => setComForm(p => ({ ...p, vat_percent: Number(e.target.value) / 100 }))} style={iSt()} min={0} max={100} />
              </div>
              <div>
                <label style={lSt()}>Commission (%)</label>
                <input type="number" value={(comForm.commission_percent * 100).toFixed(0)} onChange={e => setComForm(p => ({ ...p, commission_percent: Number(e.target.value) / 100 }))} style={iSt()} min={0} max={100} />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
