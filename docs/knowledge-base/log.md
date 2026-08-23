# Log del Wiki — Melosmile

Registro cronológico (append-only) de ingestas y actualizaciones del wiki.

## [2026-08-22] fix | Citas IA fantasma: parse form-urlencoded, timezone Madrid y cascade delete
- **Síntoma**: Musly respondía "cita agendada con éxito" pero NUNCA se creaba la cita (reproducido 2x: petición real del usuario 14:25 UTC y E2E del orquestador).
- **Causa raíz (API)**: los `toolHttpRequest` de n8n (`specifyBody:keypair` sin contentType explícito) envían POST **form-urlencoded**, pero las rutas API hacían `req.json().catch(()=>({}))` → body vacío → 400 → el LLM alucinaba el éxito.
- **Fixes desplegados en staging** (commits `7f5ddf6`, `31c0b87`, `4bb0f66`):
  1. Nuevo helper `frontend/src/lib/utils/parse-body.ts`: acepta JSON **y** urlencoded en `appointments/update`, `ai/memory/learn`, `billing/reminders`. Verificado: POST form crea cita OK.
  2. `appointments/list`: el `.or("patients.first_name.ilike...")` sobre recurso embebido da 500 en PostgREST → resolución en 2 pasos (patients → `.in("patient_id", ids)`). Verificado: `?q=Munir` ya no falla.
  3. `date-parser.ts`: horas naturales se interpretan en **Europe/Madrid** (13:00 Madrid → 11:00Z verano; DST-safe con doble pasada Intl). ISO con zona explícita intacto. Verificado.
  4. Delete de citas: FK violation con `billing_records` (el alta crea registro Pendiente) → cascade delete de billing_records con `status='Pendiente'` + bloqueo 409 si hay 'Aprobado'/'Facturado Odoo'. OJO: `billed_at` es columna de `appointments`, NO de billing_records (el enum correcto es Pendiente/Aprobado/Facturado Odoo, ver migración 20260722000000). Verificado: delete OK en staging.
- **Topología Vercel real** (ver `infra-vercel.md`): `melosmile-staging` sirve `melosmile-staging-git-develop-*.vercel.app` + `frontend-eight-dusky-42`; **`agenda.melosmile.com` = proyecto `melosmile-production`** (código ~4d atrás, SIN estos fixes; su API exige sesión, no acepta x-api-key de staging). Deploy CLI + push a develop NO actualiza el dominio git-develop automáticamente: hacer `vercel alias set <deployment-url> melosmile-staging-git-develop-proyectosmuma-stacks-projects.vercel.app` tras cada deploy.
- **BLOQUEANTE PENDIENTE (n8n)**: los logs de runtime de staging muestran que durante una cita E2E llegan los `GET /api/appointments/list` pero el `POST /api/appointments/update` de creación **nunca llega** → el flujo vivo en `n8n.mumaweb.com` tiene URLs derivadas (las copias de n8nv2 apuntan a `agenda.melosmile.com`). Falta acceso API a esa instancia (env-writer local colgó 3x) o edición manual de nodos para unificar todas las URLs de tools al dominio git-develop de staging. La verdad-absoluta del agente (no reportar éxito si el tool devuelve error) sigue pendiente en los prompts de n8n.

## [2026-08-18] n8n | PLAN 3 completado: fix autenticación n8n ↔ Vercel staging
- **Diagnóstico**: tras el cambio de URL (PLAN 1), los 4 sub-agentes n8n llamaban a staging Vercel **sin `x-api-key`** → todos los endpoints devolvían 401 (`{"error":"No autorizado..."}` del middleware).
- **Causa raíz doble**:
  1. Los nodos `toolHttpRequest` de los flujos no enviaban header `x-api-key` (headers `[]`, credentials `{}`).
  2. El middleware con lógica `x-api-key` (commit `4e00c76`) NO estaba desplegado en Vercel staging: los commits locales no estaban en `origin/develop` (branch 4 commits ahead).
