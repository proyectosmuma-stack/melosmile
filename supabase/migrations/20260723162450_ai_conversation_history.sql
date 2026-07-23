CREATE TABLE IF NOT EXISTS public.ai_conversation_history (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id  TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  intent      TEXT,
  entities    JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversation_history_session_id ON public.ai_conversation_history (session_id, created_at);

-- Set up RLS (Row Level Security)
ALTER TABLE public.ai_conversation_history ENABLE ROW LEVEL SECURITY;

-- Allow inserts and selects for authenticated roles or service roles as needed
CREATE POLICY "Enable insert for authenticated users" ON public.ai_conversation_history FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable select for authenticated users" ON public.ai_conversation_history FOR SELECT TO authenticated USING (true);
