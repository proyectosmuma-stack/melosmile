-- Migration 008: treatment_clinic_prices table + RLS fixes
-- Precios por clínica para tratamientos

CREATE TABLE IF NOT EXISTS treatment_clinic_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id UUID REFERENCES treatments(id) ON DELETE CASCADE NOT NULL,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (treatment_id, clinic_id)
);

ALTER TABLE treatment_clinic_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all authenticated" ON treatment_clinic_prices;
CREATE POLICY "Allow all authenticated" ON treatment_clinic_prices
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all" ON treatment_clinic_prices;
CREATE POLICY "Allow anon all" ON treatment_clinic_prices
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Fix RLS on clinic_commission_rules (allow anon writes from browser)
ALTER TABLE clinic_commission_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all" ON clinic_commission_rules;
CREATE POLICY "Allow anon all" ON clinic_commission_rules
  FOR ALL TO anon USING (true) WITH CHECK (true);
