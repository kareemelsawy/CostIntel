/**
 * Costing Engine v3 — uses revised CSV attributes
 * partitions derived from spaces_count - 1 (spaces = compartments between partitions)
 */

function generatePanels(sku, matMap) {
  const { width_cm:w, depth_cm:d, height_cm:h, doors_count:dc, shelves_count:sc,
          partitions_count:pc, body_material_id:bm, back_material_id:bkm, door_material_id:dm } = sku
  const bodyMat = matMap[bm], backMat = matMap[bkm], doorMat = matMap[dm]
  if (!bodyMat) return { error: `Body material "${bm}" not found`, panels: [] }
  if (!backMat) return { error: `Back material "${bkm}" not found`, panels: [] }
  if (dc > 0 && !doorMat) return { error: `Door material "${dm}" not found`, panels: [] }

  const panels = []
  panels.push({ name:'Side Panels', qty:2, unit_area:h*d, total_area:2*h*d, mid:bm, mat:bodyMat, edge_cm:2*h })
  panels.push({ name:'Top Panel', qty:1, unit_area:w*d, total_area:w*d, mid:bm, mat:bodyMat, edge_cm:w })
  panels.push({ name:'Bottom Panel', qty:1, unit_area:w*d, total_area:w*d, mid:bm, mat:bodyMat, edge_cm:w })
  if (pc > 0) panels.push({ name:'Partitions', qty:pc, unit_area:h*d, total_area:pc*h*d, mid:bm, mat:bodyMat, edge_cm:pc*h })
  if (sc > 0) panels.push({ name:'Shelves', qty:sc, unit_area:w*d, total_area:sc*w*d, mid:bm, mat:bodyMat, edge_cm:sc*w })
  if (dc > 0) {
    const dw = w/dc, da = h*dw
    panels.push({ name:'Doors', qty:dc, unit_area:da, total_area:dc*da, mid:dm, mat:doorMat, edge_cm:dc*2*(h+dw) })
  }
  panels.push({ name:'Back Panel', qty:1, unit_area:w*h, total_area:w*h, mid:bkm, mat:backMat, edge_cm:0 })
  return { error: null, panels }
}

function groupAndConvert(panels, useGood) {
  const groups = {}
  panels.forEach(p => {
    if (!groups[p.mid]) groups[p.mid] = { mid:p.mid, mat:p.mat, total_area:0, panels:[] }
    groups[p.mid].total_area += p.total_area
    groups[p.mid].panels.push(p)
  })
  return Object.values(groups).map(g => {
    const sa = g.mat.sheet_width_cm * g.mat.sheet_height_cm
    const sheets = Math.ceil(g.total_area / sa)
    const price = useGood ? (g.mat.price_good || g.mat.price) : g.mat.price
    return { ...g, sheet_area:sa, sheets, cost: sheets * price, price_used:price }
  })
}

function calcEdge(panels, edgePricePerM) {
  const cm = panels.reduce((s, p) => s + (p.edge_cm || 0), 0)
  return { total_cm:cm, total_m: cm/100, cost: (cm/100) * edgePricePerM }
}

