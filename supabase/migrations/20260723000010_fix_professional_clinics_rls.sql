-- Migration 010: Fix RLS policies for professional_clinics table to allow public/anon insert, update, delete
ALTER TABLE public.professional_clinics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all on professional_clinics" ON public.professional_clinics;
CREATE POLICY "Allow public all on professional_clinics" ON public.professional_clinics FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon read" ON public.professional_clinics;
DROP POLICY IF EXISTS "Allow all authenticated" ON public.professional_clinics;
