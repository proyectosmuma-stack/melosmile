-- Migration: Add description column to treatments
-- Aplicar en: Local ✅ | Producción (pendiente deploy)
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS description TEXT;
