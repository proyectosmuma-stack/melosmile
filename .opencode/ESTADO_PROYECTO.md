# 🏥 ESTADO DEL PROYECTO MELOSMILE — 16/09/2026: MOTOR DE RECORDATORIOS JIT ANTI-BAN

> 🏁 **HITO 16/09 — Motor de copies dinámico JIT y tracking de etapas**: Se implementó un nuevo sistema dinámico de resolución de mensajes (JIT) para WhatsApp/Telegram que previene bloqueos por spam de Meta y evalúa las confirmaciones en tiempo real.

## 🔧 MEJORAS APLICADAS (Motor de Recordatorios JIT)
**Síntoma previo**: Los textos de los recordatorios (1 semana, 2 días, mismo día) se generaban y "quemaban" en base de datos al momento de programarse (ej. un mes antes). Si el paciente confirmaba su cita, el mensaje de "2 días antes" seguía diciendo "Por favor confírmala" por estar estático en BD. Además, todos los mensajes tenían emojis y eran propensos a baneos por spam al ser textos exactos repetidos cientos de veces.

**Fix aplicado**:
- **Nueva columna en BD (`reminders.stage`)**: Identifica si el mensaje es de Etapa 1 (semana), 2 (2 días) o 3 (día de cita). Migración ejecutada manualmente en producción.
- **Módulo `copies.ts`**: Lógica que autogenera textos en tiempo real. Se eliminaron TODOS los emojis y el lenguaje sesgado por género ("lo gestionamos" en vez de "juntos"). Se cuenta con variaciones múltiples (A, B, C) para evadir las políticas anti-spam de Meta.
- **Identificación de Primer Contacto**: `isFirstMessage` comprueba si el paciente ya tiene mensajes previos; de lo contrario, incluye presentación ("Hola, te escribimos de Melosmile").
- **Despachador en Tiempo Real**: El cron `dispatch.ts` ahora intercepta el mensaje justo antes de enviarlo por Evolution/MTProto, lee el `stage`, genera el *copy* fresco (comprobando si la cita ya fue confirmada para agradecerle en vez de pedirle confirmar) y reescribe la BD para auditoría.
- **Merge & Deploy**: Todo ha sido comiteado a `develop` (commit `5e4ec16`), mergeado a `main` y desplegado exitosamente en Vercel.

> ✅ **Motor Activo**: Comprobado localmente, las variaciones dinámicas operan correctamente. Citas antiguas (con `stage` null) caen en gracia y usan el mensaje viejo para no fallar (compatibilidad hacia atrás total).



## 🎯 OBJETIVO ACTUAL (resuelto)
Que Musly pueda mover TODAS las citas de un día a otra fecha/clínica en una sola llamada. Tras esto, continuar con el calendario Notion (Frente 4 Cuestionario = hoy).

### Causas raíz corregidas
1. **Dispatcher PROD** (`5xjgNTJ86tMQ09rP`): respondía su JSON (finish_reason stop) sin invocar la tool, y exigía `patient_name` antes de transferir → no delegaba en bloque.
2. **Sub-Agent Agendamiento**: solo sabía reagendar UNA cita; hacer loop list+update por cita agota `max steps`.
3. **500 en bulk**: filtro `.not(status,in,"(…,No asiste)")` rompía el query (22P02) porque el enum `appointment_status` es solo `('Pendiente','Confirmada','Realizada','Cancelada')`.

## 📁 ARCHIVOS MODIFICADOS / RELEVANTES
- `frontend/src/app/api/appointments/update/route.ts` — **bloque `bulk_reschedule`** (action=bulk_reschedule, source_date/target_date/**clinic=destino**/source_clinic, exclude Cancelada/Realizada, idempotente, conserva hora local, responde citas_movidas+errores) + **update individual por nombre de clínica**. tsc exit 0.
- Commit **`e2ac083`** (fix clinic-move) en `develop` — **pendiente de push y merge a `main`**. Living en producción vía deploy CLI directo.
- `.opencode/ESTADO_PROYECTO.md` — este documento (SSOT de sesión).
- Manifiestos alineados: `frontend/.env.vercel.production`, `frontend/.env.vercel-staging` (N8N_API_KEY=JWT + URLs reales).
- Commit(s): `4de8428`, `e6a6832` (develop) · merges `d1459f7`, `c038276` (main) — pusheados. Endpoint live en `agenda.melosmile.com` y `staging.melosmile.com`.

## 🧠 DECISIONES TOMADAS
- **Bulk endpoint** en vez de loop LLM (arquitecto P1): evita agotar iteraciones del agente.
- **n8n**: nueva tool `Tool_Bulk_Reschedule` (action fieldValue=bulk_reschedule + source_date/target_date/clinic) en Sub-Agent PROD (`d74hAW8IkmmCqoh5`, 10 nodos, cred JWT prod `yNN9yI21gnAAlo2p`) y DEV (`gfh3MvJ8NOS1tO8c`, 10 nodos, cred JWT staging `VhCVD5BRIOJvDYUd`), con regla "llamada ÚNICA, nunca listar+loop".
- **Dispatcher PROD** (activeVersionId `4449be38`): reglas "REAGENDAMIENTO EN BLOQUE" + "DELEGACIÓN OBLIGATORIA".
- **Credenciales = por DOMINIO**: mismo JWT N8N_API_KEY (sub `a8372723-…`) en staging y prod; cada app usa su SUPABASE_SERVICE_ROLE_KEY (staging `amhfdzfcmpastmlsou` / prod `xylqytpudbdcsbuuwqpi`). n8n DEV repuntado de `agenda.melosmile.com` → `staging.melosmile.com`.
- **date_range es INTENCIONAL** para búsquedas por rango (documentado en RAG) — NO eliminar.
- Citas reales **NO se tocan sin petición expresa** (el usuario hace sus pruebas).

