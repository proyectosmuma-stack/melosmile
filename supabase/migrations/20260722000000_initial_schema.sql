-- Migration file created from supabase_schema.sql

-- 1. Clínicas
CREATE TABLE IF NOT EXISTS clinics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    lab_expense_discount_percentage NUMERIC(5, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Profesionales
CREATE TABLE IF NOT EXISTS professionals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    specialty VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(255),
    base_commission_percentage NUMERIC(5, 2) DEFAULT 0.00,
    clinic_id UUID REFERENCES clinics(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tratamientos y Precios
CREATE TABLE IF NOT EXISTS treatments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(255) NOT NULL,
    service_type VARCHAR(100),
    default_price NUMERIC(10, 2) DEFAULT 0.00,
    lab_cost NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Pacientes
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    historia_id VARCHAR(50) UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    dni_nie VARCHAR(50),
    dob DATE,
    gender VARCHAR(20),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    in_treatment BOOLEAN DEFAULT FALSE,
    important_diseases TEXT,
    previous_operations TEXT,
    allergies TEXT,
    current_medication TEXT,
    treatment_plan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Citas (Agenda)
DO $$ BEGIN
    CREATE TYPE appointment_status AS ENUM ('Pendiente', 'Confirmada', 'Realizada', 'Cancelada');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) NOT NULL,
    professional_id UUID REFERENCES professionals(id) NOT NULL,
    clinic_id UUID REFERENCES clinics(id) NOT NULL,
    treatment_id UUID REFERENCES treatments(id),
    appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    reason VARCHAR(255),
    status appointment_status DEFAULT 'Pendiente',
    notes TEXT,
    ai_raw_input TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Facturación / Cálculos Mensuales
DO $$ BEGIN
    CREATE TYPE billing_status AS ENUM ('Pendiente', 'Aprobado', 'Facturado Odoo');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS billing_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id) UNIQUE NOT NULL,
    custom_price NUMERIC(10, 2),
    applied_commission_rate NUMERIC(5, 2),
    applied_lab_discount_rate NUMERIC(5, 2),
    calculated_total NUMERIC(10, 2),
    billing_month DATE NOT NULL,
    status billing_status DEFAULT 'Pendiente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
