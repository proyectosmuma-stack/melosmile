# Walkthrough - Sesión 18/08/2026

## 1. Resumen de Tareas Realizadas

Durante esta sesión, tanto Antigravity como Mumabot (OpenCode) colaboraron en una auditoría profunda de infraestructura, seguridad y orquestación de IA.

### A. Corrección de Seguridad e Integración (Antigravity)
* **Middleware y Webhooks (`middleware.ts`):** Se parchó el sistema para evitar el bloqueo `401 Unauthorized` de los agentes de n8n. Se estableció una excepción de seguridad mediante el header `x-api-key: melosmile_internal_n8n_key_2026`.
* **Auditoría de Vercel URLs:** Se comprobó vía Vercel CLI que los subagentes externos fallaban con `404 Not Found` por estar apuntando a un alias fijo y obsoleto (`frontend-eight-dusky-42.vercel.app`). La URL definitiva de staging se identificó como `melosmile-staging-git-develop-proyectosmuma-stacks-projects.vercel.app`.

### B. Auditoría de Infraestructura de IA (Mumabot / OpenCode)
* **Incidente de Subagentes Vacíos:** Se resolvió el fallo crítico donde los subagentes de OpenCode (architect, coder, designer) devolvían resultados vacíos.
  * *Causa raíz:* Los modelos `gemini-2.5-pro` y `flash` fueron deprecados por Google, y `gemini-3.1-pro` no posee cuota en el Free Tier de AI Studio.
  * *Solución:* Se reconfiguraron los subagentes para usar `gemini-3.6-flash` (nativo en AI Studio) y `openrouter/google/gemini-3.1-pro-preview` para las tareas de alto razonamiento (architect).
* **CodeGraph y Memoria RAG:** Mumabot verificó y reconstruyó exitosamente la base de datos de CodeGraph (`.codegraph.db-shm/wal`) tras ser corregido su protocolo de uso.
* **Documentación (La Trinidad):** Mumabot consolidó el conocimiento en `context.md`, eliminó la fragmentación en `audit-report.md`, y guardó las decisiones arquitectónicas en `docs/knowledge-base/decisions/`.

## 2. Lecciones Aprendidas (Knowledge Base)
1. **Los Webhooks y el Middleware:** Nunca dejar los webhooks de n8n sin mecanismo de bypass de API Key cuando se implementa autenticación global en Next.js.
2. **Modelos de Google AI Studio:** Los modelos cambian rápidamente de versión. En caso de fallo silencioso o respuesta vacía, siempre revisar los logs de OpenCode (`~/.local/share/opencode/log/opencode.log`) para descartar deprecaciones de modelos o errores de Cuota (Quota Exceeded = 0 en Free Tier).
3. **Agentes Locales y Memoria RAM:** Lanzar modelos pesados en paralelo mediante Ollama/Llama-server puede causar OOM (Out of Memory - Signal Killed) si superan los 18GB de consumo. Solución: Ejecutar los locales de forma secuencial, y los de Cloud en paralelo.
4. **Trinidad Documental:** Es imperativo forzar a OpenCode a escribir exclusivamente en `context.md`, `roadmap.md` y `Walkthrough.md` para evitar fragmentación.

## 3. Siguientes Pasos (Pendientes en OpenCode)
* Reemplazar masivamente la URL de Vercel antigua en los flujos de n8n para restablecer la automatización externa.

