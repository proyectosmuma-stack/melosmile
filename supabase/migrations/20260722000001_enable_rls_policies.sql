-- Migration: Enable permissive RLS policies for application tables

-- Enable RLS and create permissive policies for public role on clinics, professionals, treatments, patients, appointments, billing_records

ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access on clinics" ON clinics;
CREATE POLICY "Public full access on clinics" ON clinics FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access on professionals" ON professionals;
CREATE POLICY "Public full access on professionals" ON professionals FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access on treatments" ON treatments;
CREATE POLICY "Public full access on treatments" ON treatments FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access on patients" ON patients;
CREATE POLICY "Public full access on patients" ON patients FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access on appointments" ON appointments;
CREATE POLICY "Public full access on appointments" ON appointments FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE billing_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access on billing_records" ON billing_records;
CREATE POLICY "Public full access on billing_records" ON billing_records FOR ALL USING (true) WITH CHECK (true);
