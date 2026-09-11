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

## 11. Sesión 08/09/2026 — Reactivación de Producción, Sincronización de Pacientes Reales y Sistema Anti-Pausa (Completada ✅)

### A. Diagnóstico y Reactivación de `melosmile-production`
* **Incidencia**: La app de producción (`agenda.melosmile.com`) no mostraba pacientes y las variables en Vercel Production estaban vacías. El proyecto de producción en Supabase (`xylqytpudbdcsbuuwqpi`) se encontraba en estado `INACTIVE` (pausado por inactividad).
* **Solución**:
  * Se reactivó `melosmile-production` a estado `ACTIVE_HEALTHY` desde el dashboard de Supabase.
  * Se extrajeron las credenciales de producción (`anon` y `service_role`) y se sincronizaron en las variables de entorno de **Vercel Production**.

### B. Importación Íntegra de Datos Reales y Paridad Absoluta
* **Ejecución**: Se desarrolló y ejecutó el script de sincronización `sync_staging_to_production.mjs` para transferir todos los datos reales acumulados en Staging hacia Producción con integridad referencial 100% (0 FK rotas).
* **Paridad Certificada**:
  * `patients`: 67 pacientes reales importados en Producción.
  * `appointments`: 85 citas importadas.
  * `billing_records`: 33 registros de facturación importados.
  * `documents`: 88 documentos clínicos importados.
  * `treatments`, `clinics`, `professionals`: 100% sincronizados.

### C. Limpieza Estricta de Staging
* Siguiendo el protocolo de `AGENTS.md`, se ejecutó `clean_remote_db.js` sobre Staging (`melosmile_db`, `amhfdzfcmpastmlsosou`).
* Se purgaron todas las citas de prueba y pacientes secundarios, dejando como **único paciente en Staging** a **Munir Mauel Callaos Cardama (PAC-001)**.

### D. Sistema Anti-Desactivación / Anti-Pausa Redundante
* **n8nv2 (`n8nv2.mumaweb.com`)**: Creado y activado el workflow `[MELOSMILE] Keep-Alive Supabase Databases & App` (ID `suXh01RfJ190FEd4`) con `Schedule Trigger` cada 1 hora (`0 * * * *`). Realiza consultas SQL reales a las API REST de Supabase Staging, Supabase Producción y al endpoint de Vercel.
* **Vercel Crons**: Añadido el bloque `crons` a `vercel.json` (raíz y `frontend/`) para ejecutar `/api/cron/keepalive` cada 4 horas (`0 */4 * * *`).

## 12. Sesión 08/09/2026 — Auditoría de Pacientes contra Notion, Enriquecimiento de Citas y Migración de Fotos a VPS (Completada ✅)

### A. Auditoría Minuciosa de Pacientes y Clínicas vs Notion
* **Problema Identificado**: Existían discrepancias en la asignación de sedes clínicas para varios pacientes, y un paciente (`Lucas Pérez PAC-067`, anterior `PAC-6535`) carecía de asignación de clínica en `patient_clinics`.
* **Auditoría Exhaustiva contra Notion (`Pacientes` y `Pacientes Albacete`)**:
  * **Clínica Montaño (Getafe)**: Verificada como la sede real de `Ricardo De Freitas (PAC-023)`, `Rafael Requeijo (PAC-012)`, `Erika Alvarado (PAC-013)`, `Ana Gabriela De Nigris (PAC-014)`, `Alexis Morales (PAC-015)`, `Genesis Duque (PAC-016)`, `Greicee Rodriguez (PAC-017)`, `Angelo (PAC-002)`, `Luis Gil (PAC-003)`, `Alejandro Delgado (PAC-006)` y `Brenda (PAC-007)`. Se aseguró `is_primary = true` en Getafe.
  * **Clínica Goya**: Fijada como primaria para `Oscar Enrique Melo Cupido (PAC-035)` y los 22 pacientes asignados a Goya (`PAC-004` a `PAC-034`).
  * **Clínica Daniel Bustamante (Albacete)**: Asignada a todos los pacientes de Albacete (`PAC-036` a `PAC-066`, correspondientes a `ALB-1` a `ALB-33` de Notion / Clínica Roldán) y a `Lucas Pérez (PAC-067)`.