- **Fix aplicado**:
  - Añadido `headerParameters: x-api-key: melosmile_internal_n8n_key_2026` a **11 nodos** toolHttpRequest (Agendamiento 6, Clínico 2, Contabilidad 1, General 2) y desplegado vía API n8n (`PUT /api/v1/workflows/{id}`, payload filtrado sin `meta`/`nodeGroups`/`binaryMode`).
  - Push a `origin/develop` (`d196eb5..4a0366c` + `4a0366c..014e9a2`) → redeploy Vercel automático.
  - Creado endpoint **`POST /api/billing/reminders`** para el tool `Tool_Reminders_Dispatcher` de Contabilidad (apuntaba a ruta inexistente → 404). Acepta `invoiceId` (resuelve paciente vía billing_records→appointments) o `patientId`. Enums correctos: `channel` default `email` (`email|telegram|web|sms`), `reminder_type` default `pago_pendiente`.
- **Verificación final (PASS)**: endpoints staging 200 con key / 401 sin key; endpoint nuevo probado en local (3028) y staging.
- **Bug pre-existente detectado**: `frontend/src/app/api/reminders/create/route.ts` usa default `channel: "whatsapp"` que NO existe en el enum `reminder_channel` → falla al crear reminder sin channel explícito. Pendiente fix a `email`.
- **Lección**: el deploy de Vercel staging usa `origin/develop`, no el develop local. Si los commits no están pusheados, Vercel despliega una versión antigua — verificar `git rev-list --left-right --count origin/develop...develop` (ahead) antes de confiar en staging.
- **Limitación del reviewer**: `mumabot-reviewer` (llama3.1:8b) alucinó un script Grokscript inexistente al auditar los flujos JSON → la auditoría se completó manualmente por el orquestador con `python3` (PASS). Registrar en agent-team.md.

## [2026-08-18] update | Equipo MumaBot + incidente
- Creado `docs/knowledge-base/` con `index.md`, `log.md`, `domains/agent-team.md`, `decisions/incidente-2026-08-18-subagentes-vacios.md`.
- Motivación: incidente de subagentes vacíos (modelos Gemini 2.5 deprecados) — compilar el conocimiento del equipo para que no se repita.
- Test de configuración ejecutado: coder-cloud ✅, designer ✅, architect ❌ (gemini-3.1-pro sin cuota free tier) → corregido a `openrouter/google/gemini-3.1-pro-preview` y verificado vía API directa (respuesta OK).
- ADR "MumaBot Agent Team" registrado en el grafo (codebase-memory).
- Lección y decisión guardadas en RAG (Supabase local): lessons=1, decisions=1.

## [2026-08-18] test | Re-test completo del equipo MumaBot
- Re-ejecutado el test de verificación de los 5 subagentes (no destructivo, solo respuestas): architect ✅ (gemini-3.1-pro vía OpenRouter), coder-cloud ✅, designer ✅, coder-local ✅, reviewer ⚠️→✅ (1º vacío por OOM local).
- Nuevo hallazgo registrado en el incidente: `llama-server process has terminated: signal: killed` al lanzar modelos locales en paralelo (RAM 18GB al límite). Mitigación: agentes locales en solitario/secuencial, cloud en paralelo.

## [2026-08-18] test | Verificación de los 3 agentes locales (primary)
- `mumabot-local` y `mumabot-local-pro` usan `ollama/qwen3.7-agents:4b-q8` (proxy 11435) → ✅ responde y hace tool calls. Nota: es modelo "thinking", requiere `max_tokens` amplio (500+) o responde cortado con `finish: length`.
- `mumabot-local-flash` usa `mlx/qwen3-4b-q8` (llama-server 18080) → ✅ responde y hace tool calls.
- Todos los modelos locales operativos. Sin cambios de configuración.

## [2026-08-18] audit | Revisión de la documentación generada
- Auditoría ejecutada (reviewer + verificación manual del orquestador): ✅ PASS en credenciales (0 expuestas), rutas absolutas (0), formato log.md correcto, coherencia de modelos entre `agent-team.md` e `incidente-...md`.
- El subagente `mumabot-reviewer` reportó limitación de acceso a archivos (no pudo leer los .md) → la verificación de contenido se completó manualmente por el orquestador con grep.

