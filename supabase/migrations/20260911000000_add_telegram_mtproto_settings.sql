-- Add Telegram MTProto credentials to messaging_settings
ALTER TABLE public.messaging_settings
  ADD COLUMN IF NOT EXISTS telegram_api_id text,
  ADD COLUMN IF NOT EXISTS telegram_api_hash text,
  ADD COLUMN IF NOT EXISTS telegram_session_string text;
