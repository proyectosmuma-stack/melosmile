-- Vector embeddings para RAG clínico (melosmile-knowledge-processor)
-- Modelo: Google gemini-embedding-001 (dimensión 3072)

CREATE EXTENSION IF NOT EXISTS vector;

DROP TABLE IF EXISTS public.document_embeddings CASCADE;

CREATE TABLE public.document_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid,
  patient_id uuid,
  chunk_index integer,
  chunk_text text,
  embedding vector(3072),
  created_at timestamptz DEFAULT now()
);
