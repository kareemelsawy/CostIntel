-- SKU Cost Intel v4 — NUCLEAR RESET
-- Drops ALL policies, triggers, functions, tables first

DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I CASCADE', r.policyname, r.tablename);
  END LOOP;
END $$;

DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_schema = 'public') LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I CASCADE', r.trigger_name, r.event_object_table);
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP TABLE IF EXISTS cost_snapshots CASCADE;
DROP TABLE IF EXISTS skus CASCADE;
DROP TABLE IF EXISTS accessories_pricing CASCADE;
DROP TABLE IF EXISTS accessories CASCADE;
DROP TABLE IF EXISTS commercial_settings CASCADE;
DROP TABLE IF EXISTS materials CASCADE;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE materials (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  material_id TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
  thickness_mm NUMERIC NOT NULL DEFAULT 17,
  sheet_width_cm NUMERIC NOT NULL DEFAULT 244, sheet_height_cm NUMERIC NOT NULL DEFAULT 122,
  price NUMERIC NOT NULL DEFAULT 0, price_good NUMERIC DEFAULT 0,
  category TEXT DEFAULT 'mdf', is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO materials (material_id,name,thickness_mm,sheet_width_cm,sheet_height_cm,price,price_good,category) VALUES
('MOSKY','موسكي',17,244,122,16500,20000,'wood'),('AZIZI','عزيزى',17,244,122,55000,55000,'wood'),
('ZAN','زان',17,244,122,41000,41000,'wood'),('TEAK','تيك',17,244,122,100000,100000,'wood'),
('BACK_PLKSH','ظهر ابلاكاش',3,244,122,200,200,'back'),('GLASS_6MM','زجاج 6 ملم شفاف',6,244,122,650,650,'glass'),
('VENEER_ARO','قشرة ارو',1,244,122,65,75,'veneer'),('PLY_3MM','3mm Plywood',3,244,122,220,250,'back'),
('PLY_17MM','17mm Plywood',17,244,122,1900,2300,'wood'),('LAMICA_4MM','Lamica 3012 Natural 4.2MM',4,244,122,311.4,311.4,'laminate'),
('GLOSS_18','Glossmax MDF 18mm',18,244,122,5450,5450,'mdf'),('GLOSS_18_PREM','Glossmax MDF 18mm Premium',18,244,122,6500,6500,'mdf'),
('SMOOTH_WHITE','لوح ناعم لامع ابيض',17,244,122,2750,2750,'mdf'),('MDF_17_PLAIN','MDF 17mm Plain',17,244,122,965,965,'mdf'),
('MDF_17_F2','MDF 17mm F2 Plain',17,244,122,1050,1050,'mdf'),('MDF_21_F2','MDF 21mm F2 Plain',21,244,122,1390,1390,'mdf'),
('MDF_24_F2','MDF 24mm F2 Plain',24,244,122,1500,1500,'mdf'),('MDF_3.2_F1','MDF 3.2mm F1 Plain',3,244,122,162,285,'back'),
('MDF_4_BEIGE','MDF 4mm F1 Beige Wood',4,244,122,360,360,'back'),('MDF_4.2_F1','MDF 4.2mm F1 Plain',4,244,122,365,365,'back'),
('CHIP_17_F2','Chipboard 17mm F2 Plain',17,244,122,590,1050,'chipboard'),('CHIP_17_F1','Chipboard 17mm F1 Plain',17,244,122,490,980,'chipboard');

CREATE TABLE accessories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  acc_id TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0, price_good NUMERIC DEFAULT 0,
  unit TEXT DEFAULT 'piece', "group" TEXT DEFAULT 'other',
  is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO accessories (acc_id,name,price,price_good,unit,"group") VALUES
('LAMICA_BAND','Lamica Natural Banding',2.8,6.22,'meter','edge_banding'),('EDGE_STD','Edge Banding Standard',4,6.22,'meter','edge_banding'),
('EDGE_MAUN','Edge Banding MAUN MAT 204',6.22,6.22,'meter','edge_banding'),('GLASS_SLIDE','ضلفة زجاج جرار 100x200cm',1750,2200,'piece','sliding'),
('DOWEL_SET','اليتة 3 قطعة 34مم',6,8,'piece','fastener'),('DOWEL_6','كاويلة 6مم',0.5,0.5,'piece','fastener'),
('DOWEL_8','كاويلة 8مم',1,1,'piece','fastener'),('SLIDE_30','مجري تلسكوبي 30سم',70,147,'pair','drawer_slide'),
('SLIDE_35','مجري تلسكوبي 35سم',75,158,'pair','drawer_slide'),('SLIDE_40','مجري تلسكوبي 40سم',93,168,'pair','drawer_slide'),
('SLIDE_45','مجري تلسكوبي 45سم',110,251,'pair','drawer_slide'),('SLIDE_50','مجري تلسكوبي 50سم',125,260,'pair','drawer_slide'),
('SLIDE_55','مجري تلسكوبي 55سم',140,275,'pair','drawer_slide'),('LATCH_SLIDE','مجرى لطش ضرفة جرار',150,190,'piece','sliding'),
('HINGE_STR','مفصلة عدلة عادة',10,30,'piece','hinge'),('HINGE_HALF','مفصلة نص ركبة عادة',10,30,'piece','hinge'),
('HINGE_FULL','مفصلة ركبة عادة',17,30,'piece','hinge'),('BUTTERFLY','فراشة بلاستيك',1.75,1.75,'piece','fastener'),
('HANDLE_SLIDE20','مقبض دفن ضلفة جرار 20سم',9,16,'piece','handle'),('HANDLE_96','مقبض مصورة 96مم',13,25,'piece','handle'),
('HANDLE_128','مقبض 128مم',14,25,'piece','handle'),('HANDLE_160','مقبض مصورة 160مم',12.5,25,'piece','handle'),
('HANDLE_192','مقبض 192مم',16.5,28,'piece','handle'),('HANDLE_W15','مقبض خشب ابيض 15سم',10,15,'piece','handle'),
('HANDLE_W25','مقبض خشب ابيض 25سم',10,15,'piece','handle'),('HANDLE_W100','مقبض خشب ابيض 100سم',20,25,'piece','handle'),
('HANDLE_L_M','مقبض قطاع L بالمتر',20,25,'meter','handle'),('KNOB_SQ','مقبض زرار مربع',13,15,'piece','handle'),
('KNOB_ROUND','مقبض زرار دائري',13,15,'piece','handle'),('HANDLE_ALU','مقبض المونيوم',362,362,'piece','handle'),
('HANDLE_BLK80','مقبض اسود 80سم',45,45,'piece','handle'),('MIRROR_M2','Mirror',400,400,'m²','mirror'),
('SHELF_SUPPORT','Shelf Support Pin',2,2,'piece','fastener');

CREATE TABLE commercial_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL, value NUMERIC NOT NULL, label TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
INSERT INTO commercial_settings (key,value,label) VALUES
('vat_percent',0.14,'VAT %'),('homzmart_margin_percent',0.40,'Homzmart Margin %'),
('overhead_percent',0.10,'Overhead %'),('seller_margin_percent',0.15,'Seller Margin %');

CREATE TABLE skus (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sku_code TEXT UNIQUE NOT NULL, name TEXT DEFAULT '', image_link TEXT DEFAULT '',
  seller TEXT DEFAULT '', sub_category TEXT DEFAULT 'Wardrobes', commercial_material TEXT DEFAULT 'MDF',
  width_cm NUMERIC DEFAULT 100, depth_cm NUMERIC DEFAULT 60, height_cm NUMERIC DEFAULT 210,
  door_type TEXT DEFAULT 'Hinged', doors_count INTEGER DEFAULT 0, drawers_count INTEGER DEFAULT 0,
  shelves_count INTEGER DEFAULT 0, spaces_count INTEGER DEFAULT 0, hangers_count INTEGER DEFAULT 0,
  internal_division TEXT DEFAULT 'NO', unit_type TEXT DEFAULT 'Floor Standing',
  has_mirror BOOLEAN DEFAULT false, mirror_count INTEGER DEFAULT 0,
  primary_color TEXT DEFAULT '', handle_type TEXT DEFAULT 'Normal', has_back_panel TEXT DEFAULT 'Close',
  body_material_id TEXT DEFAULT 'MDF_17_F2', back_material_id TEXT DEFAULT 'MDF_3.2_F1',
  door_material_id TEXT DEFAULT 'MDF_17_F2', selling_price NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_skus_code ON skus(sku_code);
CREATE INDEX idx_skus_cat ON skus(sub_category);
CREATE INDEX idx_mat_id ON materials(material_id);
CREATE INDEX idx_acc_id ON accessories(acc_id);

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE accessories ENABLE ROW LEVEL SECURITY;
ALTER TABLE commercial_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE skus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pub_r_mat" ON materials FOR SELECT USING (true);
CREATE POLICY "auth_w_mat" ON materials FOR ALL USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated');
CREATE POLICY "pub_r_acc" ON accessories FOR SELECT USING (true);
CREATE POLICY "auth_w_acc" ON accessories FOR ALL USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated');
CREATE POLICY "pub_r_com" ON commercial_settings FOR SELECT USING (true);
CREATE POLICY "auth_w_com" ON commercial_settings FOR ALL USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated');
CREATE POLICY "pub_r_skus" ON skus FOR SELECT USING (true);
CREATE POLICY "auth_w_skus" ON skus FOR ALL USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated');

CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_mat BEFORE UPDATE ON materials FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_acc BEFORE UPDATE ON accessories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_com BEFORE UPDATE ON commercial_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_sku BEFORE UPDATE ON skus FOR EACH ROW EXECUTE FUNCTION update_updated_at();
