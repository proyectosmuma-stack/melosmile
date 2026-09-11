# 🏥 ESTADO DEL PROYECTO MELOSMILE — SESIÓN 11/09/2026: CATÁLOGO 2026 + BRANDING + DEPLOY

## 🎯 OBJETIVO ACTUAL
**Sesión 11/09/2026:**
1. **Catálogo de Tratamientos 2026**: Integrar y consolidar los 53 tratamientos activos en 10 familias clínicas según la documentación oficial 2026 (NAS: `/Volumes/mumaec.synology.me/.../documentos`). Mantener 41 tratamientos legacy desactivados (`is_active=false`). Migración ejecutada con éxito en BD Local y Cloud.
2. **Identidad Visual Corporativa (Branding)**:
   - Color corporativo MeloSmile Purple `#85348c` fijado como `--primary` en `globals.css`.
   - Extracción de logotipos oficiales en SVG desde NAS (`logo-color.svg`, `full-logo-color.svg`, `logo-mono.svg`, `full-logo-mono.svg`) e integración en `/public/brand/`.
   - Reemplazo de logos e isotipos en Login (`/login`), Sidebar (`sidebar.tsx`) y Confirmación de Cita (`/c/[token]`).
3. **Despliegue y Git**:
   - Commits `c03e6eb` y `4b8ccdb` en `develop` pusheados a `origin/develop`.
   - Merge `5fc431d` y `2700c12` en `main` pusheados a `origin/main` (producción Vercel).
4. **Notion**: Tareas `Deploy a producción` (`3d7b6518-1657-8190-88cd-d604a8e3b5fc`) y Bloque medio día (`3c3b6518-1657-81ca-9ea0-e4585b034ba4`) actualizadas al 100% (Completadas).

**Estado:**
- ✅ **Catálogo 2026 consolidado y activo** en Local (54321) y Cloud (`amhfdzfcmpastmlsosou`).
- ✅ **Branding oficial aplicado** en toda la aplicación.
- ✅ **Git develop y main sincronizados y pusheados**.
- ✅ **Notion actualizado** y estado guardado en RAG.

## 🐛 BUG FIX — messaging_settings (CRÍTICO)

**Síntoma:** Página `/settings/messaging` no respondía — alerta de error flash, campos en blanco al recargar, no se podía interactuar.

### Los 4 bugs encontrados y corregidos:
1. **POST vs PUT (405):** Frontend enviaba `method: "POST"` pero route.ts solo exportaba `PUT` → Next.js devolvía **405 Method Not Allowed**.
   - Fix: `page.tsx` L74 → `method: "PUT"`.
2. **Response shape anidada:** API devuelve `{ data: {...} }` pero frontend hacía `...data` en vez de `...data.data` → los settings quedaban bajo `settings.data.xxx`, todos los inputs recibían `undefined` → formulario muerto.
   - Fix: `page.tsx` L54 (GET) y L86 (PUT) → `...data.data`.
3. **Campos UI en body:** Frontend enviaba `loading` y `saving` (estado React) en el body del PUT → Supabase rechazaba el upsert por columnas inexistentes.
   - Fix: `route.ts` L47-53 → whitelist `ALLOWED_COLUMNS` que filtra solo columnas reales de la tabla.
4. **Middleware/Auth + `.next` borrado:** 
   - El middleware `src/middleware.ts` exige la cookie `melosmile_session=valid_melosmile_session_token_oslysmile` para rutas `/api/*` (si no, devuelve 401 "No autorizado"). El navegador DEBE tener la cookie (haber pasado por `/login`).
   - Durante debug, el agente CTO **sobrescribió `route.ts` con un stub** (quitó Supabase) y **borró `.next`** → server daba 500. Se restauró `route.ts` completo y se reinició el server.

### Archivos modificados en esta sesión:
- **`frontend/src/app/(dashboard)/settings/messaging/page.tsx`** — L54, L74, L86: `PUT` + `...data.data`
- **`frontend/src/app/api/settings/messaging/route.ts`** — L47-53: whitelist `ALLOWED_COLUMNS`; L63-64: fix `smtp_port` (default 587, nunca null). RESTAURADO completo (estaba en stub).

### Verificación (10/09/2026):
- ✅ `npx tsc --noEmit -p tsconfig.json` → exit 0 (limpio)
- ✅ `curl -b "melosmile_session=valid_melosmile_session_token_oslysmile" http://localhost:3028/api/settings/messaging` → 200 con `{data:{...}}` tokens enmascarados (`****w3QY`)
- ✅ `curl -X PUT ...` → 200, whitelist filtra `loading`/`saving`, `smtp_port` persiste como 587
- ✅ **CodeGraph impacto**: aislado — `MessagingSettingsPage` autocontenido, sin callers externos

