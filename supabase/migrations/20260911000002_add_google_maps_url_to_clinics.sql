-- Migration: Add google_maps_url to clinics
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS google_maps_url TEXT;