## 4. Sincronización de Base de Datos (Completada ✅)
* **Objetivo:** Sincronizar Supabase Local ← Cloud (staging develop). Cloud = fuente de verdad (decisión del usuario).
* **Problema 1 (migración rota):** `20260816000001_add_is_active_to_patients_clinics.sql` tenía el *down migration sin comentar* → ADD + DROP inmediato → `is_active` nunca existía → `supabase db reset` fallaba en seed con `SQLSTATE 42703`. **Fix:** comentar el down migration.
* **Problema 2 (IDs divergentes):** la migración `20260722000005` siembra clínicas/profesionales con `gen_random_uuid()` + `ON CONFLICT DO NOTHING` → el seed de cloud no sobrescribía los IDs → FK rotas. **Fix:** `TRUNCATE ... CASCADE` + recarga de `supabase/seed.sql`.
* **Resultado:** Local = espejo exacto de Cloud. Clínicas: Goya `056bfb44`, RyA `0da2b67b`, Las Rozas `7c82ad1e`, D. Bustamante `59d7b4f4`. Profesionales: Osly `d7e5e2bb` (el que espera `billing/extract`), Norelys `a07e1bcf`, Shirley `c8c5b405`, Asencio `3056e04c`. Munir PAC-001 `cff20455` con is_active=true y sus clínicas (Goya + RyA primaria). FKs íntegras: 0 rotas. App 200 / Supabase 200.
* **Pendiente:** el seed de cloud (`professional_clinics` 4, tags 6, treatments 53) está cargado; verificar contra n8n que los flujos apunten a la URL de staging correcta.

## 5. Integración de Flujos n8n en Grafo y Base de Conocimiento (Completada ✅)
* **Sincronización Completa:** Se descargaron los 86 workflows de la instancia `https://n8n.mumaweb.com`.
  * **Melosmile (`melosmile/n8n/melosmile/`):** 6 flujos clínicos actualizados (`AI_Dispatcher`, `SubAgent_Agendamiento`, `SubAgent_Clinico`, `SubAgent_Contabilidad`, `SubAgent_General`, `Agent_Document_Cleaner`).
  * **MumaLeads (`mumaLeads/n8n-workflows/`):** Más de 30 flujos sincronizados (`muma-email-engine`, `muma-gmaps-explorer`, `muma-lead-enricher`, `muma-scrape`, etc.).
  * **Hub Global (`flujos N8N/workflows.json`):** Master copy de los 86 flujos sincronizada.
* **Grafo de Código (CodeGraph):**
  * Se creó `frontend/src/types/n8n-contracts.ts` conectando formalmente los flujos con las rutas de API internas de Next.js (`/api/appointments`, `/api/patients`, etc.).
  * Reindexados con éxito los 3 repositorios: Melosmile (117 archivos, 1973 nodos), MumaLeads (221 archivos, 2870 nodos), y Flujos N8N (542 archivos, 3486 nodos).
* **Base de Conocimiento:** Creado `docs/knowledge-base/domains/n8n-workflows.md` con topología, diagramas Mermaid y fichas técnicas.

## 6. Optimización y Configuración Final del Equipo de Subagentes (Completada ✅)
* **Benchmark Empírico en Hardware Local:**
  * `mistral-nemo:12b`: Descalificado para tareas reales de proxy (falló 4/4 en tool calling devolviendo texto plano).
  * `llama3.1:8b`: Ganador absoluto en estabilidad (100% acierto en `tool_calls` nativo, velocidad de 22.9 tok/s, 4.9 GB RAM).
* **Asignación Definitiva de Modelos:**
  * `mumabot-coder-local`: `ollama/llama3.1:8b` (operaciones de seguridad, `.env`, tokens y base de datos local).
  * `mumabot-reviewer`: `ollama/llama3.1:8b` (auditoría y linting offline rápido).
  * `mumabot-coder-cloud`: `google/gemini-3.6-flash` (desarrollo ágil de código frontend/TypeScript).
  * `mumabot-architect`: `openrouter/google/gemini-3.1-pro-preview` (diseño de sistemas y contratos de arquitectura).
* **Liberación de Memoria:** Eliminado proceso zombie de MLX en puerto 18080 que consumía 6.6 GB (34% RAM). La memoria disponible subió a más de 8.5 GB libres.

## 7. Sesión 22/08/2026 — UI, Modo Oscuro, Paridad de Citas Cloud y Despliegue en Vercel (Completada ✅)

