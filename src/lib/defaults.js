// ─── SHEET MATERIALS ─────────────────────────────────────────────────────────
// All prices in EGP. sheet_width/height default 244×122 cm unless noted.
export const DEFAULT_MATERIALS = [
  { material_id:'MOSKY',         name:'موسكي',                          thickness_mm:17, sheet_width_cm:244, sheet_height_cm:122, price:16500, price_good:20000, category:'wood' },
  { material_id:'AZIZI',         name:'عزيزى',                          thickness_mm:17, sheet_width_cm:244, sheet_height_cm:122, price:55000, price_good:55000, category:'wood' },
  { material_id:'ZAN',           name:'زان',                            thickness_mm:17, sheet_width_cm:244, sheet_height_cm:122, price:41000, price_good:41000, category:'wood' },
  { material_id:'TEAK',          name:'تيك',                            thickness_mm:17, sheet_width_cm:244, sheet_height_cm:122, price:100000,price_good:100000,category:'wood' },
  { material_id:'BACK_PLKSH',    name:'ظهر ابلاكاش',                    thickness_mm:3,  sheet_width_cm:244, sheet_height_cm:122, price:200,   price_good:200,   category:'back' },
  { material_id:'GLASS_6MM',     name:'زجاج 6 ملم شفاف',               thickness_mm:6,  sheet_width_cm:244, sheet_height_cm:122, price:650,   price_good:650,   category:'glass' },
  { material_id:'VENEER_ARO',    name:'قشرة ارو',                       thickness_mm:1,  sheet_width_cm:244, sheet_height_cm:122, price:65,    price_good:75,    category:'veneer' },
  { material_id:'PLY_3MM',       name:'3mm Plywood',                    thickness_mm:3,  sheet_width_cm:244, sheet_height_cm:122, price:220,   price_good:250,   category:'back' },
  { material_id:'PLY_17MM',      name:'17mm Plywood',                   thickness_mm:17, sheet_width_cm:244, sheet_height_cm:122, price:1900,  price_good:2300,  category:'wood' },
  { material_id:'LAMICA_4MM',    name:'Lamica 3012 Natural 4.2MM',      thickness_mm:4,  sheet_width_cm:244, sheet_height_cm:122, price:311.4, price_good:311.4, category:'laminate' },
  { material_id:'GLOSS_18',      name:'Glossmax MDF 18mm',              thickness_mm:18, sheet_width_cm:244, sheet_height_cm:122, price:5450,  price_good:5450,  category:'mdf' },
  { material_id:'GLOSS_18_PREM', name:'Glossmax MDF 18mm Premium',      thickness_mm:18, sheet_width_cm:244, sheet_height_cm:122, price:6500,  price_good:6500,  category:'mdf' },
  { material_id:'SMOOTH_WHITE',  name:'لوح ناعم لامع ابيض',             thickness_mm:17, sheet_width_cm:244, sheet_height_cm:122, price:2750,  price_good:2750,  category:'mdf' },
  { material_id:'MDF_17_PLAIN',  name:'MDF 17mm Plain',                 thickness_mm:17, sheet_width_cm:244, sheet_height_cm:122, price:965,   price_good:965,   category:'mdf' },
  { material_id:'MDF_17_F2',     name:'MDF 17mm F2 Plain',              thickness_mm:17, sheet_width_cm:244, sheet_height_cm:122, price:1050,  price_good:1050,  category:'mdf' },
  { material_id:'MDF_21_F2',     name:'MDF 21mm F2 Plain',              thickness_mm:21, sheet_width_cm:244, sheet_height_cm:122, price:1390,  price_good:1390,  category:'mdf' },
  { material_id:'MDF_24_F2',     name:'MDF 24mm F2 Plain',              thickness_mm:24, sheet_width_cm:244, sheet_height_cm:122, price:1500,  price_good:1500,  category:'mdf' },
  { material_id:'MDF_3.2_F1',    name:'MDF 3.2mm F1 Plain',             thickness_mm:3,  sheet_width_cm:244, sheet_height_cm:122, price:162,   price_good:285,   category:'back' },
  { material_id:'MDF_4_BEIGE',   name:'MDF 4mm F1 Beige Wood',          thickness_mm:4,  sheet_width_cm:244, sheet_height_cm:122, price:360,   price_good:360,   category:'back' },
  { material_id:'MDF_4.2_F1',    name:'MDF 4.2mm F1 Plain',             thickness_mm:4,  sheet_width_cm:244, sheet_height_cm:122, price:365,   price_good:365,   category:'back' },
  { material_id:'CHIP_17_F2',    name:'Chipboard 17mm F2 Plain',        thickness_mm:17, sheet_width_cm:244, sheet_height_cm:122, price:590,   price_good:1050,  category:'chipboard' },
  { material_id:'CHIP_17_F1',    name:'Chipboard 17mm F1 Plain',        thickness_mm:17, sheet_width_cm:244, sheet_height_cm:122, price:490,   price_good:980,   category:'chipboard' },
]

