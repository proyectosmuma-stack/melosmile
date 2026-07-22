-- Migration 009: Odoo Pricelist and Sync Fields
-- Adds necessary columns to link clinics to Odoo pricelists and treatments to Odoo products

ALTER TABLE clinics 
  ADD COLUMN IF NOT EXISTS odoo_pricelist_id INTEGER;

ALTER TABLE treatments
  ADD COLUMN IF NOT EXISTS odoo_product_id INTEGER,
  ADD COLUMN IF NOT EXISTS odoo_product_tmpl_id INTEGER;

ALTER TABLE treatment_clinic_prices
  ADD COLUMN IF NOT EXISTS odoo_pricelist_item_id INTEGER;

-- Ensure RLS is active and allows auth users
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all authenticated on clinics" ON clinics;
CREATE POLICY "Allow all authenticated on clinics" ON clinics
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow anon for now as some UI flows use anon
DROP POLICY IF EXISTS "Allow anon all on clinics" ON clinics;
CREATE POLICY "Allow anon all on clinics" ON clinics
  FOR ALL TO anon USING (true) WITH CHECK (true);
