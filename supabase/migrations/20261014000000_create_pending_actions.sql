-- Acciones propuestas por Musly que requieren confirmación explícita del doctor
-- antes de ejecutarse (emitir factura, crear/reagendar/cancelar cita, recordatorios).
-- El `confirm` se resuelve en el backend de forma determinista (sin LLM).
create table if not exists public.pending_actions (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  action_type text not null check (action_type in ('emitir_factura','crear_cita','reagendar_cita','cancelar_cita','programar_recordatorios')),
  patient_id uuid references public.patients(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled','expired','executed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  result jsonb
);

create index if not exists pending_actions_session_idx on public.pending_actions (session_id, status);

-- RLS: solo el service_role (rutas de servidor) puede leer/escribir.
-- El acceso HTTP se protege además en middleware.ts (sesión o x-api-key).
alter table public.pending_actions enable row level security;
