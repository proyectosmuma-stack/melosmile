-- Migration 007: Add dni_nie and address to professionals
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS dni_nie VARCHAR(50);
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS address TEXT;