// ─── ACCESSORIES ─────────────────────────────────────────────────────────────
export const DEFAULT_ACCESSORIES = [
  { acc_id:'LAMICA_BAND',   name:'Lamica Natural Banding',     price:2.8,   price_good:6.22,  unit:'meter',  group:'edge_banding' },
  { acc_id:'EDGE_STD',      name:'Edge Banding Standard',       price:4,     price_good:6.22,  unit:'meter',  group:'edge_banding' },
  { acc_id:'EDGE_MAUN',     name:'Edge Banding MAUN MAT 204',   price:6.22,  price_good:6.22,  unit:'meter',  group:'edge_banding' },
  { acc_id:'GLASS_SLIDE',   name:'ضلفة زجاج جرار 100x200cm',   price:1750,  price_good:2200,  unit:'piece',  group:'sliding' },
  { acc_id:'DOWEL_SET',     name:'اليتة 3 قطعة 34مم',           price:6,     price_good:8,     unit:'piece',  group:'fastener' },
  { acc_id:'DOWEL_6',       name:'كاويلة 6مم',                   price:0.5,   price_good:0.5,   unit:'piece',  group:'fastener' },
  { acc_id:'DOWEL_8',       name:'كاويلة 8مم',                   price:1,     price_good:1,     unit:'piece',  group:'fastener' },
  { acc_id:'SLIDE_30',      name:'مجري تلسكوبي 30سم',           price:70,    price_good:147,   unit:'pair',   group:'drawer_slide' },
  { acc_id:'SLIDE_35',      name:'مجري تلسكوبي 35سم',           price:75,    price_good:158,   unit:'pair',   group:'drawer_slide' },
  { acc_id:'SLIDE_40',      name:'مجري تلسكوبي 40سم',           price:93,    price_good:168,   unit:'pair',   group:'drawer_slide' },
  { acc_id:'SLIDE_45',      name:'مجري تلسكوبي 45سم',           price:110,   price_good:251,   unit:'pair',   group:'drawer_slide' },
  { acc_id:'SLIDE_50',      name:'مجري تلسكوبي 50سم',           price:125,   price_good:260,   unit:'pair',   group:'drawer_slide' },
  { acc_id:'SLIDE_55',      name:'مجري تلسكوبي 55سم',           price:140,   price_good:275,   unit:'pair',   group:'drawer_slide' },
  { acc_id:'LATCH_SLIDE',   name:'مجرى لطش ضرفة جرار',          price:150,   price_good:190,   unit:'piece',  group:'sliding' },
  { acc_id:'HINGE_STR',     name:'مفصلة عدلة عادة',              price:10,    price_good:30,    unit:'piece',  group:'hinge' },
  { acc_id:'HINGE_HALF',    name:'مفصلة نص ركبة عادة',           price:10,    price_good:30,    unit:'piece',  group:'hinge' },
  { acc_id:'HINGE_FULL',    name:'مفصلة ركبة عادة',              price:17,    price_good:30,    unit:'piece',  group:'hinge' },
  { acc_id:'BUTTERFLY',     name:'فراشة بلاستيك',                price:1.75,  price_good:1.75,  unit:'piece',  group:'fastener' },
  { acc_id:'HANDLE_SLIDE20',name:'مقبض دفن ضلفة جرار 20سم',     price:9,     price_good:16,    unit:'piece',  group:'handle' },
  { acc_id:'HANDLE_96',     name:'مقبض مصورة 96مم',              price:13,    price_good:25,    unit:'piece',  group:'handle' },
  { acc_id:'HANDLE_128',    name:'مقبض 128مم',                   price:14,    price_good:25,    unit:'piece',  group:'handle' },
  { acc_id:'HANDLE_160',    name:'مقبض مصورة 160مم',             price:12.5,  price_good:25,    unit:'piece',  group:'handle' },
  { acc_id:'HANDLE_192',    name:'مقبض 192مم',                   price:16.5,  price_good:28,    unit:'piece',  group:'handle' },
  { acc_id:'HANDLE_W15',    name:'مقبض خشب ابيض 15سم',          price:10,    price_good:15,    unit:'piece',  group:'handle' },
  { acc_id:'HANDLE_W25',    name:'مقبض خشب ابيض 25سم',          price:10,    price_good:15,    unit:'piece',  group:'handle' },
  { acc_id:'HANDLE_W100',   name:'مقبض خشب ابيض 100سم',         price:20,    price_good:25,    unit:'piece',  group:'handle' },
  { acc_id:'HANDLE_L_M',    name:'مقبض قطاع L بالمتر',           price:20,    price_good:25,    unit:'meter',  group:'handle' },
  { acc_id:'KNOB_SQ',       name:'مقبض زرار مربع',               price:13,    price_good:15,    unit:'piece',  group:'handle' },
  { acc_id:'KNOB_ROUND',    name:'مقبض زرار دائري',              price:13,    price_good:15,    unit:'piece',  group:'handle' },
  { acc_id:'HANDLE_ALU',    name:'مقبض المونيوم',                 price:362,   price_good:362,   unit:'piece',  group:'handle' },
  { acc_id:'HANDLE_BLK80',  name:'مقبض اسود 80سم',              price:45,    price_good:45,    unit:'piece',  group:'handle' },
  { acc_id:'MIRROR_M2',     name:'Mirror',                       price:400,   price_good:400,   unit:'m²',     group:'mirror' },
  { acc_id:'SHELF_SUPPORT', name:'Shelf Support Pin',             price:2,     price_good:2,     unit:'piece',  group:'fastener' },
]