## [2026-08-18] sync | Sincronización Supabase Local ← Cloud (completada)
- Diagnóstico previo: IDs de clínicas/profesionales divergentes entre local y cloud; `professional_clinics` vacío en local; Osly Melo con ID distinto (`748cdaf6` local vs `d7e5e2bb` cloud).
- Decisión del usuario: **sync completo cloud → local** (cloud staging = fuente de verdad).
- **Bug encontrado y corregido**: la migración `20260816000001_add_is_active_to_patients_clinics.sql` tenía el SQL de *down migration sin comentar* (`ALTER TABLE ... DROP COLUMN is_active`), así que Supabase ejecutaba ADD + DROP inmediatamente → la columna nunca quedaba creada y `supabase db reset` fallaba siempre en el seed con `SQLSTATE 42703`. Fix: comentar el down migration.
- **Bug secundario**: la migración `20260722000005_treatments_and_clinic_rules.sql` siembra clínicas/profesionales con `gen_random_uuid()` y `ON CONFLICT (name) DO NOTHING` → el seed de cloud (IDs reales) no podía sobrescribirlos → IDs locales ≠ cloud tras reset. Fix operativo: `TRUNCATE ... CASCADE` de tablas de datos + recarga de `supabase/seed.sql`.
- Resultado: local es espejo exacto de cloud (IDs coinciden 100%, FKs íntegras: 0 rotas). Munir PAC-001 `cff20455` en ambas, is_active=true. App 200 + Supabase 200.
- Lección: nunca dejar el SQL de down migration descomentado en un archivo de migración de Supabase.

## [2026-08-18] n8n | PLAN 1 completado: URL staging en flujos n8n
- Reemplazada URL obsoleta `frontend-eight-dusky-42.vercel.app` → `melosmile-staging-git-develop-proyectosmuma-stacks-projects.vercel.app` en los 4 sub-agentes (Agendamiento 12, Clínico 4, Contabilidad 2, General 4). Deploy vía API pública n8n (`PUT /api/v1/workflows/{id}`) verificado: 0 obsoletas, todos activos.
- **Detalle técnico**: la API pública n8n rechaza los campos `meta`, `nodeGroups`, `authors` y `settings.binaryMode` del export UI (`400 request/body/settings must NOT have additional properties`). Fix: filtrar el payload a `{name, nodes, connections, settings}` sin `binaryMode`.
- **Lección de fiabilidad**: el subagente `mumabot-coder-local` (qwen3.7-agents:4b-q8) falló 2 veces en tareas de deploy (alucinó respuestas 400 sin ejecutar). El orquestador ejecutó el deploy directamente. Benchmark real: MLX (qwen3-4b-q8, 18080) = 4.6 tok/s vs Ollama (qwen3.7-agents:4b-q8, 11435) = 4.3 tok/s → **NO hay ventaja 4x de MLX**; la propuesta de "mumabot-local-flash" quedó descartada con datos.

## [2026-08-18] team | Benchmark de 7 modelos locales + cambio de agentes
- **Benchmark uniforme** (warmup + velocidad caliente + tool calling nativo + calidad código) sobre los modelos propuestos:
  - `qwen2.5-coder:14b` → 12.0 tok/s, calidad 4/4, ❌ tool calling devuelve esquema como texto → descartado.
  - `qwen2.5-coder:7b` → 22.4 tok/s, calidad 4/4, ⚠️ tool calling en texto (parseable) → útil para código.
  - `deepseek-coder-v2:16b` → 42.3 tok/s, calidad 4/4, ❌ **NO soporta tools en Ollama** (`does not support tools`, HTTP 400) → descartado como agente.
  - `mistral-nemo:12b` → 15.2 tok/s, calidad 3/4, ✅ **tool calling nativo PERFECTO** → nuevo coder-local.
  - `llama3.1:8b` → 22.9 tok/s, calidad 3/4, ✅ **tool calling nativo PERFECTO** → nuevo reviewer.
  - `qwen2.5-coder:1.5b-instruct-q8_0` → 47.2 tok/s, calidad 4/4, ⚠️ tool calling en texto → solo tareas triviales.
  - `nomic-embed-text` → ✅ embeddings 768-dim OK para RAG.
- **Cambios aplicados** en `~/.config/opencode/agents/*.md` y `opencode.jsonc` (registrado `ollama/mistral-nemo:12b` y `ollama/llama3.1:8b` en provider):
  - `mumabot-coder-local`: `qwen3.7-agents:4b-q8` → **`ollama/llama3.1:8b`** (tras prueba de humo)
  - `mumabot-reviewer`: `qwen3.5:9b` → **`ollama/llama3.1:8b`**
