ALTER TABLE reminders ADD COLUMN IF NOT EXISTS stage SMALLINT;
COMMENT ON COLUMN reminders.stage IS '1 = 1 semana antes, 2 = 2 días antes, 3 = día de la cita';

CREATE INDEX IF NOT EXISTS idx_reminders_due_dispatch 
ON reminders (status, scheduled_at) 
WHERE status = 'pendiente';
