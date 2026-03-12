-- CostIntel v4.6 — Production Security Patch
-- Run this in Supabase SQL Editor to lock down SKU reads to authenticated users only

DROP POLICY IF EXISTS "pub_r_skus" ON skus;
CREATE POLICY "auth_r_skus" ON skus FOR SELECT USING (auth.role() = 'authenticated');