**Lección aprendida:** SIEMPRE verificar el contracto frontend↔backend: (a) HTTP method, (b) response shape `{data:{}}` vs `{}`, (c) body sin campos UI. Y que los subagentes CTO/coder pueden sobrescribir archivos con stubs — verificar con `read` tras delegar.

## 📋 GESTIÓN NOTION (PROYECTO MELOSMILE) — ESTA SESIÓN

### Proyecto encontrado
- **"Sistema Melosmile"** — ID: `3c3b6518-1657-813a-a38e-df2bb5ef5961` → **Estado actualizado a "En curso"** ✅
- **"Redes Melosmile"** — ID: `2ffb6518-1657-80f9-a821-d046d6497b63` (sin actualizar)

### Tareas CREADAS (verificadas con re-lectura)
| Tarea | Estado | Page ID |
|-------|--------|---------|
| Frente 3 Mensajería (messaging_settings) — Completado + Bugfix | Completada | `3d7b...fd5b4f` |
| Frente 4 — Cuestionario de primera visita | Puede Empezar | `3d7b...6d6d81` |
| Deploy a producción (merge develop → main) | Puede Empezar | `3d7b...e3b5fc` |
| Vincular Telegram de pacientes (telegram_chat_id) | Puede Empezar | `3d7b...c01c4e` |

### Calendario REORGANIZADO por prioridad (15 tareas pendientes)
- **P1 URGENTE:** Deploy a producción (11 sep) · Frente 4 Cuestionario (14 sep)
- **P2 ALTA:** Vincular Telegram (15 sep) · Contexto largo Musly (16 sep)
- **P3 MEDIA:** Timezone UX (17 sep) · Migraciones locales (18 sep) · Procedimientos a cita (21 sep) · Storage parity (22 sep)
- **P4 FASE 12 CONSENTIMIENTOS:** RGPD (23 sep) · Firma Digital (24 sep) · Listado Ficha (25 sep) · Generación PDF (28 sep) · Modal Edición (29 sep) · Autocompletado (30 sep) · Diseño Consentimientos (1 oct)

### ⚠️ GOTCHA NOTION (importante)
- El contrato del router n8n exige los **nombres reales de propiedades de Notion** (no genéricos). En la DB TAREAS: `Nombre de la Tarea` (title), `Estado` (status), `Fecha límite` (date), `Tipo de Tarea` (multi_select), `Proyectos` (relation), `Nota` (rich_text), `Progreso` (number).
- `notion-lean-updater.ts` mapea el VALOR según el nombre de la clave (heurística), pero la CLAVE debe ser la propiedad real de Notion. Usar claves genéricas (`title`, `estado`, etc.) produce errores/creación fallida.
- Los scripts: `notion-lean-query.ts` (lectura) y `notion-lean-updater.ts` (escritura) — rutas en `/Users/munircallaos/Antigravity Projects/opencode/scripts/`. Payloads temporales en `scratch/`.

## 📁 ARCHIVOS RELEVANTES (NO TOCAR / CONTEXTO)

### 🔧 CÓDIGO FRENTE 3 (deployado, commit `d82404a`):
1. **`frontend/src/app/(dashboard)/settings/messaging/page.tsx`** — UI configuración canales (WhatsApp/Telegram/Email). **SIN deps externas**: useState + alert() + componentes ui/{button,card,input,label} (NO react-hook-form/zod/sonner/switch/checkbox — no existen).
2. **`frontend/src/app/api/settings/messaging/route.ts`** — API GET/PUT singleton id=1. GET enmascara secretos (`'****'+last4`). PUT: whitelist ALLOWED_COLUMNS; si valor llega enmascarado NO sobrescribe; si `''` → null; `smtp_port` → default 587. Usa `(supabase as any)` + `supabaseAdmin` de `@/lib/supabase/server`.
3. **`frontend/src/app/api/reminders/send-now/route.ts`** — select patients añade `telegram_chat_id`; payload a n8n incluye `messaging_config` (SIN tokens) + `telegram_chat_id`. Webhook: `N8N_REMINDERS_WEBHOOK`.
4. **`frontend/src/app/(dashboard)/settings/page.tsx`** — card "Mensajería" (icono `Send`, `href: "/settings/messaging"`).
5. **`supabase/migrations/20260910000000_messaging_settings.sql`** — CREATE TABLE `messaging_settings` (id PK DEFAULT 1 CHECK(id=1)), `ALTER patients ADD telegram_chat_id text`, INSERT singleton id=1.
6. **`frontend/scripts/apply-migration-messaging.js`** — ⚠️ **NO usar exec_sql en Cloud (404)**; aplicar con Management API.
7. **`frontend/src/middleware.ts`** — Auth: exige cookie `melosmile_session` para rutas protegidas. `/api/*` sin cookie → 401. Permitidos: `/api/auth/login`, `/api/ai-context`, `/api/dispatcher`, `/api/billing/document-cleaner`, `/api/calendar/ical`. También acepta header `x-api-key` (N8N_API_KEY).

