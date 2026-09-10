
-- Create messaging_settings table
CREATE TABLE IF NOT EXISTS public.messaging_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  whatsapp_enabled boolean DEFAULT false,
  whatsapp_phone text,
  whatsapp_api_token text,
  whatsapp_template_name text,
  telegram_enabled boolean DEFAULT false,
  telegram_bot_token text,
  email_enabled boolean DEFAULT false,
  smtp_host text,
  smtp_port integer DEFAULT 587,
  smtp_user text,
  smtp_password text,
  smtp_secure boolean DEFAULT false,
  email_from text,
  email_from_name text,
  updated_at timestamptz DEFAULT now()
);

-- Add telegram_chat_id to patients table
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS telegram_chat_id text;

-- Insert singleton row if it doesn't exist
INSERT INTO public.messaging_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;
