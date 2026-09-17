# 🏥 ESTADO DEL PROYECTO MELOSMILE — 17/09/2026: REFACTORIZACIÓN CALENDARIO Y VISTA ANUAL

> 🏁 **HITO 17/09 — Refactorización UI Calendario Dashboard**: Se implementó la vista anual, se arregló el comportamiento responsivo elástico de la cuadrícula mensual (sin scroll interno) y se mejoró la visualización de estados en la agenda lateral.

## 🔧 MEJORAS APLICADAS (Motor de Recordatorios JIT)
**Síntoma previo**: Los textos de los recordatorios (1 semana, 2 días, mismo día) se generaban y "quemaban" en base de datos al momento de programarse (ej. un mes antes). Si el paciente confirmaba su cita, el mensaje de "2 días antes" seguía diciendo "Por favor confírmala" por estar estático en BD. Además, todos los mensajes tenían emojis y eran propensos a baneos por spam al ser textos exactos repetidos cientos de veces.

**Fix aplicado**:
- **Nueva columna en BD (`reminders.stage`)**: Identifica si el mensaje es de Etapa 1 (semana), 2 (2 días) o 3 (día de cita). Migración ejecutada manualmente en producción.
- **Módulo `copies.ts`**: Lógica que autogenera textos en tiempo real. Se eliminaron TODOS los emojis y el lenguaje sesgado por género ("lo gestionamos" en vez de "juntos"). Se cuenta con variaciones múltiples (A, B, C) para evadir las políticas anti-spam de Meta.
- **Identificación de Primer Contacto**: `isFirstMessage` comprueba si el paciente ya tiene mensajes previos; de lo contrario, incluye presentación ("Hola, te escribimos de Melosmile").
- **Despachador en Tiempo Real**: El cron `dispatch.ts` ahora intercepta el mensaje justo antes de enviarlo por Evolution/MTProto, lee el `stage`, genera el *copy* fresco (comprobando si la cita ya fue confirmada para agradecerle en vez de pedirle confirmar) y reescribe la BD para auditoría.
- **Merge & Deploy**: Todo ha sido comiteado a `develop` (commit `5e4ec16`), mergeado a `main` y desplegado exitosamente en Vercel.

> ✅ **Motor Activo**: Comprobado localmente, las variaciones dinámicas operan correctamente. Citas antiguas (con `stage` null) caen en gracia y usan el mensaje viejo para no fallar (compatibilidad hacia atrás total).



## 🔧 MEJORAS APLICADAS (UI Calendario y Drag & Drop)
**Síntoma previo**: La vista mensual del calendario en el dashboard sufría de "doble scroll" en pantallas de menor resolución (como laptops 13"-14") porque las celdas tenían una altura mínima de 105px. Además, al añadir muchos eventos en un mismo día, la cuadrícula se descuadraba. Faltaba también una vista de Año completo y los estados de citas en la agenda derecha eran texto simple y no resaltaban. Además, para reagendar citas había que abrir modales o editar manualmente.

**Fix aplicado**:
- **Vista Mes elástica**: Se eliminó el `min-h-[105px]` y el `overflow-y-auto` interno del grid, usando `auto-rows-fr` para que las celdas se estiren o encojan exactamente al alto de la ventana activa, emulando Apple Calendar.
- **Límite Visual de Eventos**: Para prevenir descuadres en la cuadrícula al estirar celdas muy pequeñas, ahora solo se renderiza el primer evento (índice 0) y un contador `+ X más` para el resto.
- **Vista Anual**: Se implementó la renderización de un panel de 12 meses usando `eachDayOfInterval`, con capacidad de navegación por año, indicadores de colores para citas y saltos directos a la vista Mes o Día haciendo clic.
- **Etiquetas Visuales**: La agenda lateral ahora usa `stMeta.badgeCls` y `stMeta.dotCls` del helper existente para pintar el estado de la cita con color de fondo brillante (verde, rojo, etc.) haciéndolo más evidente.
- **Reagendamiento Rápido Drag & Drop**:
  - Se implementó `@dnd-kit/core` y `@dnd-kit/modifiers` permitiendo arrastrar citas desde la agenda lateral derecha hacia cualquier día del mes en la cuadrícula.
  - Se desacopló `AgendaItemView` de `DraggableAgendaItem` para evitar colisiones de IDs duplicados en `DragOverlay`.
  - Se configuró `snapCenterToCursor` y `collisionDetection={pointerWithin}` para que el elemento flote exactamente bajo el ratón y la detección de soltado sea 100% precisa.
  - Al soltar la cita en el día destino, se abre el modal interactivo `RescheduleConfirmModal` preguntando si se mantiene la hora actual o si se desea cambiar antes de actualizar la base de datos vía API.

> ✅ **Producción**: Todos estos cambios han sido integrados a `develop`, fusionados en `main` y desplegados por Vercel.

## 🔐 MEJORAS APLICADAS (Autenticación Multi-usuario en Base de Datos)
**Síntoma previo**: Las credenciales de acceso (`AUTH_USERNAME` y `AUTH_PASSWORD`) estaban gestionadas a través de variables de entorno estáticas en Vercel, lo que impedía el soporte multi-usuario y requería un redespliegue completo de la plataforma para cualquier cambio de credenciales. Además, en producción Vercel mantenía valores antiguos (`clinica` / `melosmile2024`), impidiendo el login con `Oslysmile` y `@Konnan1983`.

**Fix aplicado**:
- **Tabla `app_users` en Supabase**: Creada con RLS habilitado y restringido a `service_role`. Contiene `id`, `username`, `password_hash` (`bcrypt`), `name`, `role`, `is_active`.
- **Seed de usuario inicial**: Usuario `Oslysmile` con hash `bcrypt` de `@Konnan1983`, rol `Administrador` y nombre `Dra. Osly Melo`. Aplicado y validado en Supabase Local, Staging (`amhfdzfcmpastmlsosou`) y Producción (`xylqytpudbdcsbuuwqpi`).
- **Endpoint `/api/auth/login`**: Ahora consulta dinámicamente la tabla `app_users`, normaliza usuarios (insensible a mayúsculas/minúsculas y `trim`), valida contraseñas con `bcryptjs.compareSync` y conserva un mecanismo de fallback de emergencia en memoria.
- **Gestión de Sesión**: Genera y persiste `melosmile_session` y `melosmile_user`, permitiendo identidad de usuario dinámica en `/api/auth/session` y limpieza completa en `/api/auth/logout`.
- **Despliegue Multi-entorno**: Sincronizado en `develop` (Staging) y `main` (Producción `agenda.melosmile.com`), con pruebas HTTP 200 verificadas en vivo.

## 🎯 OBJETIVO ACTUAL (resuelto)
Autenticación multi-usuario en base de datos completada y verificada en Producción, Staging y Local. Pendientes de las próximas instrucciones de producto o IA.

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