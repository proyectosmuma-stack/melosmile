-- ============================================================
-- Migration: Add appointment_reason column to billing_records
-- ============================================================

-- Add appointment_reason column to billing_records table.
-- This column maps the appointment's reason for billing references.
ALTER TABLE billing_records ADD COLUMN IF NOT EXISTS appointment_reason TEXT;

-- Optional: Populate appointment_reason from the joined appointment for existing records
UPDATE billing_records SET appointment_reason = appointments.reason
FROM appointments
WHERE billing_records.appointment_id = appointments.id
AND billing_records.appointment_reason IS NULL;

COMMENT ON COLUMN billing_records.appointment_reason IS 'Reason text from the linked appointment (maps appointments.reason)';