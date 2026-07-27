-- ============================================================
-- Migration: Billing Calculation Module (ALBACETE Reference Model)
-- ============================================================

-- 1. Extend clinics table with payment tracking flag and default lab discount
ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS tracks_payments BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lab_discount_pct NUMERIC(5,2) DEFAULT 50.00;

-- 2. Billing Sessions (One per clinic per month/year)
CREATE TABLE IF NOT EXISTS billing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  clinic_name TEXT,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL CHECK (year >= 2000),
  model_type TEXT DEFAULT 'albacete' CHECK (model_type IN ('albacete', 'rozas', 'goya', 'multi_doctor')),
  commission_pct NUMERIC(5,2) DEFAULT 60.00,
  lab_discount_pct NUMERIC(5,2) DEFAULT 50.00,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'invoiced')),
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by TEXT,
  raw_input JSONB,
  source_type TEXT CHECK (source_type IN ('audio', 'image', 'excel', 'text', 'manual')),
  notes TEXT,
  total_subtotal NUMERIC(10,2) DEFAULT 0.00,
  total_commission NUMERIC(10,2) DEFAULT 0.00,
  total_lab NUMERIC(10,2) DEFAULT 0.00,
  total_neto NUMERIC(10,2) DEFAULT 0.00,
  UNIQUE (clinic_id, month, year)
);

-- 3. Billing Session Lines (Details per treatment/patient)
CREATE TABLE IF NOT EXISTS billing_session_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES billing_sessions(id) ON DELETE CASCADE NOT NULL,
  session_date DATE,
  patient_name TEXT NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  treatment_name TEXT NOT NULL,
  treatment_id UUID REFERENCES treatments(id) ON DELETE SET NULL,
  observation TEXT,
  quantity NUMERIC(10,2) DEFAULT 1.00,
  unit_price NUMERIC(10,2) DEFAULT 0.00,
  alt_price NUMERIC(10,2) DEFAULT 0.00,
  effective_price NUMERIC(10,2) DEFAULT 0.00,
  discount NUMERIC(10,2) DEFAULT 0.00,
  subtotal NUMERIC(10,2) DEFAULT 0.00,
  commission_pct NUMERIC(5,2) DEFAULT 60.00,
  commission_amount NUMERIC(10,2) DEFAULT 0.00,
  -- Laboratorio
  lab_name TEXT,
  lab_quantity NUMERIC(10,2) DEFAULT 0.00,
  lab_unit_cost NUMERIC(10,2) DEFAULT 0.00,
  lab_subtotal NUMERIC(10,2) DEFAULT 0.00,
  lab_discount_pct NUMERIC(5,2) DEFAULT 50.00,
  lab_total_discounted NUMERIC(10,2) DEFAULT 0.00,
  -- NETO
  net_amount NUMERIC(10,2) DEFAULT 0.00,
  -- Multi-doctor
  pct_dr_main NUMERIC(5,2) DEFAULT 100.00,
  amount_dr_main NUMERIC(10,2) DEFAULT 0.00,
  pct_dr_secondary NUMERIC(5,2) DEFAULT 0.00,
  amount_dr_secondary NUMERIC(10,2) DEFAULT 0.00,
  -- Flags de control
  needs_review BOOLEAN DEFAULT FALSE,
  is_negative BOOLEAN DEFAULT FALSE,
  no_price BOOLEAN DEFAULT FALSE,
  zero_quantity BOOLEAN DEFAULT FALSE,
  validation_flags JSONB DEFAULT '[]'::jsonb,
  -- Comparación vs catálogo
  catalog_price NUMERIC(10,2),
  price_deviation_pct NUMERIC(5,2),
  -- Estado de pago
  payment_status TEXT DEFAULT 'not_tracked' CHECK (payment_status IN ('paid', 'partial', 'pending', 'not_tracked')),
  payment_amount NUMERIC(10,2) DEFAULT 0.00,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable RLS & Policies
ALTER TABLE billing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_session_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon and authenticated all on billing_sessions"
  ON billing_sessions FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon and authenticated all on billing_session_lines"
  ON billing_session_lines FOR ALL USING (true) WITH CHECK (true);

-- Indexes for fast query filtering
CREATE INDEX IF NOT EXISTS idx_billing_sessions_clinic_month ON billing_sessions(clinic_id, year, month);
CREATE INDEX IF NOT EXISTS idx_billing_session_lines_session ON billing_session_lines(session_id);
