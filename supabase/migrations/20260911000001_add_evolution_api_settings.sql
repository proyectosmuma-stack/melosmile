-- Add Evolution API WhatsApp settings to messaging_settings
ALTER TABLE public.messaging_settings
  ADD COLUMN IF NOT EXISTS evolution_api_url text DEFAULT 'https://evolution.mumaweb.com',
  ADD COLUMN IF NOT EXISTS evolution_api_key text DEFAULT '7cb3d919a032c8ff76d8c29dd02cc1768c5a778595a3c01b',
  ADD COLUMN IF NOT EXISTS evolution_instance text DEFAULT 'melosmile';
