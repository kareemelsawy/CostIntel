// Default pricing configuration (matches spec exactly)
export const DEFAULT_MATERIALS = [
  { material_id: 'MDF_17', name: 'MDF 17mm', thickness_mm: 17, sheet_width_cm: 244, sheet_height_cm: 122, price_per_sheet: 1050 },
  { material_id: 'MDF_4',  name: 'MDF 4mm',  thickness_mm: 4,  sheet_width_cm: 244, sheet_height_cm: 122, price_per_sheet: 750  },
]

export const DEFAULT_ACCESSORIES = {
  hinge_price: 25,
  drawer_slide_price: 120,
  handle_price: 30,
  shelf_support_price: 2,
  sliding_mechanism_price: 950,
  mirror_price_per_m2: 400,
  edge_banding_price_per_meter: 5,
}

export const DEFAULT_COMMERCIAL = {
  vat_percent: 0.14,
  commission_percent: 0.40,
}

// Sample SKUs pre-loaded from your Excel (representative mix)
export const SAMPLE_SKUS = [
  { sku_code:"WOOD.R.woodrate1058", name:"دولاب ضلفتين - أبيض", seller:"Woodrate", sub_category:"Wardrobes", width_cm:100, depth_cm:60, height_cm:210, door_type:"Hinged", doors_count:2, drawers_count:3, shelves_count:5, partitions_count:1, has_sliding_system:false, has_mirror:false, body_material_id:"MDF_17", back_material_id:"MDF_4", door_material_id:"MDF_17", selling_price:10000 },
  { sku_code:"PRIWO192", name:"دريسنج ام دى اف أبيض", seller:"Premier Wood", sub_category:"Wardrobes", width_cm:240, depth_cm:58, height_cm:200, door_type:"Open", doors_count:0, drawers_count:8, shelves_count:9, partitions_count:4, has_sliding_system:false, has_mirror:false, body_material_id:"MDF_17", back_material_id:"MDF_4", door_material_id:"MDF_17", selling_price:10000 },
  { sku_code:"WOOD.R.woodrate1184", name:"دولاب 3 ضلف - أبيض", seller:"Woodrate", sub_category:"Wardrobes", width_cm:160, depth_cm:60, height_cm:210, door_type:"Hinged", doors_count:4, drawers_count:0, shelves_count:10, partitions_count:3, has_sliding_system:false, has_mirror:false, body_material_id:"MDF_17", back_material_id:"MDF_4", door_material_id:"MDF_17", selling_price:10000 },
  { sku_code:"PRIWO82711", name:"دولاب ام دى اف ضلفة أبيض", seller:"Premier Wood", sub_category:"Wardrobes", width_cm:45, depth_cm:60, height_cm:180, door_type:"Hinged", doors_count:1, drawers_count:0, shelves_count:2, partitions_count:0, has_sliding_system:false, has_mirror:false, body_material_id:"MDF_17", back_material_id:"MDF_4", door_material_id:"MDF_17", selling_price:10000 },
  { sku_code:"MAU3081", name:"دولاب خشب ضلفتين سلايد", seller:"Joint For Furniture", sub_category:"Wardrobes", width_cm:120, depth_cm:62, height_cm:180, door_type:"Sliding", doors_count:2, drawers_count:0, shelves_count:6, partitions_count:1, has_sliding_system:true, has_mirror:false, body_material_id:"MDF_17", back_material_id:"MDF_4", door_material_id:"MDF_17", selling_price:10000 },
  { sku_code:"GW-601-BR", name:"دريسنج خشب ام دي اف بني", seller:"", sub_category:"Dressings", width_cm:90, depth_cm:58, height_cm:128, door_type:"Open", doors_count:0, drawers_count:0, shelves_count:3, partitions_count:1, has_sliding_system:false, has_mirror:false, body_material_id:"MDF_17", back_material_id:"MDF_4", door_material_id:"MDF_17", selling_price:10000 },
  { sku_code:"PRIWO82558", name:"دولاب ام دى اف 3 ضلف أبيض", seller:"Premier Wood", sub_category:"Wardrobes", width_cm:150, depth_cm:60, height_cm:210, door_type:"Hinged", doors_count:3, drawers_count:0, shelves_count:8, partitions_count:2, has_sliding_system:false, has_mirror:false, body_material_id:"MDF_17", back_material_id:"MDF_4", door_material_id:"MDF_17", selling_price:10000 },
  { sku_code:"WOOD.R.woodrate1159", name:"دولاب 4 ضلف مرآة - أبيض", seller:"Woodrate", sub_category:"Wardrobes", width_cm:200, depth_cm:60, height_cm:210, door_type:"Hinged", doors_count:4, drawers_count:0, shelves_count:12, partitions_count:3, has_sliding_system:false, has_mirror:true, body_material_id:"MDF_17", back_material_id:"MDF_4", door_material_id:"MDF_17", selling_price:10000 },
  { sku_code:"TV-MDF-001", name:"وحدة تلفزيون ام دي اف", seller:"Premier Wood", sub_category:"Tv Unit", width_cm:180, depth_cm:45, height_cm:50, door_type:"Hinged", doors_count:2, drawers_count:2, shelves_count:2, partitions_count:1, has_sliding_system:false, has_mirror:false, body_material_id:"MDF_17", back_material_id:"MDF_4", door_material_id:"MDF_17", selling_price:10000 },
  { sku_code:"TV-MDF-002", name:"وحدة تلفزيون مودرن", seller:"Woodrate", sub_category:"Tv Unit", width_cm:160, depth_cm:40, height_cm:55, door_type:"Open", doors_count:0, drawers_count:1, shelves_count:3, partitions_count:2, has_sliding_system:false, has_mirror:false, body_material_id:"MDF_17", back_material_id:"MDF_4", door_material_id:"MDF_17", selling_price:10000 },
  { sku_code:"SHOE-001", name:"جزامة 3 ضلف مرآة", seller:"Woodrate", sub_category:"Shoe Racks", width_cm:80, depth_cm:30, height_cm:120, door_type:"Hinged", doors_count:3, drawers_count:0, shelves_count:6, partitions_count:2, has_sliding_system:false, has_mirror:true, body_material_id:"MDF_17", back_material_id:"MDF_4", door_material_id:"MDF_17", selling_price:10000 },
  { sku_code:"SHOE-002", name:"جزامة 2 ضلف خشب", seller:"Premier Wood", sub_category:"Shoe Racks", width_cm:60, depth_cm:28, height_cm:100, door_type:"Hinged", doors_count:2, drawers_count:0, shelves_count:4, partitions_count:1, has_sliding_system:false, has_mirror:false, body_material_id:"MDF_17", back_material_id:"MDF_4", door_material_id:"MDF_17", selling_price:10000 },
  { sku_code:"COM-001", name:"كومود خشب ام دي اف", seller:"Woodrate", sub_category:"Commodes", width_cm:50, depth_cm:40, height_cm:60, door_type:"Open", doors_count:0, drawers_count:3, shelves_count:0, partitions_count:0, has_sliding_system:false, has_mirror:false, body_material_id:"MDF_17", back_material_id:"MDF_4", door_material_id:"MDF_17", selling_price:10000 },
  { sku_code:"BUF-001", name:"بوفيه خشب مودرن", seller:"Joint For Furniture", sub_category:"Buffet", width_cm:160, depth_cm:45, height_cm:90, door_type:"Hinged", doors_count:4, drawers_count:2, shelves_count:2, partitions_count:3, has_sliding_system:false, has_mirror:false, body_material_id:"MDF_17", back_material_id:"MDF_4", door_material_id:"MDF_17", selling_price:10000 },
  { sku_code:"DIS-001", name:"وحدة عرض خشب", seller:"Premier Wood", sub_category:"Display Unit", width_cm:100, depth_cm:35, height_cm:180, door_type:"Hinged", doors_count:2, drawers_count:0, shelves_count:5, partitions_count:1, has_sliding_system:false, has_mirror:false, body_material_id:"MDF_17", back_material_id:"MDF_4", door_material_id:"MDF_17", selling_price:10000 },
]