// ─── COMMERCIAL CONFIG ───────────────────────────────────────────────────────
export const DEFAULT_COMMERCIAL = {
  vat_percent: 0.14,
  commission_percent: 0.40,
  overhead_percent: 0.10,
  seller_margin_percent: 0.15,
}

// ─── CATEGORY → DEFAULT MATERIAL MAPPING ─────────────────────────────────────
// Which materials typically go with which sub-category
export const CATEGORY_MATERIAL_DEFAULTS = {
  'Wardrobes':        { body:'MDF_17_F2',  back:'MDF_3.2_F1', door:'MDF_17_F2' },
  'Dressings':        { body:'MDF_17_F2',  back:'MDF_3.2_F1', door:'MDF_17_F2' },
  'Tv Unit':          { body:'MDF_17_F2',  back:'MDF_4_BEIGE', door:'MDF_17_F2' },
  'Shoe Racks':       { body:'CHIP_17_F2', back:'MDF_3.2_F1', door:'CHIP_17_F2' },
  'Commodes':         { body:'MDF_17_F2',  back:'MDF_3.2_F1', door:'MDF_17_F2' },
  'Buffet':           { body:'MDF_17_F2',  back:'MDF_4_BEIGE', door:'MDF_17_F2' },
  'Display Unit':     { body:'MDF_17_F2',  back:'MDF_3.2_F1', door:'MDF_17_F2' },
  'Unit Drawers':     { body:'MDF_17_F2',  back:'MDF_3.2_F1', door:'MDF_17_F2' },
  'Kitchen Storage Units':   { body:'MDF_17_F2', back:'MDF_4_BEIGE', door:'MDF_17_F2' },
  'Bathroom Storage Units':  { body:'MDF_17_F2', back:'MDF_4.2_F1',  door:'MDF_17_F2' },
  'File Cabinets & Bookcases':{ body:'CHIP_17_F2', back:'MDF_3.2_F1', door:'CHIP_17_F2' },
  'Office Wardrobes': { body:'MDF_17_F2',  back:'MDF_3.2_F1', door:'MDF_17_F2' },
  'Coffee Corners':   { body:'MDF_17_F2',  back:'MDF_4_BEIGE', door:'MDF_17_F2' },
  'Other':            { body:'MDF_17_F2',  back:'MDF_3.2_F1', door:'MDF_17_F2' },
}

