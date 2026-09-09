-- ============================================================
-- Migration: Create system_notifications table for NotificationBell
-- ============================================================
-- Tabla persistente para alertas del sistema que alimenta la campanita
-- (NotificationBell). Cada fila puede llevar un link a la revision
-- (ej: ficha del paciente / billing pendiente).

CREATE TABLE IF NOT EXISTS public.system_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT,
    type TEXT NOT NULL DEFAULT 'warning' CHECK (type IN ('success','info','warning')),
    read BOOLEAN NOT NULL DEFAULT false,
    link TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grants (mismo patron que grant_public_permissions)
GRANT ALL ON TABLE public.system_notifications TO anon, authenticated, service_role;
ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon and authenticated all" ON public.system_notifications;
CREATE POLICY "Allow anon and authenticated all" ON public.system_notifications FOR ALL TO public USING (true) WITH CHECK (true);