function calcAccessories(sku, accList, useGood) {
  const { doors_count:dc, drawers_count:dwc, shelves_count:sc, has_sliding_system:sl,
          has_mirror:mir, mirror_count:mirC, width_cm:w, height_cm:h, depth_cm:d,
          handle_type:ht, hinge_id, handle_id, drawer_slide_id } = sku
  const byId = {}; accList.forEach(a => { byId[a.acc_id] = a })
  const items = []
  const gp = (id) => { const a = byId[id]; return a ? (useGood ? (a.price_good||a.price) : a.price) : 0 }
  const findSlide = () => {
    if (d <= 32) return 'SLIDE_30'; if (d <= 37) return 'SLIDE_35'; if (d <= 42) return 'SLIDE_40'
    if (d <= 47) return 'SLIDE_45'; if (d <= 52) return 'SLIDE_50'; return 'SLIDE_55'
  }

  // Hinges (only non-sliding, only if not handleless open)
  if (dc > 0 && !sl) {
    const hid = hinge_id || 'HINGE_FULL'
    const qty = dc * 3
    items.push({ name: byId[hid]?.name || 'Hinge', acc_id:hid, qty, unit_price:gp(hid), cost: qty*gp(hid) })
  }

  // Drawer slides
  if (dwc > 0) {
    const sid = drawer_slide_id || findSlide()
    items.push({ name: byId[sid]?.name || 'Drawer Slide', acc_id:sid, qty:dwc, unit_price:gp(sid), cost: dwc*gp(sid) })
  }

  // Handles (skip if handleless)
  if ((dc + dwc > 0) && ht !== 'Handleless') {
    const hid = handle_id || 'HANDLE_128'
    const qty = dc + dwc
    items.push({ name: byId[hid]?.name || 'Handle', acc_id:hid, qty, unit_price:gp(hid), cost: qty*gp(hid) })
  }

  // Shelf supports
  if (sc > 0) {
    const qty = sc * 4
    items.push({ name:'Shelf Supports', acc_id:'SHELF_SUPPORT', qty, unit_price:gp('SHELF_SUPPORT'), cost: qty*gp('SHELF_SUPPORT') })
  }

  // Sliding mechanism
  if (sl) {
    items.push({ name: byId['GLASS_SLIDE']?.name || 'Sliding Door', acc_id:'GLASS_SLIDE', qty:1, unit_price:gp('GLASS_SLIDE'), cost: gp('GLASS_SLIDE') })
    items.push({ name: byId['LATCH_SLIDE']?.name || 'Slide Latch', acc_id:'LATCH_SLIDE', qty:1, unit_price:gp('LATCH_SLIDE'), cost: gp('LATCH_SLIDE') })
  }

  // Mirror — use mirror_count if provided, else full front area
  if (mir) {
    const mc = Number(mirC) || dc || 1
    const mirrorW = dc > 0 ? w / dc : w
    const area = (h * mirrorW * mc) / 10000
    items.push({ name:'Mirror', acc_id:'MIRROR_M2', qty:mc, area_m2:area, unit_price:gp('MIRROR_M2'), cost: area*gp('MIRROR_M2') })
  }

  return { items, total: items.reduce((s, i) => s + i.cost, 0) }
}

export function calculateSKUCost(sku, materials, accList, commercial, useGoodQuality = false) {
  const matMap = {}; materials.forEach(m => { matMap[m.material_id] = m })

  // Derive partitions from spaces: partitions = spaces - 1 (min 0)
  const spacesCount = Number(sku.spaces_count) || 0
  const derivedPartitions = Math.max(0, spacesCount - 1)

  const norm = {
    width_cm: Number(sku.width_cm)||0, height_cm: Number(sku.height_cm)||0, depth_cm: Number(sku.depth_cm)||0,
    doors_count: Number(sku.doors_count)||0, drawers_count: Number(sku.drawers_count)||0,
    shelves_count: Number(sku.shelves_count)||0,
    partitions_count: derivedPartitions,
    has_sliding_system: Boolean(sku.has_sliding_system), has_mirror: Boolean(sku.has_mirror),
    mirror_count: Number(sku.mirror_count)||0,
    handle_type: sku.handle_type || 'Normal',
    body_material_id: sku.body_material_id||'MDF_17_F2', back_material_id: sku.back_material_id||'MDF_3.2_F1',
    door_material_id: sku.door_material_id||'MDF_17_F2', selling_price: Number(sku.selling_price)||0,
    hinge_id: sku.hinge_id, handle_id: sku.handle_id, drawer_slide_id: sku.drawer_slide_id,
  }

  const { error, panels } = generatePanels(norm, matMap)
  if (error) return { error, production_cost:0 }

  const matBreakdown = groupAndConvert(panels, useGoodQuality)
  const totalMatCost = matBreakdown.reduce((s, g) => s + g.cost, 0)

  const ebId = sku.edge_banding_id || 'EDGE_STD'
  const ebAcc = accList.find(a => a.acc_id === ebId)
  const ebPrice = ebAcc ? (useGoodQuality ? (ebAcc.price_good||ebAcc.price) : ebAcc.price) : 4
  const edge = calcEdge(panels, ebPrice)

  const acc = calcAccessories(norm, accList, useGoodQuality)

  const rawCost = totalMatCost + edge.cost + acc.total
  const overhead = rawCost * (commercial.overhead_percent || 0)
  const productionCost = rawCost + overhead

  let commercialResult = null
  if (norm.selling_price > 0) {
    const sp = norm.selling_price
    const commission = sp * (commercial.commission_percent || 0)
    const vat = sp * (commercial.vat_percent || 0)
    const sellerMargin = sp * (commercial.seller_margin_percent || 0)
    const netProfit = sp - commission - vat - sellerMargin - productionCost
    commercialResult = { selling_price:sp, commission, vat, seller_margin:sellerMargin, net_profit:netProfit, net_margin_percent: (netProfit/sp)*100 }
  }

  return {
    error: null, panels, derived_partitions: derivedPartitions,
    materials_breakdown: matBreakdown.map(g => ({
      material_id:g.mid, material_name:g.mat.name,
      total_area_m2: g.total_area / 10000, sheet_area_m2: g.sheet_area / 10000,
      required_sheets:g.sheets, material_cost:g.cost, price_per_sheet:g.price_used,
      panels: g.panels.map(p => ({ name:p.name, quantity:p.qty, unit_area_m2: p.unit_area/10000, total_area_m2: p.total_area/10000 })),
    })),
    total_material_cost: totalMatCost,
    edge_banding: { ...edge, acc_id:ebId, price_per_m:ebPrice },
    accessories: acc, overhead_amount: overhead, overhead_percent: commercial.overhead_percent || 0,
    production_cost: productionCost, commercial: commercialResult,
  }
}

