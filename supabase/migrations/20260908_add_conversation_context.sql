-- Contexto largo Musly: user_id e is_test para segmentar sesiones reales vs tests
ALTER TABLE public.ai_conversation_history ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.ai_conversation_history ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_conv_history_session ON public.ai_conversation_history (session_id, created_at DESC);

-- Índice parcial para purgar tests viejos
CREATE INDEX IF NOT EXISTS idx_conv_history_test_created ON public.ai_conversation_history (is_test, created_at) WHERE is_test = TRUE;