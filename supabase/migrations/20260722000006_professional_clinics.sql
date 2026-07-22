-- Migration 006: professional_clinics table for multi-clinic assignment
CREATE TABLE IF NOT EXISTS professional_clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE NOT NULL,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (professional_id, clinic_id)
);

ALTER TABLE professional_clinics ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow all authenticated" ON professional_clinics;
  CREATE POLICY "Allow all authenticated" ON professional_clinics FOR ALL TO authenticated USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Allow anon read" ON professional_clinics;
  CREATE POLICY "Allow anon read" ON professional_clinics FOR SELECT TO anon USING (true);
END $$;
