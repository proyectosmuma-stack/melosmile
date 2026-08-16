-- ============================================================
-- Migration: Schemas agent_memory y project_memory
-- Propósito: Config.toml expone estos esquemas en la API (PostgREST).
-- Si no existen, el schema cache de PostgREST falla con 503
-- ("schema agent_memory does not exist"). SeedBuddy/memory tooling
-- (codebase-memory) los crea en su primer arranque; esta migración
-- garantiza que existan también tras `supabase db reset`.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS agent_memory;
CREATE SCHEMA IF NOT EXISTS project_memory;

GRANT USAGE ON SCHEMA agent_memory, project_memory TO anon, authenticated, service_role;