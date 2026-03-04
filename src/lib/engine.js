/**
 * Material-Driven Wardrobe & TV Unit Costing Engine v1.0
 *
 * Implements the calculation logic from the spec exactly:
 * - Panel generation with per-panel material assignment
 * - Area grouping by material_id before sheet conversion
 * - Sheet count always rounded UP (CEILING)
 * - Edge banding per exposed front edge
 * - Accessories conditional on door type / sliding / mirror
 * - Commercial engine independent of cost engine
 * - All intermediate values traceable
 *
 * NON-NEGOTIABLE: No hardcoded prices. Everything from config.
 */

// ─── PANEL GENERATION ────────────────────────────────────────────────────────
function generatePanels(sku, materialsMap) {
  const { width_cm, depth_cm, height_cm, doors_count, shelves_count, partitions_count,
          body_material_id, back_material_id, door_material_id } = sku

  const bodyMat = materialsMap[body_material_id]
  const backMat = materialsMap[back_material_id]
  const doorMat = materialsMap[door_material_id]

  // Validate materials
  if (!bodyMat) return { error: `Body material "${body_material_id}" not found`, panels: [] }
  if (!backMat) return { error: `Back material "${back_material_id}" not found`, panels: [] }
  if (doors_count > 0 && !doorMat) return { error: `Door material "${door_material_id}" not found`, panels: [] }

  const panels = []

  // Body panels (spec: body_material_id)
  panels.push({
    name: 'Side Panels',
    quantity: 2,
    unit_area_cm2: height_cm * depth_cm,
    total_area_cm2: 2 * height_cm * depth_cm,
    material_id: body_material_id,
    material: bodyMat,
    edge_front_cm: 2 * height_cm,    // 2 panels, front edge = height each
  })

  panels.push({
    name: 'Top Panel',
    quantity: 1,
    unit_area_cm2: width_cm * depth_cm,
    total_area_cm2: width_cm * depth_cm,
    material_id: body_material_id,
    material: bodyMat,
    edge_front_cm: width_cm,
  })

  panels.push({
    name: 'Bottom Panel',
    quantity: 1,
    unit_area_cm2: width_cm * depth_cm,
    total_area_cm2: width_cm * depth_cm,
    material_id: body_material_id,
    material: bodyMat,
    edge_front_cm: width_cm,
  })

  if (partitions_count > 0) {
    panels.push({
      name: 'Internal Partitions',
      quantity: partitions_count,
      unit_area_cm2: height_cm * depth_cm,
      total_area_cm2: partitions_count * height_cm * depth_cm,
      material_id: body_material_id,
      material: bodyMat,
      edge_front_cm: partitions_count * height_cm,
    })
  }

  if (shelves_count > 0) {
    panels.push({
      name: 'Shelves',
      quantity: shelves_count,
      unit_area_cm2: width_cm * depth_cm,
      total_area_cm2: shelves_count * width_cm * depth_cm,
      material_id: body_material_id,
      material: bodyMat,
      edge_front_cm: shelves_count * width_cm,
    })
  }

  // Doors (spec: door_material_id)
  if (doors_count > 0) {
    const doorWidth = width_cm / doors_count
    const doorArea = height_cm * doorWidth
    panels.push({
      name: 'Doors',
      quantity: doors_count,
      unit_area_cm2: doorArea,
      total_area_cm2: doors_count * doorArea,
      material_id: door_material_id,
      material: doorMat,
      edge_front_cm: doors_count * 2 * (height_cm + doorWidth),  // all 4 edges per door
    })
  }

  // Back panel (spec: back_material_id)
  panels.push({
    name: 'Back Panel',
    quantity: 1,
    unit_area_cm2: width_cm * height_cm,
    total_area_cm2: width_cm * height_cm,
    material_id: back_material_id,
    material: backMat,
    edge_front_cm: 0,  // back panel has no exposed edges
  })

  return { error: null, panels }
}

