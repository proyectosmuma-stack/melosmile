-- ============================================================
-- Migration 005: Treatment Families, Clinic Commission Rules
--                (schema only)
-- ============================================================
-- NOTE: El seed de clínicas / profesionales / familias / tratamientos
-- fue eliminado de esta migración (decisión 2026-08-22): usaba
-- gen_random_uuid() + ON CONFLICT (name) DO NOTHING, lo que impedía
-- sobrescribir con los IDs reales del seed.sql (export cloud) y
-- forzaba un TRUNCATE manual tras cada 'supabase db reset'.
-- La fuente única de datos ahora es supabase/seed.sql.

-- ───────────────────────────────────────────────
-- 1. Extend clinics table with contact info + commission config
-- ───────────────────────────────────────────────
ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS color_hex VARCHAR(20) DEFAULT '#10b981',
  ADD COLUMN IF NOT EXISTS base_commission_pct NUMERIC(5,2) DEFAULT 40.00,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ───────────────────────────────────────────────
-- 2. Treatment families
-- ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS treatment_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  color_hex VARCHAR(20) DEFAULT '#6366f1',
  icon VARCHAR(50) DEFAULT 'stethoscope',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ───────────────────────────────────────────────
-- 3. Extend treatments table with family and lab cost
-- ───────────────────────────────────────────────
ALTER TABLE treatments
  ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES treatment_families(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS abbreviation VARCHAR(50),
  ADD COLUMN IF NOT EXISTS typical_lab_cost NUMERIC(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS odoo_product_ref VARCHAR(100),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ───────────────────────────────────────────────
-- 4. Clinic commission rules per treatment family
-- ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clinic_commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  family_id UUID REFERENCES treatment_families(id) ON DELETE CASCADE NOT NULL,
  commission_pct NUMERIC(5,2) NOT NULL DEFAULT 40.00,  -- % to professional
  lab_discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00,  -- % lab cost deducted from professional net
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (clinic_id, family_id)
);

-- ───────────────────────────────────────────────
-- 5. Extend billing_records with profitability tracking
-- ───────────────────────────────────────────────
ALTER TABLE billing_records
  ADD COLUMN IF NOT EXISTS actual_lab_cost NUMERIC(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS profitability_status VARCHAR(20) DEFAULT 'ok'; -- ok | warning | loss

-- ───────────────────────────────────────────────
-- 6. RLS Policies
-- ───────────────────────────────────────────────
ALTER TABLE treatment_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_commission_rules ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['treatment_families','clinic_commission_rules'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow all authenticated" ON %I', tbl);
    EXECUTE format('CREATE POLICY "Allow all authenticated" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow anon read" ON %I', tbl);
    EXECUTE format('CREATE POLICY "Allow anon read" ON %I FOR SELECT TO anon USING (true)', tbl);
  END LOOP;
END $$;
