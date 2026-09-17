-- Migration: Create app_users table for database-driven authentication
CREATE TABLE IF NOT EXISTS public.app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name VARCHAR(150) NOT NULL,
    role VARCHAR(50) DEFAULT 'Administrador',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access, block public access
DO $$
BEGIN
    DROP POLICY IF EXISTS "Service role full access on app_users" ON public.app_users;
    CREATE POLICY "Service role full access on app_users" 
        ON public.app_users 
        FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
END $$;

-- Seed initial user Oslysmile
INSERT INTO public.app_users (username, password_hash, name, role, is_active)
VALUES (
    'Oslysmile',
    '$2b$10$8Om79kfsAUMLXYfpGCYOtOBZL6mCPf66KVC29izDBDXIiPFPU7IGW',
    'Dra. Osly Melo',
    'Administrador',
    TRUE
)
ON CONFLICT (username) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();
