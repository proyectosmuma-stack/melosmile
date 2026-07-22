-- Migration 004: Fix RLS Policies for patient_clinics, patient_representatives, and related tables

ALTER TABLE public.patient_clinics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on patient_clinics" ON public.patient_clinics;
CREATE POLICY "Allow public all on patient_clinics" ON public.patient_clinics FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.patient_representatives ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on patient_representatives" ON public.patient_representatives;
CREATE POLICY "Allow public all on patient_representatives" ON public.patient_representatives FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on documents" ON public.documents;
CREATE POLICY "Allow public all on documents" ON public.documents FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on reminders" ON public.reminders;
CREATE POLICY "Allow public all on reminders" ON public.reminders FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.clinic_treatments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on clinic_treatments" ON public.clinic_treatments;
CREATE POLICY "Allow public all on clinic_treatments" ON public.clinic_treatments FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.payment_installments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on payment_installments" ON public.payment_installments;
CREATE POLICY "Allow public all on payment_installments" ON public.payment_installments FOR ALL USING (true) WITH CHECK (true);
