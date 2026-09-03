-- Fix: gemini-embedding-001 genera 3072 dimensiones (no 768).
-- Recrear tabla con la dimensión correcta.

ALTER TABLE public.document_embeddings DROP COLUMN IF EXISTS embedding;
ALTER TABLE public.document_embeddings ADD COLUMN embedding vector(3072);