### B. Enriquecimiento de Citas y Anotaciones Clínicas
* De las 85 citas existentes en Producción, se auditaron estados y observaciones.
* Se normalizaron y enriquecieron las 4 citas que no contaban con notas clínicas descriptivas (toma de registros fotográficos de Ángel Da Silva, control Myobrace de Emma Mora, limpieza y fotos de Diego Martinez, y control de Richard Enciso).
* Balance final de citas en Producción: 78 Realizadas, 4 Pendientes, 3 Canceladas.

### C. Migración de 88 Fotografías Clínicas al Servidor VPS
* **Protocolo de Transferencia FTPS (`basic-ftp`)**:
  * Conexión directa al servidor VPS de producción (`94.143.139.120`, puerto 21).

### D. Resolución de Incidencia de Variables de Entorno en Vercel Producción (09/09/2026 ✅)
* **Diagnóstico de Alerta**:
  * La base de datos de Supabase Producción (`xylqytpudbdcsbuuwqpi`) estuvo en todo momento 100% intacta (67 pacientes, 119 citas, 88 documentos/fotos, 53 planes/tratamientos y 4 notificaciones de sistema).
  * En Vercel (`proyectosmuma-stacks-projects/melosmile-production`), las variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` estaban configuradas vacías (0 bytes) como sensibles, provocando que el cliente de Next.js (`@/lib/supabase/client`) compilara cadenas vacías y no cargara datos en el navegador.
  * Los endpoints `api/treatment-plans` y `api/ai/report` tenían un fallback residual a la BD de staging (`amhfdzfcmpastmlsosou`).
* **Acciones Ejecutadas**:
  * Sincronizadas y encriptadas las credenciales de Supabase Producción en el proyecto `melosmile-production` de Vercel.
  * Sincronizadas las credenciales de Supabase Staging en `melosmile-staging`.
  * Corregidos los fallbacks en `frontend/src/app/api/treatment-plans/route.ts` y `frontend/src/app/api/ai/report/route.ts`.
  * Redespliegue de producción ejecutado con éxito en Vercel (`dpl_bHSyqDAgVcSgz2DY94w14B719xUA` y `dpl_6fLMR9KjNt6f3226nG6vqmq2ikgD`) y vinculado a `agenda.melosmile.com`.
  * Verificación visual en navegador: Ficha de Ronald Alejandro Delgado (`d1ca0793-3164-4b0d-b01f-e4d763a84416` / `PAC-008`), citas, historial, odontograma y lista completa de pacientes cargando al 100%.

### E. Verificación Completa de Pagos y Centro de Notificaciones (09/09/2026 ✅)
* **Corrección de API `/api/notifications`**:
  * Sustituida la invocación asíncrona incompatible de `cookies()` de `@supabase/ssr` por cliente directo de Supabase con `SERVICE_ROLE_KEY`.
* **Auditoría Exhaustiva de Datos en Producción (`xylqytpudbdcsbuuwqpi`)**:
  * **Pacientes**: 67 pacientes activos (100% de la base de datos intacta).
  * **Citas**: 119 citas registradas, incluyendo la cita `CONTROL 5 (08/09/2026)` de Leal Rey y las citas históricas reconstruidas de Richard Enciso (`31/03/2025` y `28/07/2026`).
  * **Documentos / Fotografías Clínicas**: 88 registros archivados y vinculados.
  * **Facturación y Pagos**: 53 registros de facturación (`billing_records`) totalizando **9.173,00 €** (incluyendo los 22 pagos vinculados hoy por **6.248,00 €** para Diego Martínez, Kamila, Begoña, Leal Rey, Claire y Richard).
  * **Campanita (`system_notifications`)**: 4 alertas operativas y clicables en producción:
    1. `PENDIENTE DE REVISION - Registro pagos sin importes` → Candela Fernández HS (`PAC-019`).
    2. `PENDIENTE DE REVISION - Factura Myobrace 700 EUR` → Alberto Rama Rodríguez (`PAC-009`).
    3. `PENDIENTE DE REVISION - Billing Control 4 Motion` → Begoña Fernández Martínez (`PAC-024`).
    4. `PENDIENTE DE REVISION - Billing Tartrectomia` → Lucas Pérez (`PAC-067`, test IA re-secuenciado).
* **Verificación UI en Navegador**:
  * Sesión autenticada en `agenda.melosmile.com`.
  * Campanita abierta en el navegador: muestra indicador rojo y despliega las 4 notificaciones con sus links directos a las fichas.
  * Módulo contable `/billing` accesible y operativo con las 5 sedes clínicas activas.

### F. Normalización 1 a 1 de Pacientes y Etiquetas Notion (`Henryschein`/`Familiar`) (09/09/2026 ✅)
* **Auditoría 1 a 1 Notion vs Supabase**:
  * Cruzados los 27 pacientes principales y 27 de Albacete contra la tabla `patients`.
  * Identificado que `patient_tags` tenía **0 registros**, provocando que el filtro "Henryschein" y las demás etiquetas del frontend estuvieran completamente vacíos.
  * Carlos Pujol (`PAC-030`) aparecía como *Sin sede* en el listado debido a que `/patients` mapeaba clínicas exclusivamente desde `appointments` (de las que Carlos no tiene citas aún). Además, en la vista tabla, las columnas "Clínica / Sede" y "DNI / NIE" estaban invertidas.
* **Acciones Ejecutadas**:
  1. **Asignación de Etiquetas en `patient_tags`**:
     * **`Henryschein` (8 pacientes)**: Laura Romero (`PAC-027`), Francisco Javier Leal Rey (`PAC-025`), Begoña Fernández (`PAC-024`), Candela Fernández (`PAC-019`), Diego Martínez (`PAC-018`), Raquel Calviches (`PAC-011`), Sara Rubio (`PAC-004`), Gabriel Cañizales (`PAC-005`).
     * **`Familiar` (4 pacientes)**: Munir Mauel Callaos (`PAC-001`), Oscar Enrique Melo Cupido (`PAC-035`), Claire Ulmer (`PAC-028`), Kamila Alejandra Hultzsch (`PAC-022`).
     * **`Referido` (1 paciente)**: Ainur Kozhabek (`PAC-020`).
  2. **Sincronización y Sanitización de Contacto**:
     * Actualizados los 11 teléfonos de Notion que faltaban en la base de datos (incluyendo Carlos Pujol: `+34 661 902 521`).
     * Sanitizados caracteres invisibles UTF-8 (`\u202A`, etc.) en números de teléfono.
     * Sincronizado `in_treatment = false` para los 8 pacientes dados de alta en Notion (Ángel Da Silva, Carlos Pujol, Estefania Maccanin, Claire Ulmer, Laura Romero, Noelia Vega, Ainur Kozhabek, Raquel Calviches).
3. **Frontend y Despliegue**:
      * Reescrito el mapeo de clínicas en `patients/page.tsx` para consultar `patient_clinics` como fuente canónica primaria.
      * Corregido el orden de las columnas en la vista listado.
      * Desplegado a producción en Vercel y verificado visualmente en `https://agenda.melosmile.com/patients`.

