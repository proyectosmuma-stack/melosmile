-- Migration 003: Patient Tags Schema
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT 'rose',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.patient_tags (
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (patient_id, tag_id)
);

-- RLS policies
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on tags" ON public.tags FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update on tags" ON public.tags FOR ALL USING (true);

CREATE POLICY "Allow public read access on patient_tags" ON public.patient_tags FOR SELECT USING (true);
CREATE POLICY "Allow public insert/delete on patient_tags" ON public.patient_tags FOR ALL USING (true);

-- Seed initial default tags
INSERT INTO public.tags (name, color) VALUES
  ('Familiar', 'rose'),
  ('Henryschein', 'amber'),
  ('Referido', 'emerald'),
  ('VIP', 'purple'),
  ('Ortodoncia', 'blue'),
  ('Seguro', 'slate')
ON CONFLICT (name) DO NOTHING;