// ─── AREA GROUPING & SHEET CONVERSION ────────────────────────────────────────
function groupByMaterialAndConvert(panels) {
  const groups = {}

  panels.forEach(p => {
    const mid = p.material_id
    if (!groups[mid]) {
      groups[mid] = {
        material_id: mid,
        material: p.material,
        total_area_cm2: 0,
        panels: [],
      }
    }
    groups[mid].total_area_cm2 += p.total_area_cm2
    groups[mid].panels.push(p)
  })

  // Sheet conversion per group
  const breakdown = Object.values(groups).map(g => {
    const sheetArea = g.material.sheet_width_cm * g.material.sheet_height_cm
    const requiredSheets = Math.ceil(g.total_area_cm2 / sheetArea)  // ALWAYS round UP
    const materialCost = requiredSheets * g.material.price_per_sheet
    return {
      ...g,
      sheet_area_cm2: sheetArea,
      required_sheets: requiredSheets,
      material_cost: materialCost,
    }
  })

  return breakdown
}

// ─── EDGE BANDING ────────────────────────────────────────────────────────────
function calculateEdgeBanding(panels, edgePricePerMeter) {
  const totalEdgeCm = panels.reduce((sum, p) => sum + (p.edge_front_cm || 0), 0)
  const totalEdgeMeters = totalEdgeCm / 100
  const edgeCost = totalEdgeMeters * edgePricePerMeter
  return { total_edge_cm: totalEdgeCm, total_edge_meters: totalEdgeMeters, edge_cost: edgeCost }
}

// ─── ACCESSORIES ─────────────────────────────────────────────────────────────
function calculateAccessories(sku, accPrices) {
  const { doors_count, drawers_count, shelves_count, has_sliding_system, has_mirror,
          width_cm, height_cm } = sku

  const items = []

  // Hinges: only if doors > 0 AND NOT sliding
  if (doors_count > 0 && !has_sliding_system) {
    const qty = doors_count * 3
    items.push({ name: 'Hinges', quantity: qty, unit_price: accPrices.hinge_price, cost: qty * accPrices.hinge_price })
  }

  // Drawer slides
  if (drawers_count > 0) {
    items.push({ name: 'Drawer Slides', quantity: drawers_count, unit_price: accPrices.drawer_slide_price, cost: drawers_count * accPrices.drawer_slide_price })
  }

  // Handles: doors + drawers
  const handleQty = doors_count + drawers_count
  if (handleQty > 0) {
    items.push({ name: 'Handles', quantity: handleQty, unit_price: accPrices.handle_price, cost: handleQty * accPrices.handle_price })
  }

  // Shelf supports: shelves * 4
  if (shelves_count > 0) {
    const qty = shelves_count * 4
    items.push({ name: 'Shelf Supports', quantity: qty, unit_price: accPrices.shelf_support_price, cost: qty * accPrices.shelf_support_price })
  }

  // Sliding mechanism
  if (has_sliding_system) {
    items.push({ name: 'Sliding Mechanism', quantity: 1, unit_price: accPrices.sliding_mechanism_price, cost: accPrices.sliding_mechanism_price })
  }

  // Mirror: spec formula = (height_cm * (width_cm / doors_count) * doors_count) / 10000
  //         simplifies to  (height_cm * width_cm) / 10000
  if (has_mirror && doors_count > 0) {
    const mirrorAreaM2 = (height_cm * (width_cm / doors_count) * doors_count) / 10000
    items.push({ name: 'Mirror', quantity: 1, area_m2: mirrorAreaM2, unit_price: accPrices.mirror_price_per_m2, cost: mirrorAreaM2 * accPrices.mirror_price_per_m2 })
  }

  const totalAccessoriesCost = items.reduce((s, i) => s + i.cost, 0)
  return { items, total: totalAccessoriesCost }
}

// ─── COMMERCIAL ENGINE (independent from cost engine) ────────────────────────
function calculateCommercial(sellingPrice, productionCost, commercialConfig) {
  if (!sellingPrice || sellingPrice <= 0) return null

  const commission = sellingPrice * commercialConfig.commission_percent
  const vat = sellingPrice * commercialConfig.vat_percent
  const netProfit = sellingPrice - commission - vat - productionCost
  const netMarginPercent = (netProfit / sellingPrice) * 100

  return {
    selling_price: sellingPrice,
    commission,
    vat,
    net_profit: netProfit,
    net_margin_percent: netMarginPercent,
  }
}

