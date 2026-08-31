-- Create the memory schemas required by config.toml for PostgREST
CREATE SCHEMA IF NOT EXISTS agent_memory;
CREATE SCHEMA IF NOT EXISTS project_memory;

-- Grant usage so PostgREST can access them
GRANT USAGE ON SCHEMA agent_memory TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA project_memory TO anon, authenticated, service_role;
