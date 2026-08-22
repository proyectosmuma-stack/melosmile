-- ============================================================
-- Migration: Añadir 'whatsapp' al enum reminder_channel
-- Decisión 2026-08-22 (usuario): la UI de recordatorios
-- (new-reminder-modal.tsx) ofrece WhatsApp como canal por defecto,
-- pero el enum solo tenía email | telegram | web | sms, lo que
-- provocaba un error 500 al crear reminders con ese canal.
-- ============================================================

ALTER TYPE public.reminder_channel ADD VALUE IF NOT EXISTS 'whatsapp';