// ─── MAIN CALCULATION FUNCTION ───────────────────────────────────────────────
/**
 * @param {Object} sku - SKU with all input fields per input_schema
 * @param {Array}  materials - Array of material objects from pricing_configuration
 * @param {Object} accessoriesPrices - Accessories prices object
 * @param {Object} commercialConfig - { vat_percent, commission_percent }
 * @returns {Object} Full cost breakdown with all intermediate values
 */
export function calculateSKUCost(sku, materials, accessoriesPrices, commercialConfig) {
  // Build materials lookup map
  const materialsMap = {}
  materials.forEach(m => { materialsMap[m.material_id] = m })

  // Normalize SKU inputs
  const normalized = {
    width_cm:          Number(sku.width_cm) || 0,
    height_cm:         Number(sku.height_cm) || 0,
    depth_cm:          Number(sku.depth_cm) || 0,
    doors_count:       Number(sku.doors_count) || 0,
    drawers_count:     Number(sku.drawers_count) || 0,
    shelves_count:     Number(sku.shelves_count) || 0,
    partitions_count:  Number(sku.partitions_count) || 0,
    has_sliding_system: Boolean(sku.has_sliding_system),
    has_mirror:        Boolean(sku.has_mirror),
    body_material_id:  sku.body_material_id || 'MDF_17',
    back_material_id:  sku.back_material_id || 'MDF_4',
    door_material_id:  sku.door_material_id || 'MDF_17',
    selling_price:     Number(sku.selling_price) || 0,
  }

  // 1. Generate panels
  const { error, panels } = generatePanels(normalized, materialsMap)
  if (error) return { error, production_cost: 0 }

  // 2. Group by material and convert to sheets
  const materialsBreakdown = groupByMaterialAndConvert(panels)
  const totalMaterialCost = materialsBreakdown.reduce((s, g) => s + g.material_cost, 0)

  // 3. Edge banding
  const edge = calculateEdgeBanding(panels, Number(accessoriesPrices.edge_banding_price_per_meter) || 0)

  // 4. Accessories
  const acc = calculateAccessories(normalized, accessoriesPrices)

  // 5. Production cost = materials + edge + accessories
  const productionCost = totalMaterialCost + edge.edge_cost + acc.total

  // 6. Commercial (independent)
  const commercial = calculateCommercial(normalized.selling_price, productionCost, commercialConfig)

  return {
    error: null,
    // Full traceable breakdown
    panels,
    materials_breakdown: materialsBreakdown.map(g => ({
      material_id: g.material_id,
      material_name: g.material.name,
      total_area_cm2: g.total_area_cm2,
      sheet_area_cm2: g.sheet_area_cm2,
      required_sheets: g.required_sheets,
      material_cost: g.material_cost,
      price_per_sheet: g.material.price_per_sheet,
      panels: g.panels.map(p => ({ name: p.name, quantity: p.quantity, unit_area_cm2: p.unit_area_cm2, total_area_cm2: p.total_area_cm2 })),
    })),
    total_material_cost: totalMaterialCost,

    edge_banding: edge,

    accessories: acc,

    production_cost: productionCost,

    commercial,
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
export const fmt = (n) => n != null ? Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'
export const fmtP = (n) => n != null ? Number(n).toFixed(1) + '%' : '—'
export const fmtD = (n) => n != null ? Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'

/**
 * Convert a flat SKU row (from catalog table) to the input shape the engine expects.
 */
export function skuToEngineInput(row) {
  return {
    width_cm: row.width_cm,
    height_cm: row.height_cm,
    depth_cm: row.depth_cm,
    doors_count: row.doors_count,
    drawers_count: row.drawers_count,
    shelves_count: row.shelves_count,
    partitions_count: row.partitions_count,
    has_sliding_system: row.has_sliding_system || (row.door_type === 'Sliding'),
    has_mirror: row.has_mirror,
    body_material_id: row.body_material_id || 'MDF_17',
    back_material_id: row.back_material_id || 'MDF_4',
    door_material_id: row.door_material_id || 'MDF_17',
    selling_price: row.selling_price,
  }
}