- **⚠️ Prueba de humo decisiva (2026-08-18)**: mistral-nemo:12b fue elegido primero para coder-local (benchmark: 1 tool call perfecto), pero al probar vía proxy real 11435 **falló 4/4 veces**: devolvía el JSON de la función como texto plano o alucinaba resultados. llama3.1:8b acertó 1/1 con `tool_calls` nativo (`search_patients(query:"Munir")`, finish_reason: tool_calls). Decisión final: **llama3.1:8b para ambos agentes locales** (más rápido 22.9 vs 15.2 tok/s, menos RAM 4.9 vs 7.1 GB, 100% consistente). mistral-nemo:12b queda RETIRADO del equipo.
- **Lección**: el benchmark aislado (1 muestra) puede ser engañoso; la prueba de humo repetida vía el proxy real (el camino que usa opencode) es la validación definitiva.
- **RAM liberada**: eliminado `llama-server` zombie (MLX 18080, 34.4% RAM, no respondía); detenidos contenedores Supabase en bucle `Restarting` (realtime, analytics, storage_brain_db). Entorno intacto (3028/54321/11435 = 200).
- **PENDIENTE**: reiniciar opencode para que los agentes carguen los nuevos modelos.

## [2026-08-22] fix | Bug canal whatsapp + limpieza seed de prueba
- **Bug fixeado**: `frontend/src/app/api/reminders/create/route.ts` usaba default `channel: "whatsapp"` inexistente en el enum `reminder_channel` (`email|telegram|web|sms`) → 500 al crear reminder sin canal explícito. Default cambiado a `email` y la descripción del evento ahora usa `newReminder.channel`.
- **Contradicción detectada (PENDING, escalada al humano)**: el modal `new-reminder-modal.tsx` ofrece y usa por defecto `whatsapp`, valor que NO existe en el enum de BD → todo recordatorio creado desde la UI con ese canal fallará. Opciones planteadas: sustituir por Telegram en UI vs migración que añada `whatsapp` al enum (local+cloud). El flujo N8N-04 no está exportado en `n8n/melosmile/` así que su soporte de canales no es verificable localmente.
- **Limpieza**: eliminados del `supabase/seed.sql` los 3 reminders + 3 reminder_events de prueba creados en la verificación PLAN 3 ('verificación staging', 'x'). Verificado que la BD local ya no contenía esas filas (0 reminders). La copia en CLOUD sigue pendiente de borrado manual (dashboard Supabase o service key de Vercel).
- **KB**: registradas las limitaciones operativas del equipo (reviewer alucina en auditorías JSON; locales en paralelo → OOM) en `domains/agent-team.md`.

## [2026-08-22] fix | Reset local en 1 paso: seed unificado + enum whatsapp + OOM
- **Migración 005 limpiada**: `supabase/migrations/20260722000005_treatments_and_clinic_rules.sql` quedó solo-DDL (84 líneas); los seeds §7-§10 (families/clinics/professionals/treatments) se movieron a `supabase/seed.sql` (export cloud real: 4 clínicas, 4 profesionales, 53 treatments, 10 familias, 10 reglas, paciente PAC-001 id cff20455-456e-4eb5-9385-b32b65e97d6b). Causa del cambio: el seed viejo usaba `gen_random_uuid() + ON CONFLICT (name) DO NOTHING` y no sobrescribía con los IDs reales.
- **PENDING resuelto**: la migración nueva `20260822000000_add_whatsapp_to_reminder_channel.sql` añade `'whatsapp'` al enum `reminder_channel` (local). Cierra la contradicción escalada hoy mismo por el bug de reminders. PENDIENTE seguir: replicar la migración en CLOUD.
- **Lección operativa**: `supabase db reset` debe ejecutarse DESDE LA RAÍZ del proyecto, nunca con `--workdir supabase` — la CLI deriva el project_id del nombre de carpeta y busca contenedores inexistentes (`supabase_db_supabase` → "supabase start is not running"). El `project_id = "melosmile"` vive en `supabase/config.toml`.
- **Incidente OOM**: la VM Docker (Colima, 1.9 GiB) con dos stacks Supabase simultáneos (melosmile ~745MB + brain_db ~542MB) metía a `supabase_storage_melosmile` en bucle OOM (exit 137, eventos `container oom` en docker events) y abortaba el reset tras aplicar migraciones+seed ("container is not ready"). Decisión del usuario: parar el stack brain_db (9 contenedores, ~540MB liberados; relanzable con su propio supabase start). Tras liberar, `supabase db reset` completa limpio en 1 paso (EXIT_CODE=0) con todo el stack melosmile healthy.
- **Verificado post-reset** (psql local): enum = email|telegram|web|sms|whatsapp; conteos 4/4/53/10/10; PAC-001 is_active=true; 0 huérfanos FK appointments→patients; 0 reminders.

