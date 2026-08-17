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