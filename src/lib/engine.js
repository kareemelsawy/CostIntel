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
  if (!sku.width_cm || !sku.height_cm || !sku.depth_cm) return { error: 'Invalid dimensions — width, height and depth must be > 0', panels: [] }
  const { width_cm:w, depth_cm:d, height_cm:h, doors_count:dc, shelves_count:sc,
          partitions_count:pc, body_material_id:bm, back_material_id:bkm, door_material_id:dm,
          door_type:dt, has_back_panel:hbp } = sku
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

  // Drawer fronts — each drawer has a visible front panel
  // Standard drawer front height ≈ 20 cm; width = cabinet width / spaces (or full width if 1 space)
  if (sku.drawers_count > 0) {
    const dfc = sku.drawers_count
    const spaces = Math.max(sku.spaces_count || 1, 1)
    const dfW = w / spaces        // drawer front width per space
    const dfH = 20                // standard drawer front height (cm)
    const dfArea = dfW * dfH
    // Drawer fronts use door material (visible face), edge banded on all 4 sides
    const dfMat = matMap[sku.door_material_id] || bodyMat
    const dfMid = dfMat === bodyMat ? bm : sku.door_material_id
    panels.push({ name:'Drawer Fronts', qty:dfc, unit_area:dfArea, total_area:dfc*dfArea, mid:dfMid, mat:dfMat, edge_cm:dfc*2*(dfH+dfW) })
  }
  if (hasWoodDoors) {
    const dw = w/dc, da = h*dw
    panels.push({ name:'Doors', qty:dc, unit_area:da, total_area:dc*da, mid:dm, mat:doorMat, edge_cm:dc*2*(h+dw) })
  }
  if (hbp !== 'Open') {
    panels.push({ name:'Back Panel', qty:1, unit_area:w*h, total_area:w*h, mid:bkm, mat:backMat, edge_cm:0 })
  }
  return { error: null, panels }
}

function groupAndConvert(panels, useGood, waste = 0.10) {
  const groups = {}
  panels.forEach(p => {
    if (!groups[p.mid]) groups[p.mid] = { mid:p.mid, mat:p.mat, total_area:0, panels:[] }
    groups[p.mid].total_area += p.total_area
    groups[p.mid].panels.push(p)
  })
  return Object.values(groups).map(g => {
    const sa = g.mat.sheet_width_cm * g.mat.sheet_height_cm
    const sheets = Math.ceil(g.total_area * (1 + 0.10) / sa)  // 10% cutting waste
    const price = useGood ? (g.mat.price_good || g.mat.price) : g.mat.price
    return { ...g, sheet_area:sa, sheets, cost: sheets * price, price_used:price }
  })
}

function calcEdge(panels, edgePricePerM) {
  const cm = panels.reduce((s, p) => s + (p.edge_cm || 0), 0)
  return { total_cm:cm, total_m: cm/100, cost: (cm/100) * edgePricePerM }
}