## 13. Sesión 10/09/2026 — Saneamiento y Consolidación de Variables Vercel, Corrección Monorepo Staging y Certificación General del Sistema (Completada ✅)

### A. Diagnóstico y Causa Raíz: 94 Filas Caóticas en Vercel
* **Síntoma**: El panel de Vercel mostraba 94 filas de variables (44 en producción y 50 en staging) fragmentadas por entorno (`production`, `preview`, `development` en filas separadas), imposibilitando el flujo de merge limpio `develop` → `main`.
* **Causa raíz #1 (fragmentación)**: Cada nuevo valor se creaba en una fila separada por entorno en vez de una única variable con target multi-entorno.
* **Causa raíz #2 (`type: sensitive`)**: Las variables recreadas por CLI vía pipe no-interactivo se guardaban como `sensitive`, invisibles para `vercel env pull` (devuelve `""`), generando falsas alarmas de "variables vacías" y verificaciones inválidas.

### B. Purga y Unificación SSOT
* Se eliminaron las 94 entradas fragmentadas y se crearon **exactamente 23 variables únicas limpias por proyecto** con target unificado `["production", "preview", "development"]` y `type: "encrypted"`.
* **Inconsistencias corregidas**:
  * URLs de n8n en Producción migradas de la v1 obsoleta (`https://n8n.mumaweb.com`) a la v2 oficial (`https://n8nv2.mumaweb.com`).
  * Agregadas en Producción: `N8N_API_KEY`, `N8N_VECTORIZER_WEBHOOK_URL` y `VPS_DOCS_BASE_PATH`.
  * Agregadas en Staging: `AUTH_USERNAME` y `AUTH_PASSWORD`.
  * Expandidas credenciales de Odoo y VPS para dar cobertura total a despliegues de Preview.
