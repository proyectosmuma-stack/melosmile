-- Add patient_id to billing_records
ALTER TABLE billing_records ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES patients(id);

-- Populate patient_id from the linked appointment
UPDATE billing_records SET patient_id = appointments.patient_id
FROM appointments
WHERE billing_records.appointment_id = appointments.id
AND billing_records.patient_id IS NULL;
