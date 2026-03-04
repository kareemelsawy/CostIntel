/**
 * Costing Engine v4
 * - Materials auto-assigned by category defaults
 * - Accessories auto-assigned by logic
 * - COGS = materials + edge banding + accessories
 * - Overhead calculated on COGS
 * - Commercial: COGS → Overhead → Seller Margin → Homzmart Margin → Selling Price
 * - Recommended Selling Price = (COGS + Overhead) / (1 - seller_margin - homzmart_margin - vat)
 */

function generatePanels(sku, matMap) {
  const { width_cm:w, depth_cm:d, height_cm:h, doors_count:dc, shelves_count:sc,
          partitions_count:pc, body_material_id:bm, back_material_id:bkm, door_material_id:dm,
          door_type:dt } = sku
  const bodyMat = matMap[bm], backMat = matMap[bkm], doorMat = matMap[dm]
  if (!bodyMat) return { error: `Body material "${bm}" not found`, panels: [] }
  if (!backMat) return { error: `Back material "${bkm}" not found`, panels: [] }

  // Wood door panels for Hinged AND Sliding (both are wood doors)
  // Open = no door panels
  const hasWoodDoors = dc > 0 && dt !== 'Open'
  if (hasWoodDoors && !doorMat) return { error: `Door material "${dm}" not found`, panels: [] }

  const panels = []
  panels.push({ name:'Side Panels', qty:2, unit_area:h*d, total_area:2*h*d, mid:bm, mat:bodyMat, edge_cm:2*h })
  panels.push({ name:'Top Panel', qty:1, unit_area:w*d, total_area:w*d, mid:bm, mat:bodyMat, edge_cm:w })
  panels.push({ name:'Bottom Panel', qty:1, unit_area:w*d, total_area:w*d, mid:bm, mat:bodyMat, edge_cm:w })
  if (pc > 0) panels.push({ name:'Partitions', qty:pc, unit_area:h*d, total_area:pc*h*d, mid:bm, mat:bodyMat, edge_cm:pc*h })
  if (sc > 0) panels.push({ name:'Shelves', qty:sc, unit_area:w*d, total_area:sc*w*d, mid:bm, mat:bodyMat, edge_cm:sc*w })
  if (hasWoodDoors) {
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
  const { doors_count:dc, drawers_count:dwc, shelves_count:sc,
          has_mirror:mir, mirror_count:mirC, width_cm:w, height_cm:h, depth_cm:d,
          handle_type:ht, door_type:dt } = sku
  const isSliding = dt === 'Sliding'
  const isOpen = dt === 'Open'
  const isHinged = !isSliding && !isOpen

  const byId = {}; accList.forEach(a => { byId[a.acc_id] = a })
  const items = []
  const gp = (id) => { const a = byId[id]; return a ? (useGood ? (a.price_good||a.price) : a.price) : 0 }
  const findSlide = () => {
    if (d <= 32) return 'SLIDE_30'; if (d <= 37) return 'SLIDE_35'; if (d <= 42) return 'SLIDE_40'
    if (d <= 47) return 'SLIDE_45'; if (d <= 52) return 'SLIDE_50'; return 'SLIDE_55'
  }

  // 1. HINGES — only for Hinged doors (3 per door)
  if (dc > 0 && isHinged) {
    const hid = 'HINGE_FULL', qty = dc * 3
    items.push({ name: byId[hid]?.name||'Hinge', acc_id:hid, qty, unit_price:gp(hid), cost: qty*gp(hid) })
  }

  // 2. SLIDING TRACK/LATCH — only for Sliding doors (1 track per door)
  //    مجرى لطش = sliding rail/latch for wood sliding doors
  //    NOT ضلفة زجاج جرار which is a glass mirror sliding door product
  if (dc > 0 && isSliding) {
    items.push({ name: byId['LATCH_SLIDE']?.name||'Sliding Track', acc_id:'LATCH_SLIDE', qty:dc, unit_price:gp('LATCH_SLIDE'), cost: dc*gp('LATCH_SLIDE') })
  }

  // 3. DRAWER SLIDES — auto-select by depth
  if (dwc > 0) {
    const sid = findSlide()
    items.push({ name: byId[sid]?.name||'Drawer Slide', acc_id:sid, qty:dwc, unit_price:gp(sid), cost: dwc*gp(sid) })
  }

  // 4. HANDLES — based on Handle Type attribute
  //    Handleless = no handles; Normal = handles on doors + drawers
  //    For Sliding: handles are recessed/grip type (HANDLE_SLIDE20)
  if (ht !== 'Handleless') {
    const totalHandles = dc + dwc
    if (totalHandles > 0) {
      const hid = isSliding ? 'HANDLE_SLIDE20' : 'HANDLE_128'
      items.push({ name: byId[hid]?.name||'Handle', acc_id:hid, qty:totalHandles, unit_price:gp(hid), cost: totalHandles*gp(hid) })
    }
  }

  // 5. SHELF SUPPORTS — 4 pins per shelf
  if (sc > 0) {
    const qty = sc * 4
    items.push({ name:'Shelf Supports', acc_id:'SHELF_SUPPORT', qty, unit_price:gp('SHELF_SUPPORT'), cost: qty*gp('SHELF_SUPPORT') })
  }

  // 6. MIRROR — area-based (Has Mirror=YES, Mirror Count)
  //    Mirror is a flat sheet glued to a door or wall, priced per m²
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

  const spacesCount = Number(sku.spaces_count) || 0
  const derivedPartitions = Math.max(0, spacesCount - 1)

  const norm = {
    width_cm: Number(sku.width_cm)||0, height_cm: Number(sku.height_cm)||0, depth_cm: Number(sku.depth_cm)||0,
    doors_count: Number(sku.doors_count)||0, drawers_count: Number(sku.drawers_count)||0,
    shelves_count: Number(sku.shelves_count)||0, partitions_count: derivedPartitions,
    has_sliding_system: Boolean(sku.has_sliding_system), has_mirror: Boolean(sku.has_mirror),
    mirror_count: Number(sku.mirror_count)||0, handle_type: sku.handle_type || 'Normal',
    door_type: sku.door_type || 'Hinged',
    body_material_id: sku.body_material_id||'MDF_17_F2', back_material_id: sku.back_material_id||'MDF_3.2_F1',
    door_material_id: sku.door_material_id||'MDF_17_F2', selling_price: Number(sku.selling_price)||0,
  }

  const { error, panels } = generatePanels(norm, matMap)
  if (error) return { error, production_cost:0 }

  const matBreakdown = groupAndConvert(panels, useGoodQuality)
  const totalMatCost = matBreakdown.reduce((s, g) => s + g.cost, 0)

  const ebAcc = accList.find(a => a.acc_id === 'EDGE_STD')
  const ebPrice = ebAcc ? (useGoodQuality ? (ebAcc.price_good||ebAcc.price) : ebAcc.price) : 4
  const edge = calcEdge(panels, ebPrice)

  const acc = calcAccessories(norm, accList, useGoodQuality)

  // COGS = materials + edge banding + accessories
  const cogs = totalMatCost + edge.cost + acc.total

  // Overhead on COGS
  const overheadPct = commercial.overhead_percent || 0
  const overhead = cogs * overheadPct

  // Production cost = COGS + Overhead
  const productionCost = cogs + overhead

  // Commercial waterfall
  let commercialResult = null
  const sp = norm.selling_price
  const sellerMarginPct = commercial.seller_margin_percent || 0
  const homzmartMarginPct = commercial.homzmart_margin_percent || commercial.commission_percent || 0
  const vatPct = commercial.vat_percent || 0

  // Recommended selling price (break-even): margins cascade on previous subtotal
  // Production Cost → +Seller Margin(% of Prod) → +Homzmart Margin(% of Prod+Seller) → +VAT(% of subtotal)
  const recSellerMargin = productionCost * sellerMarginPct
  const recSubtotal1 = productionCost + recSellerMargin
  const recHomzmartMargin = recSubtotal1 * homzmartMarginPct
  const recSubtotal2 = recSubtotal1 + recHomzmartMargin
  const recVat = recSubtotal2 * vatPct
  const recommendedSP = recSubtotal2 + recVat

  if (sp > 0) {
    // Actual waterfall at given selling price — work backwards to find net profit
    // Seller Margin = % of Production Cost
    const sellerMargin = productionCost * sellerMarginPct
    // Homzmart Margin = % of (Production Cost + Seller Margin)
    const subtotal1 = productionCost + sellerMargin
    const homzmartMargin = subtotal1 * homzmartMarginPct
    // VAT = % of (subtotal1 + Homzmart Margin)
    const subtotal2 = subtotal1 + homzmartMargin
    const vat = subtotal2 * vatPct
    // Net profit = Selling Price - all costs
    const totalCosts = productionCost + sellerMargin + homzmartMargin + vat
    const netProfit = sp - totalCosts
    commercialResult = {
      selling_price: sp, seller_margin: sellerMargin, homzmart_margin: homzmartMargin,
      vat, net_profit: netProfit, net_margin_percent: (netProfit / sp) * 100,
      recommended_selling_price: recommendedSP,
      subtotal_after_seller: subtotal1, subtotal_after_homzmart: subtotal2,
    }
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
    edge_banding: { ...edge, price_per_m:ebPrice },
    accessories: acc,
    cogs,
    overhead_amount: overhead, overhead_percent: overheadPct,
    production_cost: productionCost,
    recommended_selling_price: recommendedSP,
    commercial: commercialResult,
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
    door_type: row.door_type||'Hinged',
    body_material_id:row.body_material_id||'MDF_17_F2',
    back_material_id:row.back_material_id||'MDF_3.2_F1', door_material_id:row.door_material_id||'MDF_17_F2',
    selling_price:row.selling_price,
  }
}

// CSV row → internal SKU (materials auto-assigned by category)
export function csvRowToSku(row, catDefaults) {
  const cat = row['Sub Category'] || 'Wardrobes'
  const def = catDefaults[cat] || catDefaults['Other']
  const hasMirror = (row['Has Mirror']||'').toUpperCase() === 'YES'
  return {
    sku_code: row['SKU'] || '', name: row['Product name'] || '',
    image_link: row['Image Link'] || '', seller: row['Seller Name'] || '',
    sub_category: cat, commercial_material: row['Commercial Material'] || 'MDF',
    width_cm: Number(row['Width (cm)'])||100, depth_cm: Number(row['Depth (cm)'])||60,
    height_cm: Number(row['Height (cm)'])||210, door_type: row['Door Type'] || 'Hinged',
    doors_count: Number(row['No. of Doors'])||0, drawers_count: Number(row['No. of Drawers'])||0,
    shelves_count: Number(row['No. of Shelves'])||0, spaces_count: Number(row['No. of Spaces'])||0,
    hangers_count: Number(row['No. of Hangers'])||0, internal_division: row['Internal Division'] || 'NO',
    unit_type: row['Unit Type'] || 'Floor Standing', has_mirror: hasMirror,
    mirror_count: Number(row['Mirror Count'])||0, primary_color: row['Primary Color'] || '',
    handle_type: row['Handle Type'] || 'Normal', has_back_panel: row['Has Back Panel'] || 'Close',
    selling_price: Number(row['Selling Price'])||0,
    // Materials auto-assigned by category
    body_material_id: def.body, back_material_id: def.back, door_material_id: def.door,
  }
}

// SKU → CSV row (no material columns)
export function skuToCsvRow(s) {
  return [
    s.sku_code, `"${(s.name||'').replace(/"/g,'""')}"`, s.image_link||'',
    `"${s.seller||''}"`, s.sub_category, s.commercial_material||'MDF',
    s.width_cm, s.depth_cm, s.height_cm, s.door_type, s.doors_count,
    s.drawers_count, s.shelves_count, s.spaces_count||0, s.hangers_count||0,
    s.internal_division||'NO', s.unit_type||'Floor Standing',
    s.has_mirror?'YES':'NO', s.mirror_count||0,
    s.primary_color||'', s.handle_type||'Normal', s.has_back_panel||'Close',
    s.selling_price||0,
  ].join(',')
}