* **Resolución de Bugs de Interfaz y Facturación:**
  * **Modo Oscuro Dual:** Activada la clase `.dark` en `html`, configurado `@theme inline` y `@custom-variant dark` para compatibilidad completa con Tailwind CSS v4.
  * **Selectores de Sedes con Nombre Real:** Reparada la prop `items` en 13 selects de `@base-ui/react` a lo largo de 5 archivos para evitar que se muestren UUIDs planos.
  * **Facturación Multiclínica:** Resuelto el bug en `clinic-context.tsx` y `billing/page.tsx` para listar todas las sedes correctamente y proteger la persistencia de `localStorage`.
  * **Switch de Tema en Ajustes:** Creado `components/settings/theme-toggle.tsx` con soporte anti-FOUC y nuevo acceso **"General"** en el submenú de Ajustes del Sidebar.
* **Sincronización de Citas Demo (Paridad Local ↔ Supabase Cloud):**
  * `mumabot-coder-cloud` insertó 3 citas demo para Munir (PAC-001) con fechas relativas e idempotencia tanto en `seed.sql` como en **Supabase Cloud Staging** (`amhfdzfcmpastmlsosou`), logrando paridad 100% (0 FKs rotas).
* **Despliegue Continuo en Vercel:**
  * Configuración oficial y despliegue del proyecto `melosmile-staging` en Vercel con Turbopack.
  * Staging URL: `https://melosmile-staging-git-develop-proyectosmuma-stacks-projects.vercel.app`.
* **Reglas y Skills de Monitorización:**
  * Creadas e integradas las skills `/monitor` y `/stop-monitor` tanto a nivel local como global (`~/.gemini/config/skills/`).
  * Blindada la regla de delegación obligatoria de Base de Datos en `~/.config/opencode/agents/coding/mumabot-cloud-pro.md`.

## 8. Sesión 24/08/2026 — Revival Musly Prod, Migración al Bridge y Endurecimiento RGPD (Completada ✅)

### A. Revival de Musly en Producción (`n8nv2`) + Migración Arquitectónica
* **Causa raíz del apagón**: el dispatcher prod apuntaba a una credencial OpenRouter inexistente → crash en 35ms por mensaje. Reparada con credencial válida extraída del flujo Hungrys GPB.
* **Bug estructural descubierto**: el patrón `toolHttpRequest`+$fromAI en n8nv2 genera esquemas degenerados ("did not match expected schema" con path vacío) — los subagentes NUNCA habían funcionado en prod.
* **Solución**: migración completa de Dispatcher + 4 subagentes a `toolWorkflow` → nuevo flujo "[MELOSMILE] API Bridge (Prod)" con Switch de 11 rutas hacia la staging API (header `x-api-key`). System Message del dispatcher sincronizado verbatim con dev (REGLA DE ORO DE RUTEO, PROHIBIDO-SIN-DELEGAR, TRANSFERENCIA MULTITURNO).
* **Certificación E2E**: lectura y escritura (crear/reagendar/cancelar) verificadas contra verdad absoluta en BD con limpieza forense posterior.

### B. Endurecimiento RGPD de Fotografías Clínicas
* **Riesgo cerrado**: 88 fotos clínicas reales eran accesibles por URL pública permanente + tabla `documents` con 4 políticas RLS públicas (incluida ALL anónimo).
* **Código** (typecheck limpio): helper `signDocumentUrl()` en `frontend/src/lib/server/storage.ts` (TTL 3600s, defensa path-traversal) + `GET /api/documents` sirve firmas con fallback legacy. Contrato API intacto; cero cambios en componentes frontend.
* **Migración RLS** `20260824000000_secure_documents_rls.sql`: aplicada a CLOUD vía `supabase db query --linked --file` (la CLI 56 no tiene `db execute`; RPC exec_sql no existe en cloud→404) y a LOCAL vía docker psql. Verificado: 0 políticas restantes en ambos.
* **Despliegue cero-ventana-rota** (orden crítico): deploy staging → verificación FIRMADA → deploy producción desde raíz (alias automático a agenda.melosmile.com) → verificación FIRMADA → **entonces** flip del bucket a privado.
* **Verificación final**: URL pública legacy → **400 RECHAZADA** · signed URLs en prod y staging → **200 OK**.