### 🔧 CÓDIGO SESIONES ANTERIORES (deployado, no tocar salvo nueva petición):
8. **`frontend/src/lib/billing/calculator.ts`** — `is_facturado_odoo?: boolean`; dropdown pago bloqueado si `payment_status='paid'`. Commit `b23b7be`.
9. **`frontend/src/app/(dashboard)/patients/[id]/edit/page.tsx`** — fix Odoo: `newValues = {...form, ...formToSave, full_name}`. Commit `df76a2d`. ¡NO REINTRODUCIR!
10. **`frontend/src/app/(dashboard)/patients/[id]/page.tsx`** — `getPlanProgress`: `completedControlsCount` SOLO cuenta `a.status === "Realizada"`. Commit `cb5c9da`.
11. **`frontend/src/app/api/appointments/update/route.ts`** — fix cancelación: soft-cancel `status="Cancelada"`.

### ⚙️ N8N (MUSLY — prod, validado, NO tocar):
12. Dispatcher: `QgNoVFr9TBXGbdOl` | Sub-Agent Agendamiento: `d74hAW8IkmmCqoh5` | Bridge: `CyCVHWOxPuHCLteP` | Date-parser solo dev: `Yv9X1EGUvQg8qErW` | Credencial OpenRouter: `UU1j5uOp8ejNx4BU`

## 🏗️ ARQUITECTURA DE ENTORNOS (CONSOLIDADA — NO CAMBIAR)

| Entorno | Proyecto Vercel | Rama | Dominio | Supabase | Contenido |
|---|---|---|---|---|---|
| **Staging** | `melosmile-staging` | `develop` | staging.melosmile.com | `amhfdzfcmpastmlsou` (`.env.local` usa ESTE) | 11 pacientes de prueba (PAC-001 Munir intacto) |
| **Producción** | `melosmile-production` | `main` | agenda.melosmile.com | `xylqytpudbdcsbuuwqpi` | 67 pacientes reales, 119 citas |

**Gotchas críticos:**
- `frontend/.vercel/project.json` → melosmile-staging | raíz `.vercel/project.json` → melosmile-production
- Deploy staging: desde **raíz** del repo con `npx vercel --prod=false --yes --project melosmile-staging`
- **Supabase real**: `.env.local` apunta a CLOUD `amhfdzfcmpastmlsou.supabase.co` (NO al local 127.0.0.1). La app local `:3028` habla con Cloud.
- **Migraciones a Cloud**: Management API `POST https://api.supabase.com/v1/projects/<ref>/database/query` con `Authorization: Bearer SUPABASE_ACCESS_TOKEN` (de `.env.local`). RPC `exec_sql` NO existe en Cloud.
- **Tablas nuevas** (messaging_settings) no tipadas: usar `(supabase as any)` — NO regenerar tipos sin revisar database.types.ts.
- **Arrancar server**: `npm run dev` bloquea en `export_remote_data.js` + `supabase start` (que falla por port conflict). Si falla, arrancar directo: `npx next dev -p 3028` desde `frontend/`.
- **Auth local**: cookie `melosmile_session=valid_melosmile_session_token_oslysmile`. Visitar `/login` para setearla en el navegador.
- psql local: `/opt/homebrew/opt/libpq/bin/psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres"`.

## 🚀 PRÓXIMOS PASOS PENDIENTES

### INMEDIATO (validación del fix):
1. **Validar en navegador**: abrir `http://localhost:3028/login` → navegar a `/settings/messaging` → activar Telegram → guardar token → recargar → verificar persistencia.
2. **Commit + deploy a staging** del bugfix (`page.tsx` + `route.ts`) para validación en staging.melosmile.com.

