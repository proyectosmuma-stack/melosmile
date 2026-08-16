-- supabase/migrations/migrate_20260816_000001_add_is_active_to_patients_clinics.sql
-- Up migration
ALTER TABLE patients ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE clinics ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

-- Down migration
ALTER TABLE patients DROP COLUMN is_active;
ALTER TABLE clinics DROP COLUMN is_active;