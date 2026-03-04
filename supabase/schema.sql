-- ============================================================================
-- SKU Cost Intelligence Tool — Supabase Schema
-- Run this in the Supabase SQL Editor to set up your database.
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── RAW MATERIALS ──────────────────────────────────────────────────────────
CREATE TABLE materials (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  material_id   TEXT UNIQUE NOT NULL,          -- e.g. 'MDF_17'
  name          TEXT NOT NULL,                 -- e.g. 'MDF 17mm'
  thickness_mm  NUMERIC NOT NULL DEFAULT 17,
  sheet_width_cm  NUMERIC NOT NULL DEFAULT 244,
  sheet_height_cm NUMERIC NOT NULL DEFAULT 122,
  price_per_sheet NUMERIC NOT NULL DEFAULT 0,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Seed default materials
INSERT INTO materials (material_id, name, thickness_mm, sheet_width_cm, sheet_height_cm, price_per_sheet) VALUES
  ('MDF_17', 'MDF 17mm', 17, 244, 122, 1050),
  ('MDF_4',  'MDF 4mm',  4,  244, 122, 750);

-- ─── ACCESSORIES PRICING ────────────────────────────────────────────────────
CREATE TABLE accessories_pricing (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  key               TEXT UNIQUE NOT NULL,      -- e.g. 'hinge_price'
  label             TEXT NOT NULL,             -- e.g. 'Hinge'
  unit              TEXT DEFAULT 'pc',         -- pc, pair, set, m, m2
  price             NUMERIC NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- Seed default accessories
INSERT INTO accessories_pricing (key, label, unit, price) VALUES
  ('hinge_price',             'Hinge',              'pc',   25),
  ('drawer_slide_price',      'Drawer Slide',       'pair', 120),
  ('handle_price',            'Handle',             'pc',   30),
  ('shelf_support_price',     'Shelf Support',      'pc',   2),
  ('sliding_mechanism_price', 'Sliding Mechanism',  'set',  950),
  ('mirror_price_per_m2',     'Mirror',             'm²',   400),
  ('edge_banding_price_per_meter', 'Edge Banding',  'm',    5);

-- ─── COMMERCIAL SETTINGS ────────────────────────────────────────────────────
CREATE TABLE commercial_settings (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  key         TEXT UNIQUE NOT NULL,
  value       NUMERIC NOT NULL,
  label       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

INSERT INTO commercial_settings (key, value, label) VALUES
  ('vat_percent',        0.14, 'VAT %'),
  ('commission_percent', 0.40, 'Commission %');

-- ─── SKU CATALOG ────────────────────────────────────────────────────────────
CREATE TABLE skus (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sku_code          TEXT UNIQUE NOT NULL,           -- user-visible SKU id
  name              TEXT NOT NULL DEFAULT '',
  description       TEXT DEFAULT '',
  seller            TEXT DEFAULT '',
  sub_category      TEXT DEFAULT 'Wardrobes',
  image_url         TEXT DEFAULT '',

  -- Dimensions
  width_cm          NUMERIC NOT NULL DEFAULT 100,
  depth_cm          NUMERIC NOT NULL DEFAULT 60,
  height_cm         NUMERIC NOT NULL DEFAULT 210,

  -- Structure
  door_type         TEXT DEFAULT 'Hinged'           CHECK (door_type IN ('Hinged','Sliding','Open')),
  doors_count       INTEGER DEFAULT 0,
  drawers_count     INTEGER DEFAULT 0,
  shelves_count     INTEGER DEFAULT 0,
  partitions_count  INTEGER DEFAULT 0,
  has_sliding_system BOOLEAN DEFAULT false,
  has_mirror        BOOLEAN DEFAULT false,

  -- Material assignments (FK to materials.material_id)
  body_material_id  TEXT DEFAULT 'MDF_17'           REFERENCES materials(material_id),
  back_material_id  TEXT DEFAULT 'MDF_4'            REFERENCES materials(material_id),
  door_material_id  TEXT DEFAULT 'MDF_17'           REFERENCES materials(material_id),

  -- Commercial
  selling_price     NUMERIC DEFAULT 0,

  -- Metadata
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- ─── COST SNAPSHOTS (optional audit trail) ──────────────────────────────────
CREATE TABLE cost_snapshots (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sku_id            UUID REFERENCES skus(id) ON DELETE CASCADE,
  sku_code          TEXT NOT NULL,
  production_cost   NUMERIC NOT NULL,
  material_cost     NUMERIC NOT NULL,
  edge_cost         NUMERIC NOT NULL,
  accessories_cost  NUMERIC NOT NULL,
  selling_price     NUMERIC,
  commission        NUMERIC,
  vat               NUMERIC,
  net_profit        NUMERIC,
  net_margin_pct    NUMERIC,
  snapshot_data     JSONB DEFAULT '{}',            -- full breakdown for traceability
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ─── INDEXES ────────────────────────────────────────────────────────────────
CREATE INDEX idx_skus_sku_code     ON skus(sku_code);
CREATE INDEX idx_skus_sub_category ON skus(sub_category);
CREATE INDEX idx_skus_seller       ON skus(seller);
CREATE INDEX idx_skus_active       ON skus(is_active) WHERE is_active = true;
CREATE INDEX idx_snapshots_sku     ON cost_snapshots(sku_id);

-- ─── ROW LEVEL SECURITY ─────────────────────────────────────────────────────
-- Enable RLS on all tables (adjust policies to your auth needs)
ALTER TABLE materials          ENABLE ROW LEVEL SECURITY;
ALTER TABLE accessories_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE commercial_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE skus               ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_snapshots     ENABLE ROW LEVEL SECURITY;

-- Public read, authenticated write policies (adjust as needed)
CREATE POLICY "Anyone can read materials"        ON materials          FOR SELECT USING (true);
CREATE POLICY "Authenticated can modify materials" ON materials        FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can read accessories"      ON accessories_pricing FOR SELECT USING (true);
CREATE POLICY "Authenticated can modify accessories" ON accessories_pricing FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can read commercial"       ON commercial_settings FOR SELECT USING (true);
CREATE POLICY "Authenticated can modify commercial" ON commercial_settings FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can read skus"             ON skus               FOR SELECT USING (true);
CREATE POLICY "Authenticated can modify skus"    ON skus               FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can read snapshots"        ON cost_snapshots     FOR SELECT USING (true);
CREATE POLICY "Authenticated can modify snapshots" ON cost_snapshots   FOR ALL USING (auth.role() = 'authenticated');

-- ─── UPDATED_AT TRIGGER ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_materials_updated     BEFORE UPDATE ON materials          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_accessories_updated   BEFORE UPDATE ON accessories_pricing FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_commercial_updated    BEFORE UPDATE ON commercial_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_skus_updated          BEFORE UPDATE ON skus               FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- Done! Your database is ready.
-- Next: Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.
-- ============================================================================
