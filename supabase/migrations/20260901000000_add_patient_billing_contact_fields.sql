-- Add structured address fields for contact and billing unification
-- Allows separating contact address from billing address with checkbox control

ALTER TABLE patients
ADD COLUMN IF NOT EXISTS address_2 TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS province TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'España',
ADD COLUMN IF NOT EXISTS billing_same_as_contact BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS billing_address_2 TEXT,
ADD COLUMN IF NOT EXISTS billing_province TEXT;

-- Update existing patients to have default values
UPDATE patients
SET 
    country = COALESCE(country, 'España'),
    billing_same_as_contact = COALESCE(billing_same_as_contact, true)
WHERE country IS NULL OR billing_same_as_contact IS NULL;

-- Comment on new columns for documentation
COMMENT ON COLUMN patients.address_2 IS 'Segunda línea de dirección (piso, puerta, urbanización)';
COMMENT ON COLUMN patients.postal_code IS 'Código postal';
COMMENT ON COLUMN patients.city IS 'Ciudad';
COMMENT ON COLUMN patients.province IS 'Provincia';
COMMENT ON COLUMN patients.country IS 'País';
COMMENT ON COLUMN patients.billing_same_as_contact IS 'Si true, datos de facturación = datos de contacto (se autollenan)';
COMMENT ON COLUMN patients.billing_address_2 IS 'Segunda línea de dirección fiscal';
COMMENT ON COLUMN patients.billing_province IS 'Provincia para facturación';