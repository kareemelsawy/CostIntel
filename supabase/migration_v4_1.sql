-- ============================================================
-- CostIntel v4.1 — Database Migration
-- Run this in Supabase SQL Editor
-- ============================================================
-- Changes:
--   1. Add engine_overrides table (new)
--   2. Ensure skus table has correct upsert conflict target (sku_code)
--   3. Re-confirm RLS policies allow authenticated writes
-- ============================================================

-- ─── 1. Engine Overrides Table ──────────────────────────────
CREATE TABLE IF NOT EXISTS engine_overrides (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  override_key  TEXT UNIQUE NOT NULL,
  override_value TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE engine_overrides ENABLE ROW LEVEL SECURITY;

-- Public read so all users can load overrides
DROP POLICY IF EXISTS "pub_r_engine" ON engine_overrides;
CREATE POLICY "pub_r_engine" ON engine_overrides FOR SELECT USING (true);

-- Authenticated write (any logged-in @homzmart.com user can edit)
DROP POLICY IF EXISTS "auth_w_engine" ON engine_overrides;
CREATE POLICY "auth_w_engine" ON engine_overrides FOR ALL USING (auth.role() = 'authenticated');

-- Auto-update updated_at on changes
DROP TRIGGER IF EXISTS trg_engine ON engine_overrides;
CREATE TRIGGER trg_engine
  BEFORE UPDATE ON engine_overrides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ─── 2. Confirm SKUs table is correct ───────────────────────
-- The skus table uses sku_code as the upsert conflict target.
-- Ensure the unique constraint exists (it should from v4 schema):
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'skus'::regclass
    AND conname = 'skus_sku_code_key'
  ) THEN
    ALTER TABLE skus ADD CONSTRAINT skus_sku_code_key UNIQUE (sku_code);
  END IF;
END $$;


-- ─── 3. Confirm RLS write policies for skus ─────────────────
-- Recreate to be sure (DROP IF EXISTS is safe):
DROP POLICY IF EXISTS "auth_w_skus" ON skus;
CREATE POLICY "auth_w_skus" ON skus
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Same for materials
DROP POLICY IF EXISTS "auth_w_mat" ON materials;
CREATE POLICY "auth_w_mat" ON materials
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Same for accessories
DROP POLICY IF EXISTS "auth_w_acc" ON accessories;
CREATE POLICY "auth_w_acc" ON accessories
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Same for commercial_settings
DROP POLICY IF EXISTS "auth_w_com" ON commercial_settings;
CREATE POLICY "auth_w_com" ON commercial_settings
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ─── Done ───────────────────────────────────────────────────
-- After running this script:
--   - engine_overrides table is ready
--   - All authenticated users can read/write SKUs, materials,
--     accessories, commercial settings, and engine overrides
--   - SKU upserts will use sku_code as the conflict target
-- ============================================================