## ⚙️ DATOS DE ENTORNO (NO CAMBIAR)
- Staging: `staging.melosmile.com` · melosmile-staging · develop · Supabase `amhfdzfcmpastmlsou` · n8n DEV `n8n.mumaweb.com`.
- Producción: `agenda.melosmile.com` · melosmile-production · main · Supabase `xylqytpudbdcsbuuwqpi` · n8n PROD `n8nv2.mumaweb.com`.
- Workspaces n8n: Dispatcher PROD `5xjgNTJ86tMQ09rP` (webhook `melosmile-dispatcher`); Sub-Agents: Scheduling `d74hAW8IkmmCqoh5`, Clinical `WNViucEUuhzigYtE`, Billing `inakl5N4ROrmmrFh`, General `T5FvJ4PMcHKp1gBa`.
- JWT prod (agenda → 200) se lee de `frontend/.env.remote` `N8N_API_KEY`; credencial n8n prod `yNN9yI21gnAAlo2p`, staging `VhCVD5BRIOJvDYUd`.
- Scripts útiles en `scratch/`: `diag-prod-api-key.ts`, `create-cred-remote.ts`, `repoint-dev-staging.ts`, `back-to-15.ts`, `verify-bulk-safe.ts`.
- Gotcha: cold-start Vercel → 1-3 primeras llamadas 500/502 ("Failed to get project config"); calentar con retries/backoff.

## 🚀 PRÓXIMOS PASOS PENDIENTES
1. **Integrar fix de clínica en git**: push `e2ac083` a `develop` y merge a `main` (hoy el fix vive en prod solo por deploy CLI; un push futuro de `main` sin el commit lo revierte).
2. **No tocar citas** (22/09 ya 6/6 en Goya; la de 19:00 es de Emma Mora Antunes PAC-032, reasignada de Emma Villanueva hoy). Musly ya las puede mover entre clínicas.
3. **Musly NO puede cambiar el paciente de una cita** (endpoint update no admite `patient_id`). Anotado en Notion (tarea `3dbb6518-…d66083de5c04`, En espera, NO prioritaria) y en RAG. Futuro: resolver `patient_name→patient_id` y `updates.patient_id` en la rama update + regla n8n.
4. **Blindaje estructural del Dispatcher** (P2 del arquitecto, NO aplicado): "Return Intermediate Steps" en `Dispatcher_AI_Agent` + nodo IF/Code para rechazar el JSON final sin tool call real. Requiere validación CTO.
5. **Resolver reporte** en `ai_agent_reports`: `node scripts/sync_reports.js --resolve 4584a59b-940b-42e0-9bf2-dd9c0639cc24 --notes "Fix JWT prod + reagendamiento en bloque + cambio de clínica"`.
6. **Calendario Notion**: Frente 4 Cuestionario de primera visita (tabla `patient_intake_forms`, link público `/intake/[token]` 48h, webhook n8n). Luego Telegram, Contexto largo Musly.
7. **Subagentes locales** (env-writer/coder-local) pueden estar caídos (Ollama MBP 2012 cold-start) → fallback determinista con scripts locales sin exponer secretos.
8. Mantenimiento RAG: embeddings pendientes por cold-start (lecciones ya insertadas texto).
9. ~~**Configuración de credenciales de producción de Odoo**: Cargar y verificar las variables de producción (`ODOO_URL`, `ODOO_DB`, `ODOO_USER`, `ODOO_PASSWORD`/`ODOO_API_KEY`) en el proyecto Vercel `melosmile-production` para emisión real y sincronización contable/facturación.~~ (Realizado: guardado en `.env.vercel.production` y Vercel).


## 📦 HISTÓRICO CLAVE (resumen)
- 15/09: Auditoría y corrección integral del sistema de recordatorios de citas WhatsApp:
  - Implementado cron Vercel `/api/cron/process-reminders` (cada 15 min) y bypass en middleware.
  - Aislamiento de entornos con failsafe `melosmile-dev` para evitar envíos cruzados a pacientes reales desde localhost/staging. Instancia creada en Evolution Manager.
  - Corrección de timezone `Europe/Madrid` en `cadence.ts` y actualización de los 12 recordatorios pendientes en Supabase Producción para coincidir exactamente con la hora clínica local.
  - Desplegado a `develop` y `main` (Vercel Producción).
- 14/09 tarde: bugfix 401 Musly N8N (JWT prod vs fallback) + reagendamiento en bloque + auditoría credenciales/entornos. RAG actualizado (5 lecciones nuevas + save-session).
- 11/09: Catálogo Tratamientos 2026 (53 activos), branding MeloSmile Purple `#85348c`, deploy develop/main + Notion.
- 10/09: Bugfix messaging_settings (PUT vs POST, `...data.data`, whitelist ALLOWED_COLUMNS).