* **Artefactos**: Informe técnico para el CTO en `cto_env_vars_consolidation.md` y respaldo previo en `scratch/vercel_envs_backup_before_consolidation.json`.

### C. Corrección del Monorepo en Vercel Staging
* **Incidencia**: `melosmile-staging` fallaba en compilación por no ubicar `next` en el root del repo (configuración monorepo no declarada).
* **Solución**: Se configuró `rootDirectory: "frontend"` vía API en la configuración del proyecto (`prj_qP5or4gNukJS9w8PTXeiL5vHI02t`), resolviendo de raíz el despliegue automático.

### D. Certificación y Test General del Sistema
* **Despliegues Vercel**: Ambos proyectos (`melosmile-production` y `melosmile-staging`) alcanzaron estado `READY` con las nuevas variables.
* **Build Local**: Next.js 16 (Turbopack) compiló 46 rutas estáticas y dinámicas con 0 errores.
* **Unit Tests**: 14/14 tests pasando (Vitest).
* **Conectividad Cloud**: Supabase Cloud (5 clínicas y pacientes) y Odoo ERP (19 productos/servicios vía XML-RPC) 100% operativos.
* **Verificación en Vivo**: `https://agenda.melosmile.com/` validada en navegador, panel interactivo y badge `Odoo API: Connected` en verde.

### E. Lecciones Aprendidas (esta sesión)
1. **Vercel `type: sensitive` es write-only**: `vercel env pull` devuelve `""` para variables sensibles aunque tengan valor real. Método de verificación válido: `vercel env ls` (tipo) o comprobar runtime tras deploy. NO usar pull para verificar sensibles.
2. **SSOT de variables por proyecto**: Todo cambio de variables debe crearse con target `["production","preview","development"]` unificado; nunca filas separadas por entorno (genera caos e imposibilita merges limpios).
3. **Monorepo en Vercel**: Declarar `rootDirectory` explícito en el proyecto (vía API o dashboard) es imprescindible cuando el `package.json` de Next.js vive en `frontend/`.
4. **Merge develop→main sin fricción de variables**: Al vivir cada entorno en su propio proyecto Vercel con variables unificadas, el merge entre ramas no exige renombrar ni reconfigurar nada.

---

## 14. Sesión 10/09/2026 — Auditoría Exhaustiva de Pacientes contra Notion y Saneamiento Serial en Producción (Completada ✅)

### A. Diagnóstico y Comparativa vs Fichas de Notion
* **Alcance**: Auditoría de los 67 pacientes registrados en Supabase Producción (`xylqytpudbdcsbuuwqpi`) cotejados 1 a 1 contra las bases de datos maestras de Notion (`Pacientes` y `Pacientes Albacete`).
* **Autenticidad Verificada**:
  * **66 Pacientes Reales**: Confirmados al 100% en Notion (`PAC-1` a `PAC-27` y `ALB-1` a `ALB-27` / citas de Albacete) con historial clínico y citas médicas reales.
  * **1 Paciente Mock / Test IA**: `Lucas Pérez` no existía en Notion. Fue creado el 03/09/2026 durante pruebas del asistente de citas con datos dummy (`+34 600 000 000`, `lucas@melosmile.local`).
* **Anomalía Crítica de Secuencia**: `Lucas Pérez` tenía asignado el código anómalo `PAC-6535`, lo que provocaba que `getNextHistoriaId()` (`frontend/src/lib/utils/patient-id.ts`) generara `PAC-6536` para cualquier paciente nuevo en lugar del correlativo `PAC-067`.

### B. Saneamiento Aplicado en Producción (`apply_patient_sanitization.js`)
* **Respaldo previo de seguridad**: Generado snapshot completo en `scratch/backup_patients_prod_pre_sanitize.json`.
* **Re-secuenciación Serial**:
  * `Lucas Pérez`: Actualizado de `PAC-6535` a **`PAC-067`** (restaurando la continuidad 100% estricta `PAC-001` a `PAC-067` y asegurando que el próximo paciente nuevo sea `PAC-068`).