### FASE SIGUIENTE (calendario Notion ya asignado):
3. **11 sep — Deploy a producción** (merge develop → main): validar manualmente cambios acumulados en staging (Contabilidad, Odoo, Plan, Frente 3, bugfix messaging).
4. **14 sep — Frente 4 Cuestionario de primera visita**: diseño CMO+CTO listo (formulario multi-paso, 5 bloques/18-20 ítems, consentimiento LOPD, resumen WhatsApp/email). CTO: tabla `patient_intake_forms` (token único, `answers` JSONB), link público `melosmile.com/intake/[token]` (caduca 48h), webhook n8n `patient-intake-processor`, esfuerzo M.
5. **15 sep — Vincular Telegram de pacientes**: falta que cada paciente vincule su chat (`telegram_chat_id` vacío); requiere bot activo + flujo de enlace.
6. **16 sep — Contexto largo Musly con Supabase**: resolver reporte b659df08 (Musly pierde contexto tras F5).
7. **17-22 sep — Mejoras backend/UX**: Timezone UX, Migraciones locales, Procedimientos a cita, Storage parity.
8. **23 sep-1 oct — Fase 12 Consentimientos**: RGPD, Firma Digital, Listado Ficha, Generación PDF, Modal Edición, Autocompletado, Diseño Módulo (requieren documentación previa).
9. **Parser Notion → citas** basado en auditoría.
10. **Resumen IA automático** al entrar en ficha paciente.
11. **Botón "Limpiar historial"** para conversaciones Musly.

## 📊 ESTADO DE VERIFICACIONES (10/09/2026)

### ✅ VERIFICADO:
- **tsc limpio**: `npx tsc --noEmit -p tsconfig.json` EXIT=0 (frontend)
- **API mensajería**: GET/PUT probados local 200 (contra Cloud) — enmascarado OK, whitelist filtra campos UI, `smtp_port`=587
- **Server local**: `localhost:3028` arrancado con `npx next dev -p 3028` (root responde 307 redirect a login)
- **Migración Cloud verificada**: 13 columnas messaging_settings, telegram_chat_id en patients, fila id=1 OK
- **CodeGraph impacto**: bugfix aislado, sin callers externos
- **Notion**: 4 tareas creadas + 15 reorganizadas + estado proyecto "En curso" — verificadas con re-lectura

### ⚠️ PENDIENTE / NOTAS:
- **Validación en navegador pendiente del usuario** (no confirmada aún)
- `test_staging_data.js` en frontend/ es residual (untracked) — NO commitear sin consultar
- Los subagentes (`coder-local`, `reviewer`, `db-admin`, `coder-cloud`) a veces devuelven respuestas vacías o **sobrescriben archivos con stubs** — verificar con `read` tras delegar
- RAG save-session falló varias veces (Supabase local con port conflict / timeout) — la lección de Management API sí se guardó
- Política N8N PROD/DEV: workflows validados NO se tocan

## 📦 RESUMEN DE SESIÓN

**Proyecto:** melosmile
**Sesión:** 10/09/2026 — Bugfix Mensajería + Overhaul Recordatorios + Gestión Notion
**Estado:**
- ✅ **Bugfix Settings Mensajería aplicado** (`/settings/messaging` GET/PUT corregido, whitelist de columnas, persistencia verificada).
- ✅ **Overhaul Recordatorios en Ficha Paciente**:
  - Modal de edición con selector de plataforma (WhatsApp, Telegram, Email, SMS), fecha y mensaje (`edit-reminder-modal.tsx`).
  - Modal reactivo de confirmación de eliminación in-app (sustituyendo `confirm()`).
  - Endpoint `DELETE /api/reminders` operativo.
  - Corrección de tokens CSS de modo oscuro (`globals.css`, `input.tsx`, `textarea.tsx`).
- ✅ **Despachador n8n Creado y Conectado**:
  - Workflow `[MELOSMILE] Reminders Dispatcher` (`OqOwzzat6rh0R1Jr`) activo en `https://n8nv2.mumaweb.com/webhook/melosmile-reminders-dispatcher`.
  - Conexión con Telegram Bot oficial (`7539054739:AAH...`) y auto-detección de `telegram_chat_id`.
  - Captura real de errores e inserción de logs en `reminder_events`.
- ✅ **Gestión Notion**: Tarea agendada para mañana 11/09/2026: *"Envío de recordatorios Telegram Directo (MTProto) / WhatsApp desde número sin bots"*, asociada al proyecto *Sistema Melosmile*.
**Impacto:** Alto (UX de recordatorios saneada, n8n operativo y plan de mensajería directa calendarizado).
**Riesgo:** Bajo.

---

**Última actualización:** 2026-09-10
**Proyecto:** melosmile
**Estado:** ✅ RECORDATORIOS SANEADOS + WORKFLOW N8N V2 OPERATIVO + TAREA NOTION PROGRAMADA PARA MAÑANA (11/09).

---
**Nota para siguiente sesión:**
1. Desarrollar la tarea agendada en Notion: habilitar envío de mensajes directos al número telefónico del paciente (sin bots) vía Telegram MTProto (GramJS con credenciales de la clínica) o WhatsApp Cloud API.
2. Validar en navegador `http://localhost:3028/patients/...` y `/settings/messaging`.
3. Proceder al commit y despliegue a staging.

