-- ============================================================
-- Migration 005: Treatment Families, Clinic Commission Rules,
--                Seed Data for Clinics / Professionals / Treatments
-- ============================================================

-- ───────────────────────────────────────────────
-- 1. Extend clinics table with contact info + commission config
-- ───────────────────────────────────────────────
ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS color_hex VARCHAR(20) DEFAULT '#10b981',
  ADD COLUMN IF NOT EXISTS base_commission_pct NUMERIC(5,2) DEFAULT 40.00,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ───────────────────────────────────────────────
-- 2. Treatment families
-- ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS treatment_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  color_hex VARCHAR(20) DEFAULT '#6366f1',
  icon VARCHAR(50) DEFAULT 'stethoscope',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ───────────────────────────────────────────────
-- 3. Extend treatments table with family and lab cost
-- ───────────────────────────────────────────────
ALTER TABLE treatments
  ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES treatment_families(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS abbreviation VARCHAR(50),
  ADD COLUMN IF NOT EXISTS typical_lab_cost NUMERIC(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS odoo_product_ref VARCHAR(100),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ───────────────────────────────────────────────
-- 4. Clinic commission rules per treatment family
-- ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clinic_commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  family_id UUID REFERENCES treatment_families(id) ON DELETE CASCADE NOT NULL,
  commission_pct NUMERIC(5,2) NOT NULL DEFAULT 40.00,  -- % to professional
  lab_discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00,  -- % lab cost deducted from professional net
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (clinic_id, family_id)
);

-- ───────────────────────────────────────────────
-- 5. Extend billing_records with profitability tracking
-- ───────────────────────────────────────────────
ALTER TABLE billing_records
  ADD COLUMN IF NOT EXISTS actual_lab_cost NUMERIC(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS profitability_status VARCHAR(20) DEFAULT 'ok'; -- ok | warning | loss

-- ───────────────────────────────────────────────
-- 6. RLS Policies
-- ───────────────────────────────────────────────
ALTER TABLE treatment_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_commission_rules ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['treatment_families','clinic_commission_rules'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow all authenticated" ON %I', tbl);
    EXECUTE format('CREATE POLICY "Allow all authenticated" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow anon read" ON %I', tbl);
    EXECUTE format('CREATE POLICY "Allow anon read" ON %I FOR SELECT TO anon USING (true)', tbl);
  END LOOP;
END $$;

-- ───────────────────────────────────────────────
-- 7. Seed: Treatment Families
-- ───────────────────────────────────────────────
INSERT INTO treatment_families (name, description, color_hex, icon, sort_order) VALUES
  ('Odontología General',   'Revisiones, obturaciones, extracciones y tartrectomías',         '#10b981', 'stethoscope',  1),
  ('Ortodoncia',            'Brackets metálicos, cerámicos, alineadores e invisalign',         '#6366f1', 'smile',        2),
  ('Endodoncia',            'Tratamientos de conductos uni, bi y multirradiculares',           '#f59e0b', 'zap',          3),
  ('Periodoncia',           'Tartrectomía profunda, RAR, curetajes y cirugía periodontal',     '#14b8a6', 'activity',     4),
  ('Implantología',         'Implantes dentales, coronas sobre implante e injertos óseos',    '#3b82f6', 'anchor',       5),
  ('Estética Dental',       'Carillas cerámicas, blanqueamiento y diseño de sonrisa',          '#ec4899', 'sparkles',     6),
  ('Prostodoncia',          'Prótesis fija, removible, coronas metal-porcelana y puentes',    '#8b5cf6', 'grid',         7),
  ('Aparatología',          'Retenedores, placas de descarga y aparatos funcionales',          '#f97316', 'tool',         8),
  ('Odontopediatría',       'Sellados de fosas, fluorización y coronas pediátricas',          '#06b6d4', 'heart',        9),
  ('Radiología y Diagnóstico', 'Radiografías panorámicas, periapicales y CBCT',              '#64748b', 'camera',      10)
ON CONFLICT (name) DO NOTHING;

-- ───────────────────────────────────────────────
-- 8. Seed: Clinics (Goya, Las Rozas, RyA)
-- ───────────────────────────────────────────────
INSERT INTO clinics (name, address, phone, email, color_hex, base_commission_pct) VALUES
  ('Clínica Goya',      'Calle de Goya, Madrid',          '+34 91 000 0001', 'goya@melosmile.com',    '#3b82f6', 40.00),
  ('Clínica Las Rozas', 'Av. de las Rozas, Las Rozas',    '+34 91 000 0002', 'rozas@melosmile.com',   '#8b5cf6', 40.00),
  ('Clínica RyA',       'Calle Real y Azul, Madrid',      '+34 91 000 0003', 'rya@melosmile.com',     '#10b981', 40.00)
ON CONFLICT DO NOTHING;

-- ───────────────────────────────────────────────
-- 9. Seed: Professionals
-- ───────────────────────────────────────────────
-- Note: clinic_id set NULL for multi-clinic professionals; can be updated via UI
INSERT INTO professionals (first_name, last_name, specialty, base_commission_percentage) VALUES
  ('Osly',    'Melo',      'Ortodoncia',           40.00),
  ('Norelys', 'Bermúdez',  'Odontología General',  21.00),
  ('Shirley', 'García',    'Odontología General',  36.00),
  ('Asencio', 'López',     'Endodoncia',           40.00)
ON CONFLICT DO NOTHING;

-- ───────────────────────────────────────────────
-- 10. Seed: Treatments (from Excel data + Odoo catalog)
-- ───────────────────────────────────────────────
DO $$
DECLARE
  fam_general   UUID;
  fam_ortod     UUID;
  fam_endo      UUID;
  fam_perio     UUID;
  fam_implant   UUID;
  fam_estetica  UUID;
  fam_prosto    UUID;
  fam_aparato   UUID;
  fam_pedi      UUID;
  fam_radio     UUID;
BEGIN
  SELECT id INTO fam_general  FROM treatment_families WHERE name = 'Odontología General';
  SELECT id INTO fam_ortod    FROM treatment_families WHERE name = 'Ortodoncia';
  SELECT id INTO fam_endo     FROM treatment_families WHERE name = 'Endodoncia';
  SELECT id INTO fam_perio    FROM treatment_families WHERE name = 'Periodoncia';
  SELECT id INTO fam_implant  FROM treatment_families WHERE name = 'Implantología';
  SELECT id INTO fam_estetica FROM treatment_families WHERE name = 'Estética Dental';
  SELECT id INTO fam_prosto   FROM treatment_families WHERE name = 'Prostodoncia';
  SELECT id INTO fam_aparato  FROM treatment_families WHERE name = 'Aparatología';
  SELECT id INTO fam_pedi     FROM treatment_families WHERE name = 'Odontopediatría';
  SELECT id INTO fam_radio    FROM treatment_families WHERE name = 'Radiología y Diagnóstico';

  INSERT INTO treatments (service_name, abbreviation, service_type, default_price, lab_cost, typical_lab_cost, family_id) VALUES
    -- Odontología General
    ('Primera Visita / Valoración',       '1RA VISITA',   'Consulta',       0.00,    0.00,   0.00,  fam_general),
    ('Control y Revisión',                'CONTROL',      'Consulta',       30.00,   0.00,   0.00,  fam_general),
    ('Revisión Rutinaria',                'REC',          'Consulta',       60.00,   0.00,   0.00,  fam_general),
    ('Obturación Simple',                 'OBT SIM',      'Restauración',   35.00,   0.00,   0.00,  fam_general),
    ('Obturación Compuesta',              'OBT COMP',     'Restauración',   62.00,   0.00,   0.00,  fam_general),
    ('Extracción Simple',                 'EXTRAC',       'Cirugía',        40.00,   0.00,   0.00,  fam_general),
    ('Extracción Quirúrgica',             'EXTRAC QX',    'Cirugía',        80.00,   0.00,   0.00,  fam_general),
    ('Tartrectomía / Limpieza Dental',    'TARTEC',       'Higiene',        60.00,   0.00,   0.00,  fam_general),
    ('Urgencia Dental',                   'URGENCIA',     'Urgencias',      40.00,   0.00,   0.00,  fam_general),

    -- Ortodoncia
    ('Ortodoncia Brackets Metálicos',     'ORTOD MET',    'Ortodoncia',    1500.00, 300.00, 350.00, fam_ortod),
    ('Ortodoncia Brackets Cerámicos',     'ORTOD CER',    'Ortodoncia',    1800.00, 400.00, 450.00, fam_ortod),
    ('Ortodoncia Invisible / Alineadores','ORTOD ALIN',   'Ortodoncia',    2500.00, 600.00, 700.00, fam_ortod),
    ('Control de Ortodoncia',             'CTRL ORTOD',   'Ortodoncia',     60.00,   0.00,   0.00,  fam_ortod),
    ('Revisión de Ortodoncia',            'REV ORTOD',    'Ortodoncia',     60.00,   0.00,   0.00,  fam_ortod),
    ('Cambio de Arcos',                   'ARCOS',        'Ortodoncia',     40.00,   0.00,   0.00,  fam_ortod),

    -- Endodoncia
    ('Endodoncia Unirradicular',          'ENDO UNIR',    'Endodoncia',    180.00,  60.00,  70.00,  fam_endo),
    ('Endodoncia Birradicular',           'ENDO BIRAD',   'Endodoncia',    220.00,  70.00,  80.00,  fam_endo),
    ('Endodoncia Multirradicular',        'ENDO MULTI',   'Endodoncia',    280.00,  90.00, 100.00,  fam_endo),
    ('Retratamiento de Conducto',         'RETRAT COND',  'Endodoncia',    300.00, 100.00, 110.00,  fam_endo),

    -- Periodoncia
    ('Periodoncia Básica',                'PERIO BAS',    'Periodoncia',   120.00,   0.00,   0.00,  fam_perio),
    ('RAR / Raspado y Alisado Radicular', 'RAR',          'Periodoncia',   150.00,   0.00,   0.00,  fam_perio),
    ('Curetaje Periodontal',              'CURET',        'Periodoncia',   100.00,   0.00,   0.00,  fam_perio),
    ('Cirugía Periodontal',               'CIR PERIO',    'Periodoncia',   350.00,   0.00,   0.00,  fam_perio),

    -- Implantología
    ('Implante Dental',                   'IMPLANTE',     'Implantología', 900.00, 300.00, 320.00,  fam_implant),
    ('Corona sobre Implante',             'CORONA IMP',   'Implantología', 700.00, 400.00, 420.00,  fam_implant),
    ('Injerto Óseo',                      'INJERTO',      'Implantología', 500.00, 200.00, 210.00,  fam_implant),
    ('Elevación de Seno',                 'SENO',         'Implantología', 600.00, 150.00, 160.00,  fam_implant),

    -- Estética
    ('Carilla Cerámica',                  'CARILLA CER',  'Estética',      600.00, 250.00, 270.00,  fam_estetica),
    ('Blanqueamiento Dental',             'BLANQ',        'Estética',      200.00,  50.00,  55.00,  fam_estetica),
    ('Diseño de Sonrisa',                 'DIS SONRISA',  'Estética',      300.00,   0.00,   0.00,  fam_estetica),
    ('Composite Estético',                'COMP EST',     'Estética',      120.00,   0.00,   0.00,  fam_estetica),

    -- Prostodoncia
    ('Corona Metal-Porcelana',            'CORONA MET',   'Prostodoncia',  450.00, 200.00, 220.00,  fam_prosto),
    ('Corona Zirconio',                   'CORONA ZIRC',  'Prostodoncia',  600.00, 280.00, 300.00,  fam_prosto),
    ('Prótesis Removible Completa',       'PROT COMP',    'Prostodoncia',  800.00, 350.00, 380.00,  fam_prosto),
    ('Prótesis Removible Parcial',        'PROT PARC',    'Prostodoncia',  500.00, 200.00, 220.00,  fam_prosto),
    ('Puente Dental',                     'PUENTE',       'Prostodoncia',  900.00, 400.00, 430.00,  fam_prosto),
    ('Incrustación / Inlay-Onlay',        'INLAY',        'Prostodoncia',  350.00, 150.00, 160.00,  fam_prosto),

    -- Aparatología
    ('Retenedor Fijo',                    'RETEN FIJO',   'Aparatología',  100.00,  40.00,  45.00,  fam_aparato),
    ('Retenedor Removible',               'RETEN REM',    'Aparatología',  120.00,  50.00,  55.00,  fam_aparato),
    ('Placa de Descarga',                 'PLACA DESC',   'Aparatología',  180.00,  80.00,  90.00,  fam_aparato),
    ('Aparato Funcional',                 'APART FUNC',   'Aparatología',  350.00, 150.00, 160.00,  fam_aparato),

    -- Odontopediatría
    ('Sellado de Fosas y Fisuras',        'SELLADO',      'Pediátrica',     40.00,   0.00,   0.00,  fam_pedi),
    ('Fluorización',                      'FLUOR',        'Pediátrica',     25.00,   0.00,   0.00,  fam_pedi),
    ('Corona Pediátrica (Acero)',         'CORONA PED',   'Pediátrica',    100.00,  40.00,  45.00,  fam_pedi),
    ('Pulpotomía',                        'PULPOT',       'Pediátrica',    120.00,   0.00,   0.00,  fam_pedi),

    -- Radiología
    ('Ortopantomografía / Panorámica',    'PANOR',        'Radiología',     50.00,   0.00,   0.00,  fam_radio),
    ('Radiografía Periapical',            'PERIAP',       'Radiología',     15.00,   0.00,   0.00,  fam_radio),
    ('CBCT / TAC Dental',                 'CBCT',         'Radiología',    180.00,   0.00,   0.00,  fam_radio)
  ON CONFLICT DO NOTHING;
END $$;
