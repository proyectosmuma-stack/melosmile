-- ============================================================
-- Migration 002: Extended schema for full patient management
-- ============================================================

-- ───────────────────────────────────────────────
-- 1. AUTO-GENERATE historia_id as PAC-### trigger
-- ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_historia_id()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  -- Only run if historia_id is not already set
  IF NEW.historia_id IS NULL OR NEW.historia_id = '' THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(historia_id FROM 5) AS INTEGER)), 0) + 1
      INTO next_num
      FROM patients
      WHERE historia_id ~ '^PAC-[0-9]+$';
    NEW.historia_id := 'PAC-' || LPAD(next_num::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_historia_id ON patients;
CREATE TRIGGER trg_generate_historia_id
  BEFORE INSERT ON patients
  FOR EACH ROW
  EXECUTE FUNCTION generate_historia_id();

-- ───────────────────────────────────────────────
-- 2. Extend patients table with billing & Odoo fields
-- ───────────────────────────────────────────────
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS nif_cif VARCHAR(20),
  ADD COLUMN IF NOT EXISTS billing_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS billing_address TEXT,
  ADD COLUMN IF NOT EXISTS billing_city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS billing_postal_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS billing_country VARCHAR(100) DEFAULT 'España',
  ADD COLUMN IF NOT EXISTS odoo_partner_id INTEGER,           -- Odoo res.partner ID
  ADD COLUMN IF NOT EXISTS ai_summary TEXT,                   -- AI-generated treatment summary
  ADD COLUMN IF NOT EXISTS ai_summary_updated_at TIMESTAMP WITH TIME ZONE;

-- ───────────────────────────────────────────────
-- 3. clinic_treatments: price per treatment per clinic (+ Odoo product sync)
-- ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clinic_treatments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  treatment_id UUID REFERENCES treatments(id) ON DELETE CASCADE NOT NULL,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  odoo_product_id INTEGER,            -- Odoo product.product ID
  odoo_product_tmpl_id INTEGER,       -- Odoo product.template ID
  odoo_last_sync_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (clinic_id, treatment_id)
);

-- ───────────────────────────────────────────────
-- 4. patient_clinics: many-to-many patients ↔ clinics
-- ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_primary BOOLEAN DEFAULT FALSE,
  UNIQUE (patient_id, clinic_id)
);

-- ───────────────────────────────────────────────
-- 5. patient_representatives: legal rep for minors
-- ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_representatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  relationship VARCHAR(100),          -- e.g. Madre, Padre, Tutor
  dni_nie VARCHAR(50),
  phone VARCHAR(50),
  email VARCHAR(255),
  is_primary_contact BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ───────────────────────────────────────────────
-- 6. documents: patient files stored on VPS
-- ───────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE document_type AS ENUM (
    'consentimiento', 'radiografia', 'foto_clinica', 'presupuesto',
    'plan_tratamiento', 'informe', 'otro'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  document_type document_type DEFAULT 'otro',
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,            -- VPS path: /opt/melosmile/docs/PAC-001/...
  file_url TEXT,                      -- Public/signed URL if applicable
  file_size_bytes INTEGER,
  mime_type VARCHAR(100),
  description TEXT,
  uploaded_by VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ───────────────────────────────────────────────
-- 7. reminders: scheduled notifications (email, web, telegram)
-- ───────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE reminder_channel AS ENUM ('email', 'telegram', 'web', 'sms');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE reminder_status AS ENUM ('pendiente', 'enviado', 'error', 'leido', 'cancelado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE reminder_type AS ENUM (
    'cambio_alineador', 'confirmar_cita', 'recordatorio_cita',
    'pago_pendiente', 'seguimiento', 'personalizado'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  reminder_type reminder_type DEFAULT 'personalizado',
  channel reminder_channel DEFAULT 'email',
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  subject VARCHAR(255),
  message TEXT NOT NULL,
  status reminder_status DEFAULT 'pendiente',
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  n8n_execution_id VARCHAR(100),      -- Track n8n workflow execution
  created_by VARCHAR(100) DEFAULT 'ai',  -- 'ai' or 'manual'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ───────────────────────────────────────────────
-- 8. reminder_events: history log of actions on a reminder
-- ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reminder_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID REFERENCES reminders(id) ON DELETE CASCADE NOT NULL,
  event_type VARCHAR(50) NOT NULL,    -- 'created', 'sent', 'read', 'confirmed', 'cancelled', 'error'
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ───────────────────────────────────────────────
-- 9. Extend billing_records with Odoo sync fields
-- ───────────────────────────────────────────────
ALTER TABLE billing_records
  ADD COLUMN IF NOT EXISTS odoo_invoice_id INTEGER,
  ADD COLUMN IF NOT EXISTS odoo_invoice_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS odoo_invoice_state VARCHAR(50),
  ADD COLUMN IF NOT EXISTS odoo_synced_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),        -- efectivo, tarjeta, transferencia
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- ───────────────────────────────────────────────
-- 10. payment_installments: for treatment payment plans
-- ───────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE installment_status AS ENUM ('pendiente', 'pagado', 'vencido', 'cancelado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS payment_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  billing_record_id UUID REFERENCES billing_records(id) ON DELETE SET NULL,
  description VARCHAR(255),           -- e.g. "Cuota 1/6 - Ortodoncia"
  amount NUMERIC(10, 2) NOT NULL,
  due_date DATE NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_method VARCHAR(50),
  status installment_status DEFAULT 'pendiente',
  odoo_invoice_id INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ───────────────────────────────────────────────
-- 11. RLS Policies for new tables
-- ───────────────────────────────────────────────
ALTER TABLE clinic_treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_representatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_installments ENABLE ROW LEVEL SECURITY;

-- Allow all for authenticated users (tighten per role later)
DO $$ 
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'clinic_treatments', 'patient_clinics', 'patient_representatives',
    'documents', 'reminders', 'reminder_events', 'payment_installments'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow all authenticated" ON %I', tbl);
    EXECUTE format('CREATE POLICY "Allow all authenticated" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow anon read" ON %I', tbl);
    EXECUTE format('CREATE POLICY "Allow anon read" ON %I FOR SELECT TO anon USING (true)', tbl);
  END LOOP;
END $$;
