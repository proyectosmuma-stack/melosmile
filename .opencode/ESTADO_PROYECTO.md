# 🏥 ESTADO DEL PROYECTO MELOSMILE — 14/09/2026: MUSLY CAMBIA DE CLÍNICA CONFIRMADO E2E

> 🏁 **HITO 14/09 2ª parte — Musly ya cambia citas de clínica**: fix desplegado en producción (`agenda.melosmile.com`) y **verificado de punta a punta**: revertí las 4 citas del 22/09 a Daniel Bustamante, Musly (por su flujo real n8n) las movió a Goya con `bulk_reschedule(source_date=22, target_date=22, clinic=Goya)`, y la DB de producción lo confirma (6/6 en Goya). Ejecución n8n PROD `4919` (d74hAW8IkmmCqoh5) muestra la tool llamada con su payload.

## 🔧 BUG CORREGIDO (incidente Musly "confirma éxito sin persistir")
**Síntoma**: Musly decía "Todas las citas han sido modificadas exitosamente" pero la clínica no cambiaba en producción.
**Causa raíz** (en `frontend/src/app/api/appointments/update/route.ts`):
1. `bulk_reschedule` solo actualizaba `appointment_date`; `clinic` era filtro del día origen → imposible mover de clínica.
2. `bulk_reschedule` con `source_date == target_date` devolvía 400 (bloqueaba "mover a Goya en el mismo día").
3. Rama de update ignoraba el parámetro `clinic` (nombre): solo aceptaba `clinic_id` UUID → confirmaba éxito sin tocar la clínica.
**Fix aplicado (commit `e2ac083`, develop, NO pusheado)**:
- `bulk_reschedule`: `clinic` = clínica **destino** (escribe `clinic_id`), permite misma fecha con cambio de clínica, añade `source_clinic` para filtrar origen, salta citas ya en destino.
- Update individual: resuelve `clinic` por nombre → `clinic_id`.
- n8n PROD `d74hAW8IkmmCqoh5` `Tool_Bulk_Reschedule`: descripción actualizada (clínica destino + misma fecha) y campo `source_clinic` añadido.
- **Desplegado** directamente a Vercel `melosmile-production` (alias `agenda.melosmile.com`) desde copia limpia de `develop` (sin arrastrar otros cambios del working tree).
- Verificación: smoke test (nuevo mensaje 400) + bulk real + confirmación en DB producción + ejecución n8n `4919`.

> ✅ **Musly reagenda en bloque y cambia de clínica**: verificado E2E real contra Supabase producción (22/09: las 6 citas quedaron en Goya).

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
9. **Configuración de credenciales de producción de Odoo**: Cargar y verificar las variables de producción (`ODOO_URL`, `ODOO_DB`, `ODOO_USER`, `ODOO_PASSWORD`/`ODOO_API_KEY`) en el proyecto Vercel `melosmile-production` para emisión real y sincronización contable/facturación.


## 📦 HISTÓRICO CLAVE (resumen)
- 14/09 tarde: bugfix 401 Musly N8N (JWT prod vs fallback) + reagendamiento en bloque + auditoría credenciales/entornos. RAG actualizado (5 lecciones nuevas + save-session).
- 11/09: Catálogo Tratamientos 2026 (53 activos), branding MeloSmile Purple `#85348c`, deploy develop/main + Notion.
- 10/09: Bugfix messaging_settings (PUT vs POST, `...data.data`, whitelist ALLOWED_COLUMNS).