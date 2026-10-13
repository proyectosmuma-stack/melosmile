-- Migration: Set address for the Getafe clinic
-- Clinic: "Clinica Montaño - Getafe" (id fdde3ff7-06ce-49d4-b108-804d99bfa46a)
-- Source: public register data (Centro Odontológico Montaño / Centro Europeo Médico Dental Montaño y Seijas SL, CIF B87461224)
UPDATE public.clinics
SET address = 'C/ Hospital de San José 41, Getafe, Madrid',
    updated_at = now()
WHERE name = 'Clinica Montaño - Getafe'
  AND (address IS NULL OR address = '');