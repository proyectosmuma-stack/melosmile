-- Migration: Grant Schema & Table privileges to anon and authenticated roles
-- This ensures local Supabase development environment can query all tables via PostgREST / anon key

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- Ensure permissive RLS policies for all tables in development
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "Allow anon and authenticated all" ON public.%I;', r.tablename);
        EXECUTE format('CREATE POLICY "Allow anon and authenticated all" ON public.%I FOR ALL TO public USING (true) WITH CHECK (true);', r.tablename);
    END LOOP;
END $$;
