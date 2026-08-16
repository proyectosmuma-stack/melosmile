-- ============================================================
-- Tabla: agent_learnings
-- Propósito: Base de conocimiento vectorial del agente Musly.
-- Almacena vocabulario clínico, abreviaturas, reglas de negocio
-- y aprendizajes técnicos derivados de sesiones de trabajo.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.agent_learnings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expression    TEXT NOT NULL UNIQUE,
  meaning       TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'vocabulary',
  notes         TEXT,
  usage_count   INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para búsqueda rápida por categoría
CREATE INDEX IF NOT EXISTS idx_agent_learnings_category ON public.agent_learnings (category);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_agent_learnings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agent_learnings_updated_at ON public.agent_learnings;
CREATE TRIGGER trg_agent_learnings_updated_at
  BEFORE UPDATE ON public.agent_learnings
  FOR EACH ROW EXECUTE FUNCTION update_agent_learnings_updated_at();

-- Permisos RLS abiertos (coherente con resto del esquema local)
ALTER TABLE public.agent_learnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon and authenticated all on agent_learnings" ON public.agent_learnings;
CREATE POLICY "Allow anon and authenticated all on agent_learnings"
  ON public.agent_learnings
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

GRANT ALL ON public.agent_learnings TO anon, authenticated, service_role;

-- Semilla inicial de reglas y aprendizajes técnicos de arquitectura
INSERT INTO public.agent_learnings (expression, meaning, category, notes, usage_count) VALUES 
('supabase cliente en api routes servidor', 'Las API routes de Next.js (server-side) SIEMPRE deben usar supabaseAdmin de @/lib/supabase/server (service_role key, bypassea RLS). NUNCA el cliente anon de @/lib/supabase/client en route handlers. El cliente anon solo es válido en componentes React client-side.', 'architecture', 'Rutas corregidas 2026-08-15: appointments/create, reminders/create, reminders/send-now, patients/create, ai/memory/learn, ai-context, appointments/update. Todos corregidos a supabaseAdmin.', 2),
('hardcodear supabase keys en codigo fuente', 'NUNCA hardcodear SERVICE_ROLE_KEY, ANON_KEY ni URLs de Supabase directamente en archivos .ts. Siempre usar process.env.VARIABLE. Detectado en ai-context/route.ts con fallback hardcoded. Riesgo de exposición de credenciales en git.', 'security', 'Corregido en ai-context/route.ts 2026-08-15.', 2),
('getnexthistoriaid duplicado y race condition', 'La lógica para generar el siguiente ID PAC-XXX está duplicada en 4 rutas. Centralizar en lib/utils/patient-id.ts con query ORDER BY historia_id DESC LIMIT 1.', 'bug', 'Refactor completado 2026-08-15. Función getNextHistoriaId centralizada usando ORDER BY LIMIT 1 en todas las rutas afectadas.', 2),
('delete insert no atomico billing session lines', 'En /api/billing/sessions/generate el patrón DELETE + INSERT en billing_session_lines no es atómico. Si el INSERT falla la sesión queda vacía. Usar upsert con onConflict o función RPC de Supabase.', 'bug', 'Refactor completado 2026-08-15. Implementado .upsert() con onConflict para atomicidad.', 2),
('filtrar paciente en memoria despues de fetch', 'En /api/appointments/list el filtro por nombre de paciente se aplica en JS tras traer todos los registros del día. Ineficiente con muchas citas. Filtrar en query Supabase con join .or() sobre patients.first_name.ilike y patients.last_name.ilike.', 'performance', 'Optimización completada 2026-08-15. Filtro movido a la query Supabase con .or().', 2),
('parseappointmentdate duplicado en multiples routes', 'La función parseAppointmentDate existe con variantes divergentes. Extraer a lib/utils/date-parser.ts como función compartida.', 'architecture', 'Refactor completado 2026-08-15. Centralizado en lib/utils/date-parser.ts y eliminado código duplicado.', 2),
('todas las urls deben ser dinamicas y configurables desde bd o env', 'REGLA DE ARQUITECTURA: Todas las URLs del sistema (webhooks n8n, endpoints de IA, URLs de Supabase, URLs de Odoo, almacenamiento/FTP, servicios externos) deben parametrizarse mediante variables de entorno (@/config/env.ts) o tablas de configuración dinámica en la base de datos (system_settings/config). NUNCA hardcodear URLs fijas en archivos de rutas o componentes individuales para permitir el cambio dinámico entre entornos sin modificar archivo por archivo.', 'architecture', 'Regla estricta aplicada.', 2)
ON CONFLICT (expression) 
DO UPDATE SET 
  meaning = EXCLUDED.meaning, 
  notes = EXCLUDED.notes, 
  usage_count = EXCLUDED.usage_count, 
  updated_at = now();