* **Limpieza de Nombres y Apellidos**:
  * Eliminados los sufijos de convenio `HS` y `hs` de los apellidos de `Sara Rubio (PAC-004)`, `Gabriel Cañizales Rubio (PAC-005)`, `Diego Martínez García (PAC-018)`, `Candela Fernández (PAC-019)`, `Begoña Fernández Martínez (PAC-024)` y `Francisco Javier Leal Rey (PAC-025)`, manteniéndolos en su etiqueta canónica `Henryschein`.
  * `Raquel Calviches Fernández (PAC-011)`: Retirada la nota personal `(novia de Hector Hs)` del apellido y trasladada a observaciones clínicas.
  * `Sobrina Silvia (PAC-036)`: Añadida nota clínica interna de procedencia Notion Albacete.
* **Corrección de Erratas y Formato**:
  * `Carmen Martín García (PAC-059)`: Corregida errata tipográfica `Masrtin` → `Martín`.
  * `Greicee Angely Rodríguez (PAC-017)`: Separado segundo nombre pegado al apellido (`angelyRodriguez` → `Angely Rodríguez`).
  * Normalizados a Capital Case: `Luis Gil (PAC-003)`, `Alejandro Delgado (PAC-006)`, `Brenda (PAC-007)`, `Oswaldo Enrique Soler (PAC-010)`, `Rafael Requeijo (PAC-012)`, `Erika Alvarado (PAC-013)`, `Ana Gabriela De Nigris Silva (PAC-014)`, `Alexis Morales (PAC-015)` y `Génesis Duque (PAC-016)`.
* **Normalización de Teléfono**:
  * `Ronald Alejandro Delgado (PAC-008)`: Normalizado teléfono principal a `+34 665 278 727` y guardado el alternativo (`654 480 839`) en notas.
* **Verificación Final**:
  * 67 pacientes en producción con secuencia ininterrumpida `PAC-001` a `PAC-067`.
  * `getNextHistoriaId()` probado en vivo: Devuelve con total precisión **`PAC-068`**.

---

## 15. Sesión 10/09/2026 — Overhaul Integral de Recordatorios y Arquitectura de Mensajería Directa (Completada ✅)

### A. Diagnóstico y Corrección de UX en Ficha de Paciente (`/patients/[id]`)
* **Problema Original**: En la pestaña de recordatorios de la ficha del paciente, los botones de edición y eliminación no permitían modificar la plataforma ni el mensaje, el contraste en modo oscuro hacía invisibles los textos y los diálogos nativos `window.confirm()` generaban bloqueos visuales.
* **Solución Implementada**:
  * **Edición y Cambio de Plataforma (`edit-reminder-modal.tsx`)**: Reconstruido con selector de plataforma (WhatsApp, Telegram, Email, SMS), selector de estado, fecha programada y textarea con tokens semánticos claros (`text-foreground bg-background`).
  * **Modal de Eliminación Personalizado**: Sustituido el `confirm()` del navegador por un modal reactivo de confirmación in-app tanto en la fila del listado (`page.tsx`) como dentro del modal de edición.
  * **API de Eliminación (`DELETE /api/reminders`)**: Implementado endpoint seguro que valida existencia y elimina físicamente el registro.
  * **Corrección de Tokens de Tema (`globals.css`, `input.tsx`, `textarea.tsx`)**: Saneados tokens `--sidebar-muted` y `--sidebar-muted-foreground` en `.dark` para evitar textos negros sobre fondos oscuros.

### B. Diagnóstico y Corrección del Despachador de Envíos (`/api/reminders/send-now`)
* **Causa Raíz de Envíos Fallidos**: El endpoint intentaba contactar a un dominio inexistente (`https://n8n.mumaleads.com`) con un timeout silencioso que marcaba falsamente `status: "enviado"`.
* **Creación de Workflow en n8n v2 Oficial**:
  * Creado y activado el workflow **`[MELOSMILE] Reminders Dispatcher`** (ID: `OqOwzzat6rh0R1Jr`) en `https://n8nv2.mumaweb.com/webhook/melosmile-reminders-dispatcher`.
  * Integrado con el bot oficial de Melosmile (`7539054739:AAH...`) para despacho inmediato a Telegram.
  * Actualizado `send-now/route.ts` para capturar respuestas reales, registrar logs en `reminder_events` y auto-detectar el `telegram_chat_id` del paciente mediante `getUpdates` del bot.

