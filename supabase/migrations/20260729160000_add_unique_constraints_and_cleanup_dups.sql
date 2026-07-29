-- ============================================================
-- Migration 20260729160000: Deduplicate Clinics, Professionals & Treatments
--                            and Add Unique Constraints
-- ============================================================

SET search_path = public;

-- 1. Deduplicate clinics (keep lowest UUID)
DELETE FROM clinics a USING clinics b
WHERE a.id > b.id AND a.name = b.name;

-- 2. Add UNIQUE constraint on clinics(name)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clinics_name_key'
  ) THEN
    ALTER TABLE clinics ADD CONSTRAINT clinics_name_key UNIQUE (name);
  END IF;
END $$;

-- 3. Deduplicate professionals (keep lowest UUID)
DELETE FROM professionals a USING professionals b
WHERE a.id > b.id AND a.first_name = b.first_name AND a.last_name = b.last_name;

-- 4. Add UNIQUE constraint on professionals(first_name, last_name)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'professionals_name_key'
  ) THEN
    ALTER TABLE professionals ADD CONSTRAINT professionals_name_key UNIQUE (first_name, last_name);
  END IF;
END $$;

-- 5. Deduplicate treatments (keep lowest UUID)
DELETE FROM treatments a USING treatments b
WHERE a.id > b.id AND a.service_name = b.service_name;

-- 6. Add UNIQUE constraint on treatments(service_name)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'treatments_service_name_key'
  ) THEN
    ALTER TABLE treatments ADD CONSTRAINT treatments_service_name_key UNIQUE (service_name);
  END IF;
END $$;
