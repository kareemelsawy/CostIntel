-- ============================================================
-- CostIntel v1 Migration — Add description + has_secondary_color
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add new columns (IF NOT EXISTS prevents errors on re-run)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='skus' AND column_name='description') THEN
    ALTER TABLE skus ADD COLUMN description TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='skus' AND column_name='has_secondary_color') THEN
    ALTER TABLE skus ADD COLUMN has_secondary_color TEXT DEFAULT 'NO';
  END IF;
END $$;

-- Done