function calcAccessories(sku, accList, useGood, C = {}) {
  const PINS_SHELF = (C.shelf_pins_per_shelf?.value ?? 4)
  const HINGE_H1   = (C.hinge_h1?.value              ?? 100)
  const HINGE_H2   = (C.hinge_h2?.value              ?? 150)
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
    // Drawer depth ≈ cabinet depth minus ~5cm clearance for back panel and face frame
    const dd = d - 5
    if (dd <= 32) return 'SLIDE_30'; if (dd <= 37) return 'SLIDE_35'; if (dd <= 42) return 'SLIDE_40'
    if (dd <= 47) return 'SLIDE_45'; if (dd <= 52) return 'SLIDE_50'; return 'SLIDE_55'
  }

  // 1. HINGES — only for Hinged doors; count by door height (Blum CLIP top standard)
  //    ≤ 100cm: 2 hinges/door · 101–150cm: 3 hinges/door · > 150cm: 4 hinges/door
  if (dc > 0 && isHinged) {
    const hid = 'HINGE_FULL'
    const hingesPerDoor = h <= HINGE_H1 ? 2 : h <= HINGE_H2 ? 3 : 4
    const qty = dc * hingesPerDoor
    items.push({ name: byId[hid]?.name||'Hinge', acc_id:hid, qty, unit_price:gp(hid), cost: qty*gp(hid), note:`${hingesPerDoor}/door (H=${h}cm)` })
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
  //    Handleless/Hidden = no handles; Normal = handles on doors + drawers
  //    For Sliding: handles are recessed/grip type (HANDLE_SLIDE20)
  if (ht !== 'Handleless' && ht !== 'Hidden') {
    const totalHandles = dc + dwc
    if (totalHandles > 0) {
      const hid = isSliding ? 'HANDLE_SLIDE20' : 'HANDLE_128'
      items.push({ name: byId[hid]?.name||'Handle', acc_id:hid, qty:totalHandles, unit_price:gp(hid), cost: totalHandles*gp(hid) })
    }
  }

  // 5. SHELF SUPPORTS — 4 pins per shelf
  if (sc > 0) {
    const qty = sc * PINS_SHELF
    items.push({ name:'Shelf Supports', acc_id:'SHELF_SUPPORT', qty, unit_price:gp('SHELF_SUPPORT'), cost: qty*gp('SHELF_SUPPORT') })
  }

  // 6. HANGER RAIL — 1 rail per hanger (clothes hanging rod inside wardrobe)
  const hangerCount = Number(sku.hangers_count) || 0
  if (hangerCount > 0) {
    // Hanger rod: use HANDLE_W100 as proxy (aluminium rod ~100cm) or a dedicated acc if available
    const hrodId = byId['HANGER_ROD'] ? 'HANGER_ROD' : 'HANDLE_W100'
    items.push({ name: byId[hrodId]?.name||'Hanger Rail', acc_id:hrodId, qty:hangerCount, unit_price:gp(hrodId), cost: hangerCount*gp(hrodId) })
  }

  // 7. MIRROR — area-based (Has Mirror=YES, Mirror Count)
  //    Mirror is a flat sheet glued to a door or wall, priced per m²
  if (mir) {
    // Cap mirror count to door count — a mirror can only be on a door face
    const mc = Math.min(Number(mirC) || dc || 1, dc || 1)
    const mirrorW = dc > 0 ? w / dc : w
    const area = (h * mirrorW * mc) / 10000
    items.push({ name:'Mirror', acc_id:'MIRROR_M2', qty:mc, area_m2:area, unit_price:gp('MIRROR_M2'), cost: area*gp('MIRROR_M2') })
  }

  return { items, total: items.reduce((s, i) => s + i.cost, 0) }
}

