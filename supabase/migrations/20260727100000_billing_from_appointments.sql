-- ============================================================
-- Migration: Billing Calculation from Appointments
-- ============================================================

-- 1. Add appointment linking to billing_session_lines
ALTER TABLE billing_session_lines
  ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS procedure_index INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'appointment' 
    CHECK (source_type IN ('appointment', 'manual', 'excel_import'));

-- 2. Add billed tracking to appointments
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS billed_at TIMESTAMP WITH TIME ZONE;