## [2026-08-22] team | Delegaciones obligatorias: 2 éxitos, 2 fallos del equipo local
- **coder-cloud (gemini-3.6-flash)** ✅: validó el SQL, ejecutó `supabase db reset` completo y verificó 5/5 checks con evidencia literal. Corrigió además la invocación correcta de la CLI (desde raíz, sin --workdir).
- **designer (gemini-3.6-flash)** ✅: auditoría UI de canales SIN CAMBIOS NECESARIOS, con análisis línea a línea (modal válido end-to-end con el enum ampliado; fallback morado aceptable para telegram/web).
- **reviewer (llama3.1:8b)** ❌: devolvió resultado truncado sin veredicto (solo inicio de comandos, con typo de ruta). Auditoría completada manualmente por el orquestador → PASS en los 6 checks. Refuerza decisión #12.
- **coder-local (llama3.1:8b)** ❌: ante el push a cloud respondió una "configuración segura de .env" NO solicitada sin tocar ningún archivo real (alucinación pura; .env.local intacto). El push quedó bloqueado además por falta de auth CLI (`supabase whoami` falla; sin SUPABASE_ACCESS_TOKEN).
- **Infra restaurada**: proxy Ollama 11435 estaba caído → puente TCP propio (`python3` socket forwarder en scratch) hacia 11434 nativo; equipo local operativo de nuevo.
- **PENDIENTE (humano)**: aplicar `ALTER TYPE public.reminder_channel ADD VALUE IF NOT EXISTS 'whatsapp';` en Supabase CLOUD vía dashboard SQL Editor, o hacer `supabase login` para habilitar `db push`.

## [2026-08-22] ui | Modo oscuro activado + gotcha crítico de Select en @base-ui/react
- **Modo oscuro**: `layout.tsx` nunca tuvo la clase `dark` en `<html>` (desde commit inicial) y el diseño era dark (`.dark` tokens completos en globals.css). Fix: `className="dark ..."` + `lang="es"`.
- **Tailwind v4**: para que la clase `.dark` dirija la variante `dark:` hace falta `@custom-variant dark (&:where(.dark, .dark *));` y el mapeo `@theme inline { --color-*: hsl(var(--*)) }` (añadido a globals.css; cobertura verificada 32/32 vars). Sin eso los utilitarios semánticos no resuelven.
- **GOTCHA Base UI (documentar para siempre)**: shadcn moderno usa `@base-ui/react`, NO Radix. `<Select.Value/>` solo resuelve etiquetas si `Select.Root` recibe prop `items=[{value,label}]`; si no, con el popup cerrado muestra el VALOR CRUDO (fallback `serializeValue` en `internals/resolveValueLabel.js`). Causó que el selector "Sede Activa" pintara el UUID `59d7b4f4...` al elegir una clínica. Corregidos 13 selects en 5 archivos.
- **Drawer de citas**: resolvía clínica contra `DEFAULT_CLINICS` (IDs hardcodeados "goya"/"albacete") → siempre mostraba la primera. Ahora recibe `clinics` reales desde calendar-view.
- **Facturación multiclinica**: `/api/ai-context` devolvía bien las 4 clínicas; el hub filtraba por el selector global persistido en localStorage. Tras `db reset` esos UUIDs quedaron huérfanos. Fixes: hub ignora el filtro global (vista contable = todas las clínicas) y clinic-context valida el ID persistido contra la BD (huérfano → reset a "all").
- **Equipo**: reviewer (`qwen3.5:9b`) devolvió `task_result` VACÍO otra vez → auditoría manual del orquestador 8/8 PASS (secretos/rutas/markdown limpios, patrón items 13/13, sin bucles, tsc solo errores pre-existentes conocidos). El fallo de output vacío/truncado afecta también al modelo nuevo.