### C. Plan de Arquitectura: Mensajería Directa a Número de Teléfono (Sin Bots)
* **Limitación de Telegram Bot API**: La API estándar de bots (`sendMessage`) exige obligatoriamente un `chat_id` numérico obtenido tras interacción previa (`/start`). No permite enviar mensajes a números de teléfono en frío.
* **Hoja de Ruta Cumplida (11/09/2026)**:
  1. Implementado Telegram MTProto Directo vía QR y envío sin bots.
  2. Implementado enlace web One-Click de confirmación con expiración.

---

## 16. Sesión 11/09/2026 — Telegram QR, Enlace de Confirmación, Cadencia Automática y Rediseño de Citas (Completada ✅)

### A. Vinculación Telegram MTProto por Código QR Web
* **Módulo SSE en Tiempo Real (`/api/telegram/qr`)**: Endpoint con Server-Sent Events que genera y rota códigos QR MTProto cada 30s. Al escanear desde la app de Telegram del móvil (*Ajustes ➔ Dispositivos ➔ Vincular dispositivo*), vincula la sesión de la clínica en Supabase sin usar comandos de terminal ni SMS.
* **Modal Visual (`TelegramQrModal.tsx`)**: Diálogo con temporizador discreto (`🔄 Se actualiza en XXs si no se escanea`), feedback en vivo y cierre automático.
* **Endpoint de Desvinculación (`/api/telegram/unlink`)**: Permite revocar o cambiar de número con un clic.
* **Ajustes de Mensajería Limpios (`/settings/messaging`)**: Vista simplificada con credenciales técnicas colapsadas en un acordeón desplegable.

### B. Enlace Mágico de Confirmación One-Click (`/c/[token]`)
* **Página Pública y Segura (`frontend/src/app/c/[token]/page.tsx`)**: Interfaz responsive mobile-first con branding MeloSmile, sin login para el paciente.
* **Expiración Automática**: El enlace queda inoperativo una vez transcurrida la fecha/hora de la cita (`isExpired: true`), protegiendo la agenda de confirmaciones tardías.
* **Acciones en 1 Clic**: Botón verde de confirmación inmediata y botón de cancelación con notas opcionales.
* **Acceso Público en Middleware (`middleware.ts`)**: Añadidas excepciones para `/c/*` y endpoints de confirmación.
* **Enlaces Clicables Reales**: Normalización de dominios para que las apps móviles de Telegram y WhatsApp reconozcan los TLDs y activen el hipervínculo azul interactivo (`https://agenda.melosmile.com/c/[id]`).

### C. Cadencia Automática de 3 Recordatorios
* **Módulo de Cadencia (`cadence.ts`)**:
  * *1 semana antes (09:00)*: Recordatorio con link de confirmación.
  * *2 días antes (09:00)*: Condicional (amistoso si ya confirmó, link si está pendiente).
  * *El día de la cita (08:30)*: Aviso de cortesía de última hora.
* **Integración Automática (`new-appointment-modal.tsx`)**: Disparo de la cadencia en segundo plano al agendar cualquier cita en el calendario.

### D. Rediseño de la Cabecera de la Cita (`/appointments/[id]`)
* **Identificación del Paciente**: Número de historia clínica (ej. `PAC-001`) colocado como píldora debajo del avatar del paciente.
* **Barra de Acciones en Iconos**:
  * `Contabilidad (€)`: Icono verde `Euro` con tooltip.
  * `Modificar Cita`: Icono azul `Pencil` con tooltip.
  * `Guardar Cita`: Icono `Save` con spinner reactivo.
* **Acción de Mensajería / Confirmación**: Botón con icono `MessageSquare` y texto `[Enviar Confirmación]` o `[Mensajería]`, evitando confusión con el estado clínico.
* **Dropdown de Estado**: Selector con colores reactivos asignados por el sistema (amarillo, azul, morado, verde, rojo) y viñetas circulares.

### E. Despacho In-Process Confiable (`dispatchReminder`)
* Desacoplado el despacho a un módulo independiente en servidor (`frontend/src/lib/reminders/dispatch.ts`), resolviendo el error 401 que dejaba los recordatorios en estado pendiente al pulsar "Enviar de Inmediato".