export const fmt = (n) => n != null ? Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'
export const fmtA = (n) => n != null ? Number(n).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 }) : '—'
export const fmtP = (n) => n != null ? Number(n).toFixed(1) + '%' : '—'

export function skuToEngineInput(row) {
  return {
    width_cm:row.width_cm, height_cm:row.height_cm, depth_cm:row.depth_cm,
    doors_count:row.doors_count, drawers_count:row.drawers_count, shelves_count:row.shelves_count,
    spaces_count:row.spaces_count||0, has_sliding_system: row.has_sliding_system || row.door_type==='Sliding',
    has_mirror: row.has_mirror === true || row.has_mirror === 'YES',
    mirror_count: row.mirror_count||0, handle_type: row.handle_type||'Normal',
    body_material_id:row.body_material_id||'MDF_17_F2',
    back_material_id:row.back_material_id||'MDF_3.2_F1', door_material_id:row.door_material_id||'MDF_17_F2',
    selling_price:row.selling_price, hinge_id:row.hinge_id, handle_id:row.handle_id,
    drawer_slide_id:row.drawer_slide_id, edge_banding_id:row.edge_banding_id,
  }
}

// CSV parsing — maps CSV columns to internal SKU shape
export function csvRowToSku(row, catDefaults) {
  const cat = row['Sub Category'] || 'Wardrobes'
  const def = catDefaults[cat] || catDefaults['Other']
  const hasMirror = (row['Has Mirror']||'').toUpperCase() === 'YES'
  return {
    sku_code: row['SKU'] || '',
    name: row['Product name'] || '',
    image_link: row['Image Link'] || '',
    seller: row['Seller Name'] || '',
    sub_category: cat,
    commercial_material: row['Commercial Material'] || 'MDF',
    width_cm: Number(row['Width (cm)'])||100,
    depth_cm: Number(row['Depth (cm)'])||60,
    height_cm: Number(row['Height (cm)'])||210,
    door_type: row['Door Type'] || 'Hinged',
    doors_count: Number(row['No. of Doors'])||0,
    drawers_count: Number(row['No. of Drawers'])||0,
    shelves_count: Number(row['No. of Shelves'])||0,
    spaces_count: Number(row['No. of Spaces'])||0,
    hangers_count: Number(row['No. of Hangers'])||0,
    internal_division: row['Internal Division'] || 'NO',
    unit_type: row['Unit Type'] || 'Floor Standing',
    has_mirror: hasMirror,
    mirror_count: Number(row['Mirror Count'])||0,
    primary_color: row['Primary Color'] || '',
    handle_type: row['Handle Type'] || 'Normal',
    has_back_panel: row['Has Back Panel'] || 'Close',
    body_material_id: row['Body Material'] || def.body,
    back_material_id: row['Back Material'] || def.back,
    door_material_id: row['Door Material'] || def.door,
    selling_price: Number(row['Selling Price'])||0,
  }
}

// SKU to CSV row
export function skuToCsvRow(s, cost) {
  return [
    s.sku_code, `"${(s.name||'').replace(/"/g,'""')}"`, s.image_link||'',
    `"${s.seller||''}"`, s.sub_category, s.commercial_material||'MDF',
    s.width_cm, s.depth_cm, s.height_cm, s.door_type, s.doors_count,
    s.drawers_count, s.shelves_count, s.spaces_count||0, s.hangers_count||0,
    s.internal_division||'NO', s.unit_type||'Floor Standing',
    s.has_mirror?'YES':'NO', s.mirror_count||0,
    s.primary_color||'', s.handle_type||'Normal', s.has_back_panel||'Close',
    s.selling_price||0,
    s.body_material_id||'', s.back_material_id||'', s.door_material_id||'',
  ].join(',')
}