## [2026-08-22] data | Citas demo de Munir PAC-001 sembradas en seed.sql
- Tras el `db reset` el paciente canónico quedó sin citas (nunca estuvieron en el seed; se creaban por UI). Usuario aprobó sembrarlas.
- 3 citas con **fechas relativas a now()** (siempre vigentes tras futuros resets): Realizada hace ~35d en RyA (con billed_at → facturable), Realizada hace ~10d en Goya (billed_at NULL → caso "pendiente de facturar"), Confirmada +5 días hábiles en RyA (guard anti-fin-de-semana).
- UUIDs fijos `00000000-0000-4000-8000-00000000000X` + ON CONFLICT DO NOTHING → idempotente (re-ejecución = INSERT 0 0, verificado).
- Aplicadas a BD local y persistidas en seed.sql (+6 líneas). Verificación independiente del orquestador: 3/3 citas visibles con JOIN a clínicas correcto.

## [2026-08-22] ui | Switch de tema claro/oscuro en Ajustes
- Nuevo componente `frontend/src/components/settings/theme-toggle.tsx`: switch animado Sol/Luna, role="switch" accesible (aria-checked, teclado), tokens semánticos para verse bien en ambos modos.
- Persistencia en localStorage (`melosmile_theme`, default dark) + script inline anti-FOUC en `<head>` del layout (aplica/quita clase dark ANTES del primer paint) + `suppressHydrationWarning` en `<html>`.
- Card "Apariencia" añadida al hub `/settings`. globals.css intacto (el sistema dual ya existía).
- Verificado por orquestador: tsc sin errores nuevos, archivos exactos (2 M + 1 nuevo).
- Fix UX descubierto en validación: el hub /settings era inaccesible desde el menú (el botón Ajustes solo expande). Añadida entrada "General" como primer item del submenú Ajustes.

## [2026-08-22] infra | Diagnóstico y fix de despliegue Vercel staging
- Síntoma: staging con 404s y sin cambios de local. Git OK (develop == origin/develop @ fc541b2); el problema era Vercel, no Git.
- Causas: deploys CLI al proyecto equivocado (doble enlace .vercel: raíz→melosmile-production, frontend/→melosmile-staging), producción 24d obsoleta, DNS develop.mumaweb.com apuntando al VPS IONOS, race condition commit/deploy.
- Fix: redespliegue desde frontend/ a melosmile-staging + alias git-develop reasignado. Verificado por marcador anti-FOUC `melosmile_theme` en HTML servido.
- Nueva página de dominio: domains/infra-vercel.md (arquitectura real, procedimiento correcto, PENDINGs).
- context.md actualizado: sección Staging corregida (proyecto separado, URLs estables, política "siempre staging salvo orden explícita").

