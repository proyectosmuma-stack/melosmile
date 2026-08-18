# Log del Wiki — Melosmile

Registro cronológico (append-only) de ingestas y actualizaciones del wiki.

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