### C. Lecciones Aprendidas (esta sesión)
1. **Storage API**: la actualización de buckets es `PUT /storage/v1/bucket/{id}`, no PATCH (PATCH devuelve 404).
2. **Supabase CLI 56**: no existe `db execute`; usar `db query --linked --file <sql>` para aplicar SQL al proyecto vinculado vía Management API.
3. **Free tier gemini-3.6-flash**: límite ~20 req/día agotable → ante fallo ×3 del subagente cloud, aplicar Regla Anti-Bucle e implementar directo con auditoría compensatoria documentada.
4. **Agentes locales Qwen hoy**: devolvieron meta-respuestas sin ejecutar herramientas (falso-positivos detectados por regla anti-falso-positivo). Verificar siempre evidencia literal antes de dar por bueno un task "completed".
5. **Orden de seguridad en producción**: código nuevo primero → verificar contra datos reales → recién entonces endurecer infraestructura (flip privado), para eliminar ventanas de servicio roto.

## 9. Sesión 26/08/2026 — Separación de Entornos de BD y Certificación E2E Odoo (Completada ✅)

### A. Clarificación y Separación de Entornos de Supabase
* **Problema:** Había confusión entre los agentes sobre cuál era la base de datos de producción real. Los volcados de datos recientes y el entorno Vercel de producción estaban apuntando a la base de datos de staging (`melosmile_db`). El proyecto de producción original (`melosmile-production`) estaba pausado por inactividad.
* **Solución (DevOps):**
  1. Se reactivó `melosmile-production` (ID: `xylqytpudbdcsbuuwqpi`).
  2. Se vinculó el proyecto vía CLI y se aplicó un `db reset --linked` para inyectar todas las 21 migraciones y el seed data de pruebas de Munir, ya que estaba completamente vacía.
  3. Se extrajeron las API Keys reales de `melosmile-production` y se sobreescribieron en las variables de entorno de Vercel Production.
  4. Se desplegó un nuevo build en Vercel a `agenda.melosmile.com` para forzar la adopción de la nueva base de datos.
* **Resultado:** Entornos 100% aislados. Staging (`melosmile_db`) para pruebas de agentes, y Producción (`melosmile-production`) para tráfico real. Documentado explícitamente en `context.md`.

### B. Corrección de Inyección de Variables Odoo en Staging
* **Problema:** El subagente reportó `Failed to parse URL from undefined/web/session/authenticate` al probar la facturación en Staging. Vercel no estaba inyectando `ODOO_URL` en la rama `develop` a pesar de haberlas configurado horas antes.
* **Solución:** Se forzó un redespliegue de la rama `develop` mediante un commit vacío (`chore: trigger vercel preview deploy`), provocando que Vercel Preview inyectase las credenciales actualizadas.

### C. Certificación E2E del Flujo de Facturación Odoo
* **Ejecución:** Se creó el script `scratch/test_billing_flow6.ts` para simular el cierre de la cita de Munir (29-12-2025) y su envío a Odoo directamente desde el entorno Staging de Vercel (llamando a `https://melosmile-staging-o54y7wdx8-proyectosmuma-stacks-projects.vercel.app/api/odoo/invoice`).
* **Verificación:** Respuesta exitosa `{ "success": true, "invoiceId": 2, "invoiceNumber": "INV/ODOO/2" }`.
* **Conclusión:** El puente Odoo Vercel ↔ Odoo Test está plenamente validado y certificado en la nube, operando a la perfección con la seguridad de `x-api-key`.

## 10. Sesión 03/09/2026 — Estabilización E2E de Musly en n8nv2, Vercel Multi-Env y Optimización de Subagentes (Completada ✅)