## [2026-08-22] infra | Sync BD local↔staging + auditoría n8n + incidente Clean Envelope CLI
- BD sincronizadas por coder-cloud (`ses_fd5b46025ffe9WC8iJBlqKxoqO`): 3 citas demo subidas a cloud staging (upsert idempotente) + 3 reminders/3 reminder_events de prueba purgados. Verificación independiente: 3/3 · 0/0 · 0/0 · 1/1. Drift benigno ai_conversation_history (143 vs 141) intocable.
- Auditoría n8n dev: fallbacks de código OK (dispatcher + document-cleaner → n8n.mumaweb.com). Proyecto Vercel melosmile-staging sin vars N8N_* (usa fallback). Hosts de .env.local/.env.remote aún sin verificar.
- ⚠️ INCIDENTE PROTOCOLO: Clean Envelope vía `opencode run --agent <subagente> --auto` es INOPERANTE — los subagentes no pueden ser primary (fallback al default qwen3.7-agents:4b-q8, ctx 32k) y el prompt inflado llega con 45.651 tokens → overflow garantizado (3 timeouts). Vía alternativa válida: `task()` directo del orquestador al agente local. Además: coder-local devolvió un PLAN sin ejecutar (falso positivo #1) → exigir siempre salida cruda literal.

## [2026-08-22] n8n | Auditoría de Credenciales y Modelos en n8nv2 (Gotcha OpenRouter & Gemini 2.5)
- **Confirmación de Credenciales:** La credencial de OpenRouter (`id: "4nco5fDnIohG6g9f"`, nombre: `"OpenRouter account"`) **está 100% configurada y activa** en `https://n8nv2.mumaweb.com`.
- **Diagnóstico del Fallo de Ejecución (741938):** El error en los nodos `OpenRouter_Chat_Model` del `[MELOSMILE] AI Dispatcher` y subagentes clínicos no es un fallo de autenticación de n8n, sino que el parámetro `model` está configurado con **`google/gemini-2.5-flash`** (modelo deprecado/retirado por Google que devuelve error en OpenRouter API).
- **Acción requerida para el equipo:** Actualizar el nombre del modelo en los nodos `OpenRouter_Chat_Model` en n8n a `google/gemini-3.6-flash` o `google/gemini-3.1-pro-preview` vía OpenRouter.

## [2026-08-23] fix | Cadena de cobros determinista + certificación del sistema básico
- **Cobros E2E OK**: creado helper `[MELOSMILE] Helper - Billing Query` (`AzGmCQ5rd7gvEQ3w`, busca paciente + `/api/billing/pending` en una sola tool-call) tras confirmar que gemini-saltaba el 2º paso ~50%. Verificado contra BD: Munir 4 registros/72€, Laura 1/36€, Sonia 0.
- **API corregida por coder-cloud** (`ses_fd3d52c64ffe8xYHq0UsOjt05h`, desplegada): `billing/pending/route.ts` con join `appointments!inner` (schema real de billing_records no tiene patient_id); `ai-context/route.ts` igual; deploy con `vercel --prod --yes`.
- **Bugs n8n corregidos y documentados** (ver sección 3bis de domains/n8n-workflows.md): conexiones ai_tool invertidas (formato correcto per-tool→agente), toolWorkflow tv1.2→tv1 + workflowId string plano, placeholderDefinitions→$fromAI inline, sendHeaders faltante (401), Tool_Odoo_Invoice eliminado (Odoo bloqueado por decisión del usuario).
- **Fechas relativas**: dispatcher pasaba fecha calculada errónea (2026-08-21 para "el viernes"); ahora pasa texto verbatim y el subagente usa su $now propio. Regla añadida en ambas capas.
- **Cancelación soft**: "anular" borraba físicamente la cita (perdiendo billing_records); Tool_Update_Appointment ahora exige status=Cancelada salvo orden literal de borrado. Verificado: cita queda como `Cancelada` en BD.
- **Rango ISO fechas**: date-parser acepta `YYYY-MM-DD/YYYY-MM-DD` (+tests, coder-cloud ses_fd3efb72effecj1w2W02ieCV1C, en prod). Baterías A(7/7)/B/C certificadas vía Musly.
- ⚠️ CONTRADICCIÓN RESUELTA CON EVIDENCIA: la entrada del 22/08 decía que gemini-2.5-flash estaba deprecado; las ejecuciones E2E de HOY en n8n.mumaweb.com lo confirman OPERATIVO (todas las baterías corrieron sobre él). La nota de sustitución a 3.x aplicaba a n8nv2, no a producción. PENDING escalar al humano si procede unificar modelos entre instancias.
- Limitación conocida: sin memoria conversacional multi-turno (sub-workflows stateless); follow-ups anafóricos fallan. Pendiente: limpieza de datos sim (service-role, delegación local), config ODOO_* (bloqueada por usuario), test interpretación Excel + calculadora.

## [2026-08-23] feature | Memoria conversacional multi-turno dispatcher→subagentes
- Descubierto: los 3 subagentes YA aceptaban `history` en su input (`$json.body?.history || $json.history`) pero el dispatcher nunca lo transmitía (hueco anafórico N11b).
- Fix: regla `TRANSFERENCIA DE CONTEXTO MULTITURNO` en el SM del Dispatcher (`Yv9X1EGUvQg8qErW`): toda invocación a Tool_SubAgent_* debe anteponer bloque `[CONTEXTO PREVIO: <hechos relevantes>]` al parámetro message cuando exista historial.
- Verificado E2E con historial real de cliente: (1) "Cancela LA DE las 11 de la mañana" tras listar citas → canceló la correcta (09:00Z=11:00 España, Tartrectomía) dejando intacta la de 10:30Z; (2) "Y en total cuanto suma?" tras consulta de cobros → resolvió a Laura Gimenez 36€ sin nombrarla.
- Nota test: el widget debe enviar `history:[{role,content},...]` en el body del webhook (ya lo hace el frontend); curl de pruebas ahora lo simula.
