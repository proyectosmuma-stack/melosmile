-- migration: 20260815000000_init_agent_memory.sql
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- ========================================================
-- SCHEMA: agent_memory
-- ========================================================
CREATE SCHEMA IF NOT EXISTS agent_memory;

CREATE TABLE IF NOT EXISTS agent_memory.agent_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id text NOT NULL,
    session_id text NOT NULL,
    summary text NOT NULL,
    embedding vector(768),
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz DEFAULT (now() + interval '90 days')
);
CREATE INDEX IF NOT EXISTS agent_sessions_agent_id_idx ON agent_memory.agent_sessions(agent_id);
-- Ollama nomic-embed-text generates 768-dimensional embeddings by default
CREATE INDEX IF NOT EXISTS agent_sessions_embedding_idx ON agent_memory.agent_sessions USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS agent_memory.agent_lessons (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id text NOT NULL,
    lesson text NOT NULL,
    category text DEFAULT 'general',
    importance integer DEFAULT 5,
    embedding vector(768),
    created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agent_lessons_agent_id_idx ON agent_memory.agent_lessons(agent_id);
CREATE INDEX IF NOT EXISTS agent_lessons_embedding_idx ON agent_memory.agent_lessons USING hnsw (embedding vector_cosine_ops);

CREATE OR REPLACE FUNCTION agent_memory.search_sessions (
  query_embedding vector(768),
  p_agent_id text,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  session_id text,
  summary text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    session_id,
    summary,
    1 - (embedding <=> query_embedding) AS similarity
  FROM agent_memory.agent_sessions
  WHERE agent_id = p_agent_id
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;


-- ========================================================
-- SCHEMA: project_memory
-- ========================================================
CREATE SCHEMA IF NOT EXISTS project_memory;

CREATE TABLE IF NOT EXISTS project_memory.project_contexts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id text NOT NULL,
    project_path text,
    file_path text,
    content text NOT NULL,
    chunk_index integer DEFAULT 0,
    embedding vector(768),
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz DEFAULT (now() + interval '60 days')
);
CREATE INDEX IF NOT EXISTS project_contexts_project_id_idx ON project_memory.project_contexts(project_id);
CREATE INDEX IF NOT EXISTS project_contexts_embedding_idx ON project_memory.project_contexts USING hnsw (embedding vector_cosine_ops);


CREATE TABLE IF NOT EXISTS project_memory.project_decisions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id text NOT NULL,
    session_id text,
    decision text NOT NULL,
    rationale text,
    embedding vector(768),
    created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_decisions_project_id_idx ON project_memory.project_decisions(project_id);
CREATE INDEX IF NOT EXISTS project_decisions_embedding_idx ON project_memory.project_decisions USING hnsw (embedding vector_cosine_ops);


CREATE OR REPLACE FUNCTION project_memory.search_context (
  query_embedding vector(768),
  p_project_id text,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  file_path text,
  content text,
  chunk_index integer,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    file_path,
    content,
    chunk_index,
    1 - (embedding <=> query_embedding) AS similarity
  FROM project_memory.project_contexts
  WHERE project_id = p_project_id
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Permisos
GRANT USAGE ON SCHEMA agent_memory TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA agent_memory TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA project_memory TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA project_memory TO anon, authenticated, service_role;