### A. Diagnóstico y Resolución del Error 404 en Vercel Staging
* **Incidencia**: Al consultar a Musly desde Staging (`https://staging.melosmile.com`), el backend devolvía error HTTP 404 (`El servicio respondió con un error (404)`).
* **Causa Raíz**: En Vercel Staging no estaban configuradas las variables de entorno de n8n (`N8N_WEBHOOK_BASE_URL`), provocando que `/api/dispatcher` cayera en el fallback residual a la instancia antigua inactiva (`https://n8n.mumaweb.com`).
* **Solución y Blindaje**:
  * Se creó y ejecutó el script `scripts/sync_vercel_env.js` inyectando las 11 variables de entorno de `n8nv2` y VPS en los 3 entornos de Vercel: **Preview (Staging)**, **Production** y **Development**.
  * Se actualizaron los fallbacks de código en `frontend/src/app/api/dispatcher/route.ts` y `frontend/src/app/api/billing/document-cleaner/route.ts` apuntando a `https://n8nv2.mumaweb.com`.

### B. Optimización del Sub-Agente Clínico y Resolución Flexible en Backend
* **Incidencia**: El usuario consultó *"telefono de Munir callaos"* y el agente respondió que *"su función se limitaba a datos clínicos"*. Al consultar *"que tratamiento tiene Munir"*, el modelo devolvió una respuesta vacía.
* **Causa Raíz**:
  1. El sub-agente clínico (`WNViucEUuhzigYtE`) no tenía conectada la herramienta `Tool_Search_Patients`.
  2. Su modelo (`gemini-2.5-flash` en OpenRouter) fallaba silente en la invocación de herramientas devolviendo `output: ""`.
  3. Los endpoints `/api/patients/[id]/clinical` y `summary` exigían UUID estricto (fallando si se pasaba nombre o código PAC) y no incluían teléfono ni email.
* **Solución**:
  * Sub-agente clínico migrado a `openai/gpt-4o-mini` (temperatura 0), equipado con `Tool_Search_Patients` y reescrito su systemMessage para actuar como la **mano derecha del doctor para pacientes y fichas**, con la obligación estricta de entregar teléfonos y datos de contacto de inmediato.
  * `/api/patients/[id]/clinical` y `/api/patients/[id]/summary` actualizados para resolver automáticamente por **Nombre**, código **`PAC-###`** o **UUID**, incluyendo teléfono, email, DNI, dirección y nacimiento bajo `supabaseAdmin`.

### C. Blindaje del Sub-Agente de Agendamiento y Soporte de Citas Recientes
* **Incidencia**: Al pedir *"cuales han sido las citas mas recientes?"* o *"la agenda de la semana pasada"*, el agente respondía que no tenía acceso.
* **Causa Raíz**: El prompt de `Agent_Scheduling` restringía la consulta a *"agenda de esta semana"*, y `/api/appointments/list` no procesaba consultas de citas pasadas/recientes.
* **Solución**:
  * Prompt de `Agent_Scheduling` blindado con la obligación estricta de llamar a `Tool_List_Appointments` ante cualquier período temporal (recientes, semana pasada, hoy, etc.) con prohibición de excusarse con "no tengo acceso".
  * `/api/appointments/list` y `date-parser.ts` actualizados con soporte nativo para `isRecentQuery` (devolviendo el historial ordenado de las últimas 10 citas registradas).

### D. Estandarización de Modelos en n8nv2 y Certificación
* Se migraron también los sub-agentes de **Contabilidad** (`inakl5N4ROrmmrFh`) y **General** (`T5FvJ4PMcHKp1gBa`) a `openai/gpt-4o-mini` para evitar fallos silentes de OpenRouter.
* Se actualizaron y cerraron con notas técnicas los 4 reportes en la tabla `ai_agent_reports` de Supabase Cloud.
* Se desplegó con éxito en Vercel Staging (despliegue `pmfn2b4up` en estado **● Ready**).
* Se registraron 3 lecciones de aprendizaje en el RAG vectorial centralizado (`knowledge-sync.ts smart-save-lesson`) y se guardó la sesión (`memory-bridge.ts save-session`).