export function calculateSKUCost(sku, materials, accList, commercial, useGoodQuality = false, engineConstants = {}) {
  const matMap = {}; materials.forEach(m => { matMap[m.material_id] = m })
  // Engine constants — use engineRules.constants if provided, else hardcoded defaults
  const C = engineConstants || {}
  const WASTE        = (C.sheet_waste_pct?.value       ?? 0.10)
  // PINS_SHELF, HINGE_H1, HINGE_H2 passed via C to calcAccessories
  // DF_HEIGHT (20cm) and SLIDE_CLEAR (5cm) are inlined in generatePanels/calcAccessories

  const spacesCount = Number(sku.spaces_count) || 0
  const derivedPartitions = Math.max(0, spacesCount - 1)

  const norm = {
    width_cm: Number(sku.width_cm)||0, height_cm: Number(sku.height_cm)||0, depth_cm: Number(sku.depth_cm)||0,
    doors_count: Number(sku.doors_count)||0, drawers_count: Number(sku.drawers_count)||0,
    shelves_count: Number(sku.shelves_count)||0, partitions_count: derivedPartitions,
    has_sliding_system: Boolean(sku.has_sliding_system), has_mirror: Boolean(sku.has_mirror),
    mirror_count: Number(sku.mirror_count)||0, handle_type: sku.handle_type || 'Normal',
    door_type: sku.door_type || 'Hinged',
    has_back_panel: sku.has_back_panel || 'Close',
    hangers_count: Number(sku.hangers_count)||0,
    body_material_id: sku.body_material_id||'MDF_17_F2', back_material_id: sku.back_material_id||'MDF_3.2_F1',
    door_material_id: sku.door_material_id||'MDF_17_F2', selling_price: Number(sku.selling_price)||0,
  }

  const { error, panels } = generatePanels(norm, matMap)
  if (error) return { error, production_cost:0 }

  const matBreakdown = groupAndConvert(panels, useGoodQuality, WASTE)  // WASTE already passed
  const totalMatCost = matBreakdown.reduce((s, g) => s + g.cost, 0)

  const ebAcc = accList.find(a => a.acc_id === 'EDGE_STD')
  const ebPrice = ebAcc ? (useGoodQuality ? (ebAcc.price_good||ebAcc.price) : ebAcc.price) : 4
  const edge = calcEdge(panels, ebPrice)

  const acc = calcAccessories(norm, accList, useGoodQuality, C)

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

  // Recommended selling price (break-even):
  // Production Cost → +Seller Margin(% of Prod Cost) → +VAT(% of subtotal) → Homzmart Margin(% of final price incl. VAT)
  // So: SP = (ProductionCost * (1 + sellerMarginPct) * (1 + vatPct)) / (1 - homzmartMarginPct)
  const recSellerMargin = productionCost * sellerMarginPct
  const recSubtotal1 = productionCost + recSellerMargin          // after seller margin
  const recVat = recSubtotal1 * vatPct                           // VAT on subtotal
  const recSubtotal2 = recSubtotal1 + recVat                     // price before Homzmart cut
  const divisor = 1 - homzmartMarginPct
  const recommendedSP = divisor > 0.01 ? recSubtotal2 / divisor : recSubtotal2 * 2  // guard div/0
  const recHomzmartMargin = recommendedSP - recSubtotal2

  if (sp > 0) {
    // Actual waterfall at given selling price
    // Seller Margin = % of Production Cost
    const sellerMargin = productionCost * sellerMarginPct
    const subtotal1 = productionCost + sellerMargin
    // VAT on subtotal after seller margin
    const vat = subtotal1 * vatPct
    const subtotal2 = subtotal1 + vat
    // Homzmart Margin = % of final selling price (commission on total price incl. VAT)
    const homzmartMargin = sp * homzmartMarginPct
    // Net profit = Selling Price - all costs
    const totalCosts = productionCost + sellerMargin + vat + homzmartMargin
    const netProfit = sp - totalCosts
    commercialResult = {
      selling_price: sp, seller_margin: sellerMargin, homzmart_margin: homzmartMargin,
      vat, net_profit: netProfit, net_margin_percent: (netProfit / sp) * 100,
      recommended_selling_price: recommendedSP,
      subtotal_after_seller: subtotal1, subtotal_after_vat: subtotal2,
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
    has_back_panel: row.has_back_panel || 'Close',
    hangers_count: row.hangers_count || 0,
    selling_price:row.selling_price,
  }
}

// CSV row → internal SKU (materials auto-assigned by category)
export function csvRowToSku(row, catDefaults) {
  const cat = row['Sub Category'] || 'Wardrobes'
  const def = catDefaults[cat] || catDefaults['Other']
  const hasMirror = (row['Has Mirror']||'').trim().toUpperCase() === 'YES'

  // Normalize Door Type (case-insensitive)
  const rawDoor = (row['Door Type']||'').trim()
  const doorNorm = rawDoor.toLowerCase()
  const doorType = doorNorm === 'hinged' ? 'Hinged' : doorNorm === 'sliding' ? 'Sliding' : doorNorm === 'open' ? 'Open' : (rawDoor || 'Hinged')

  // Normalize Handle Type (case-insensitive, map Hidden → Handleless)
  const rawHandle = (row['Handle Type']||'').trim()
  const handleNorm = rawHandle.toLowerCase()
  const handleType = handleNorm === 'normal' ? 'Normal' : (handleNorm === 'handleless' || handleNorm === 'hidden') ? 'Handleless' : (rawHandle || 'Normal')

  // Dimensions — use 0 for missing/invalid, don't silently default to 100/60/210
  const w = Number(row['Width (cm)']) || 0
  const d = Number(row['Depth (cm)']) || 0
  const h = Number(row['Height (cm)']) || 0

  return {
    sku_code: (row['SKU'] || '').slice(0, 100), name: row['Product name'] || '',
    description: row['Description'] || '',
    image_link: (row['Image Link']||'').match(/^https?:\/\//i) ? row['Image Link'] : '', seller: row['Seller Name'] || '',
    sub_category: cat, commercial_material: row['Commercial Material'] || 'MDF',
    width_cm: w, depth_cm: d, height_cm: h, door_type: doorType,
    internal_division: row['Internal Division'] || 'NO', unit_type: row['Unit Type'] || 'Floor Standing',
    spaces_count: Number(row['No. of Spaces'])||0, hangers_count: Number(row['No. of Hangers'])||0,
    drawers_count: Number(row['No. of Drawers'])||0, shelves_count: Number(row['No. of Shelves'])||0,
    has_mirror: hasMirror, mirror_count: Number(row['Mirror Count'])||0,
    primary_color: row['Primary Color'] || '', has_secondary_color: row['Has Secondary Color'] || 'NO',
    handle_type: handleType, has_back_panel: row['Has Back Panel'] || 'Close',
    doors_count: Number(row['No. of Doors'])||0,
    selling_price: Number(row['Selling Price'])||0,
    // Materials auto-assigned by category
    body_material_id: def.body, back_material_id: def.back, door_material_id: def.door,
  }
}

// SKU → CSV row (matches CSV_COLUMNS order)
export function skuToCsvRow(s) {
  return [
    s.sku_code, `"${(s.name||'').replace(/"/g,'""')}"`, `"${(s.description||'').replace(/"/g,'""')}"`,
    s.image_link||'', `"${s.seller||''}"`, s.sub_category, s.commercial_material||'MDF',
    s.width_cm, s.depth_cm, s.height_cm, s.door_type,
    s.internal_division||'NO', s.unit_type||'Floor Standing',
    s.spaces_count||0, s.hangers_count||0, s.drawers_count, s.shelves_count,
    s.has_mirror?'YES':'NO', s.mirror_count||0,
    s.primary_color||'', s.has_secondary_color||'NO', s.handle_type||'Normal', s.has_back_panel||'Close',
    s.doors_count, s.selling_price||0,
  ].join(',')
}

// ═══════════════════════════════════════════════════════════════════════════════
// Material Auto-Detection from Description (v3 — configurable rules)
// Uses materialDetectionRules from engineRules (editable in UI).
// Each rule: keywords (comma-separated), material_id, priority, excludeWords, uncostable.
// ═══════════════════════════════════════════════════════════════════════════════

// Strip Arabic diacritics for matching
function stripDiacritics(t) { return t.replace(/[\u064B-\u065F\u0670]/g, '') }

// Check if any keyword from a comma-separated list appears in text
function matchesRule(text, rule) {
  const keywords = rule.keywords.split(',').map(k => k.trim()).filter(Boolean)
  const excludes = (rule.excludeWords || '').split(',').map(k => k.trim()).filter(Boolean)

  // Remove exclude words from text first
  let cleaned = text
  for (const ex of excludes) {
    cleaned = cleaned.split(ex).join('___')
  }

  for (const kw of keywords) {
    if (kw.length < 2) continue
    if (cleaned.includes(kw) || cleaned.toLowerCase().includes(kw.toLowerCase())) return true
  }
  return false
}

// Check if a keyword only appears in a "legs" context
function isLegsOnly(text, rule) {
  const keywords = rule.keywords.split(',').map(k => k.trim()).filter(Boolean)
  const matched = keywords.filter(kw => text.includes(kw) || text.toLowerCase().includes(kw.toLowerCase()))
  if (matched.length === 0) return false

  return matched.every(kw => {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const legPat = new RegExp('(?:أرجل|الرجل|للرجل|خامة\\s*الرجل)[\\s\\S]{0,30}' + escaped, 'i')
    const bodyPat = new RegExp('(?:الخامة\\s*(?:الرئيسية|الأساسية)?\\s*[:：])[\\s\\S]{0,30}' + escaped, 'i')
    return legPat.test(text) && !bodyPat.test(text)
  })
}

export function detectMaterialFromDescription(description, productName, rules) {
  const raw = ((description || '') + ' ' + (productName || '')).trim()
  if (!raw || raw.length < 3) return null
  if (!rules || !rules.length) return null

  const text = stripDiacritics(raw)

  // Sort rules by priority (highest first)
  const sorted = [...rules].filter(r => r.enabled !== false).sort((a, b) => (b.priority || 0) - (a.priority || 0))

  const woodMatches = []
  const uncostableMatches = []

  for (const rule of sorted) {
    if (!matchesRule(text, rule)) continue

    // For expensive woods, skip if only mentioned for legs
    if (rule.priority >= 70 && !rule.uncostable && isLegsOnly(text, rule)) continue

    if (rule.uncostable) {
      uncostableMatches.push(rule)
    } else {
      woodMatches.push(rule)
    }
  }

  // Wood material wins over uncostable
  if (woodMatches.length > 0) {
    const best = woodMatches[0]
    return {
      body_material_id: best.material_id,
      door_material_id: best.material_id,
      detected_label: best.label,
      confidence: woodMatches.length === 1 ? 'high' : 'medium',
    }
  }

  if (uncostableMatches.length > 0) {
    const best = uncostableMatches[0]
    return {
      body_material_id: '_UNCOSTABLE',
      door_material_id: '_UNCOSTABLE',
      detected_label: best.label,
      confidence: 'high',
    }
  }

  return null
}

// Apply auto-detection to a SKU
export function autoAssignMaterials(sku, catDefaults, detectionRules) {
  const cat = sku.sub_category || 'Other'
  const def = catDefaults[cat] || catDefaults['Other']

  let bodyMat = def.body, doorMat = def.door, backMat = def.back
  let detectedLabel = null, uncostable = false, uncostableReason = null

  const detected = detectMaterialFromDescription(sku.description, sku.name, detectionRules)
  if (detected) {
    if (detected.body_material_id === '_UNCOSTABLE') {
      uncostable = true
      uncostableReason = `Material: ${detected.detected_label} — not supported by the costing engine`
      detectedLabel = detected.detected_label
    } else {
      bodyMat = detected.body_material_id
      doorMat = detected.door_material_id
      detectedLabel = detected.detected_label
    }
  }

  return {
    ...sku,
    body_material_id: uncostable ? def.body : bodyMat,
    door_material_id: uncostable ? def.door : doorMat,
    back_material_id: backMat,
    _detected_material: detectedLabel,
    _uncostable: uncostable,
    _uncostable_reason: uncostableReason,
  }
}


