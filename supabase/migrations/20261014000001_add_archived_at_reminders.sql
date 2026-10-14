-- 20261014000001_add_archived_at_reminders.sql
-- Auto-archivado (soft-delete) de recordatorios.
-- Se marca `archived_at` una vez transcurrida la cita del paciente (+ periodo de gracia).
-- Los recordatorios archivados NO se envían, no generan alertas y no aparecen en los listados.
-- Estrategia aprobada por el CTO: soft-archive (conserva historial clínico / auditoría / LOPD).

ALTER TABLE reminders ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

-- Índice parcial: acelera el filtro "solo activos" (archived_at IS NULL),
-- que es el caso de uso del scheduler, las alertas y los listados.
CREATE INDEX IF NOT EXISTS idx_reminders_active
  ON reminders(archived_at)
  WHERE archived_at IS NULL;