// ─── SAMPLE SKUS ─────────────────────────────────────────────────────────────
export const SAMPLE_SKUS = [
  { sku_code:"WOOD.R.woodrate1058", name:"دولاب ضلفتين - أبيض", seller:"Woodrate", sub_category:"Wardrobes", width_cm:100, depth_cm:60, height_cm:210, door_type:"Hinged", doors_count:2, drawers_count:3, shelves_count:5, partitions_count:1, has_sliding_system:false, has_mirror:false, body_material_id:"MDF_17_F2", back_material_id:"MDF_3.2_F1", door_material_id:"MDF_17_F2", selling_price:10000 },
  { sku_code:"PRIWO192", name:"دريسنج ام دى اف أبيض", seller:"Premier Wood", sub_category:"Wardrobes", width_cm:240, depth_cm:58, height_cm:200, door_type:"Open", doors_count:0, drawers_count:8, shelves_count:9, partitions_count:4, has_sliding_system:false, has_mirror:false, body_material_id:"MDF_17_F2", back_material_id:"MDF_3.2_F1", door_material_id:"MDF_17_F2", selling_price:10000 },
  { sku_code:"WOOD.R.woodrate1184", name:"دولاب 3 ضلف - أبيض", seller:"Woodrate", sub_category:"Wardrobes", width_cm:160, depth_cm:60, height_cm:210, door_type:"Hinged", doors_count:4, drawers_count:0, shelves_count:10, partitions_count:3, has_sliding_system:false, has_mirror:false, body_material_id:"MDF_17_F2", back_material_id:"MDF_3.2_F1", door_material_id:"MDF_17_F2", selling_price:10000 },
  { sku_code:"MAU3081", name:"دولاب خشب ضلفتين سلايد", seller:"Joint For Furniture", sub_category:"Wardrobes", width_cm:120, depth_cm:62, height_cm:180, door_type:"Sliding", doors_count:2, drawers_count:0, shelves_count:6, partitions_count:1, has_sliding_system:true, has_mirror:false, body_material_id:"MDF_17_F2", back_material_id:"MDF_3.2_F1", door_material_id:"MDF_17_F2", selling_price:10000 },
  { sku_code:"WOOD.R.woodrate1159", name:"دولاب 4 ضلف مرآة", seller:"Woodrate", sub_category:"Wardrobes", width_cm:200, depth_cm:60, height_cm:210, door_type:"Hinged", doors_count:4, drawers_count:0, shelves_count:12, partitions_count:3, has_sliding_system:false, has_mirror:true, body_material_id:"MDF_17_F2", back_material_id:"MDF_3.2_F1", door_material_id:"MDF_17_F2", selling_price:10000 },
  { sku_code:"TV-MDF-001", name:"وحدة تلفزيون ام دي اف", seller:"Premier Wood", sub_category:"Tv Unit", width_cm:180, depth_cm:45, height_cm:50, door_type:"Hinged", doors_count:2, drawers_count:2, shelves_count:2, partitions_count:1, has_sliding_system:false, has_mirror:false, body_material_id:"MDF_17_F2", back_material_id:"MDF_4_BEIGE", door_material_id:"MDF_17_F2", selling_price:10000 },
  { sku_code:"SHOE-001", name:"جزامة 3 ضلف مرآة", seller:"Woodrate", sub_category:"Shoe Racks", width_cm:80, depth_cm:30, height_cm:120, door_type:"Hinged", doors_count:3, drawers_count:0, shelves_count:6, partitions_count:2, has_sliding_system:false, has_mirror:true, body_material_id:"CHIP_17_F2", back_material_id:"MDF_3.2_F1", door_material_id:"CHIP_17_F2", selling_price:10000 },
  { sku_code:"COM-001", name:"كومود خشب ام دي اف", seller:"Woodrate", sub_category:"Commodes", width_cm:50, depth_cm:40, height_cm:60, door_type:"Open", doors_count:0, drawers_count:3, shelves_count:0, partitions_count:0, has_sliding_system:false, has_mirror:false, body_material_id:"MDF_17_F2", back_material_id:"MDF_3.2_F1", door_material_id:"MDF_17_F2", selling_price:10000 },
  { sku_code:"BUF-001", name:"بوفيه خشب مودرن", seller:"Joint For Furniture", sub_category:"Buffet", width_cm:160, depth_cm:45, height_cm:90, door_type:"Hinged", doors_count:4, drawers_count:2, shelves_count:2, partitions_count:3, has_sliding_system:false, has_mirror:false, body_material_id:"MDF_17_F2", back_material_id:"MDF_4_BEIGE", door_material_id:"MDF_17_F2", selling_price:10000 },
  { sku_code:"DIS-001", name:"وحدة عرض خشب", seller:"Premier Wood", sub_category:"Display Unit", width_cm:100, depth_cm:35, height_cm:180, door_type:"Hinged", doors_count:2, drawers_count:0, shelves_count:5, partitions_count:1, has_sliding_system:false, has_mirror:false, body_material_id:"MDF_17_F2", back_material_id:"MDF_3.2_F1", door_material_id:"MDF_17_F2", selling_price:10000 },
]
