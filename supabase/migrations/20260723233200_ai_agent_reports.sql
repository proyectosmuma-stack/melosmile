-- Migration: ai_agent_reports table
CREATE TABLE IF NOT EXISTS public.ai_agent_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT,
    user_comment TEXT NOT NULL,
    participating_agents JSONB,
    conversation_history JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_agent_reports ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public insert to ai_agent_reports') THEN
        CREATE POLICY "Allow public insert to ai_agent_reports" ON public.ai_agent_reports FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public select on ai_agent_reports') THEN
        CREATE POLICY "Allow public select on ai_agent_reports" ON public.ai_agent_reports FOR SELECT USING (true);
    END IF;
END $$;
