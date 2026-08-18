# 🧩 ESTADO_PROYECTO.md - Melosmile

> ⚠️ **REGLA DE RAMAS**: Trabajo en rama `develop`. Nunca fusionar este archivo a `main`.
> **Última actualización**: 2026-08-18 (PLAN 1 n8n completado + evaluación del equipo MumaBot)
> **Para reiniciar la conversación**: "Lee .opencode/ESTADO_PROYECTO.md y sigamos desde ahí."

---

## ✅ Objetivo Actual

**PLAN 1 — URL staging en flujos n8n: COMPLETADO ✅ (2026-08-18)**
**PLAN 2 — Sincronización BD Local ← Cloud: COMPLETADO ✅ (sesión previa)**

PLAN 1 consistía en reemplazar la URL obsoleta `frontend-eight-dusky-42.vercel.app` (devolvía 404) por `melosmile-staging-git-develop-proyectosmuma-stacks-projects.vercel.app` en los flujos n8n. **Ejecutado y verificado en la instancia n8n** (n8n.mumaweb.com): 4 sub-agentes actualizados, 0 refs obsoletas, 22 refs staging, todos los workflows siguen activos. Dispatcher y Document Cleaner NO usaban esa URL (delegan vía `toolWorkflow` nativo, sin HTTP directo).

**PLAN 3 (pendiente)**: verificar que los agentes n8n consultan local (3028) y cloud correctamente tras el cambio de URL.

---

## 📁 Archivos Modificados/Relevantes

**PLAN 1 (n8n) — editados y desplegados hoy:**
- `n8n/melosmile/02_MELOSMILE_SubAgent_Agendamiento.json` — 12 refs URL → staging (workflow `jTWHg9bHaNOdzL13`)
- `n8n/melosmile/03_MELOSMILE_SubAgent_Clinico.json` — 4 refs URL → staging (workflow `Q7oxrbUuohca81Gn`)
- `n8n/melosmile/04_MELOSMILE_SubAgent_Contabilidad.json` — 2 refs URL → staging (workflow `XSLNwq6ihH1SHPRl`)
- `n8n/melosmile/05_MELOSMILE_SubAgent_General.json` — 4 refs URL → staging (workflow `MIok0ruU7JhpTxWv`)
- `n8n/melosmile/01_MELOSMILE_AI_Dispatcher.json` — SIN cambios (no contenía la URL; IDs sub-agentes: `Yv9X1EGUvQg8qErW`)
- `n8n/melosmile/06_MELOSMILE_Agent_Document_Cleaner.json` — SIN cambios (`OG4Yy4N7qALXojTa`)
- Docs actualizados: `roadmap.md`, `docs/knowledge-base/log.md`, este archivo.
- Nota: existe también `n8n-workflows/melosmile/` (versiones antiguas/pequeñas con la URL obsoleta — NO desplegadas; decidir si eliminar/ignorar).

**PLAN 2 (BD) — sesión previa:**
- `supabase/migrations/20260816000001_add_is_active_to_patients_clinics.sql` — **BUG CRÍTICO FIXEADO**: down migration sin comentar → `db reset` fallaba con `SQLSTATE 42703`.
- `supabase/seed.sql` — exportado desde Cloud (IDs reales), recargado tras TRUNCATE.
- `Walkthrough.md` — sección 4 "Sincronización de BD (Completada ✅)".

**Contexto general relevante:**
- `frontend/src/app/api/billing/extract/route.ts` — depende del ID de Osly `d7e5e2bb` (ahora existe en local ✅).
- `frontend/scripts/sync_db.js` — protocolo `db:sync`: export → reset → agent_learnings.
- `frontend/scripts/export_remote_data.js` — exporta 23 tablas de cloud; service key + DNS override hardcodeados.
- `frontend/scripts/seed-munir-real.js` — seed de Munir a cloud (upsert por nombre).
- `middleware.ts` — excepción de seguridad n8n con header `x-api-key: melosmile_internal_n8n_key_2026`.
- `.mcp.json` — solo MCP codegraph (NO hay MCP de n8n configurado).
- `frontend/.env.local` — contiene `N8N_WEBHOOK_BASE_URL=https://n8n.mumaweb.com` y `N8N_API_KEY` (credencial SENSIBLE, no comitear).
- `~/.config/opencode/opencode.jsonc` — providers: ollama (11435), mlx (18080), google (Gemini), openrouter.
- `~/.config/opencode/agents/` — definiciones de los 9 agentes MumaBot.

---

## 🛠 Decisiones Tomadas

1. **Cloud staging = fuente de verdad** (decisión del usuario: "Sync completo cloud → local").
2. **Bug 1 (migración rota):** comentar el down migration en `20260816000001` → `is_active` se crea y el reset+seed completan.
3. **Bug 2 (IDs divergentes):** `TRUNCATE ... CASCADE` de tablas de datos + recarga de `supabase/seed.sql` (el seed de la migración `20260722000005` usa `gen_random_uuid()` y no deja sobrescribir IDs).
4. **Deploy n8n vía API pública**: la API rechaza `meta`, `nodeGroups`, `authors` y `settings.binaryMode` (`400 request/body/settings must NOT have additional properties`). Fix: filtrar payload a `{name, nodes, connections, settings}` sin `binaryMode` (script `/var/folders/.../opencode/clean_wf.py`, temporal).
5. **FIABILIDAD DEL EQUIPO (nuevo, crítico)**: `mumabot-coder-local` (qwen3.7-agents:4b-q8) **falló 2/2 en el deploy** (alucinó respuestas 400 falsas sin ejecutar). El orquestador ejecutó el deploy directamente con la key sin imprimirla (seguridad intacta). Benchmark real: **MLX 4.6 tok/s ≈ Ollama 4.3 tok/s → descartada la propuesta de "mumabot-local-flash 4x más rápido"** (era falsa). coder-cloud (gemini-3.6-flash) sí fue fiable para edición.
6. **BENCHMARK DE 7 MODELOS LOCALES (2026-08-18)**: probados qwen2.5-coder:14b (12 tok/s, tools roto), qwen2.5-coder:7b (22.4 tok/s, tools en texto), deepseek-coder-v2:16b (**sin tools en Ollama**), mistral-nemo:12b (tools INCONSISTENTE 1/5), llama3.1:8b (**22.9 tok/s, tools 100% consistente**), qwen2.5-coder:1.5b (47 tok/s, tools en texto), nomic-embed (✅ RAG).
7. **MODELOS FINALES DEL EQUIPO (2026-08-18)**: `mumabot-coder-local` → **`ollama/llama3.1:8b`**; `mumabot-reviewer` → **`ollama/llama3.1:8b`** (ambos con tool calling nativo consistente). Registrados en `~/.config/opencode/opencode.jsonc` (provider ollama). **REQUIERE REINICIAR opencode**. Ver `docs/knowledge-base/domains/agent-team.md`.
6. **Gestión de RAM (18GB)**: contenedores Supabase auxiliares se detienen/arrancan según necesidad; agentes locales (ollama/mlx) SOLO en secuencial (paralelo = OOM `signal: killed`).
7. **Modelos de agentes (2026-08-18)**: `gemini-3.1-pro-preview` → SIEMPRE vía `openrouter/` (sin cuota free tier); `gemini-3.6-flash` → free tier OK; `gemini-2.5-*` DEPRECADOS, nunca usar. Ver `docs/knowledge-base/domains/agent-team.md`.

---

## 🚀 Próximos Pasos Pendientes

1. **PLAN 3 — Verificar sincronización n8n ↔ BD**: comprobar que los agentes n8n consultan local (3028) y cloud correctamente tras el cambio de URL.
2. **Decisión de diseño pendiente (preguntar al usuario)**: ¿eliminar el seed de la migración `20260722000005` para que `supabase db reset` sea limpio en 1 solo paso (sin TRUNCATE manual)?
3. **Auditoría del reviewer** sobre los cambios de hoy (flujos n8n + docs) — aún no ejecutada (opcional).
4. Considerar commit de los cambios a `develop` (migración fix + seed + flujos n8n + docs).
5. **Decisión de equipo (2026-08-18, resuelta)**: `mumabot-coder-local` y `mumabot-reviewer` ahora usan `ollama/llama3.1:8b` (tool calling consistente). **Pendiente: reiniciar opencode para cargar los nuevos modelos.**

---

## 📊 Estado de la BD Local (verificado 2026-08-18, espejo de cloud)

| Entidad | Local | Cloud | ¿OK? |
|---|---|---|---|
| Clínicas (Goya `056bfb44`, RyA `0da2b67b`, Las Rozas `7c82ad1e`, D. Bustamante `59d7b4f4`) | 4 | 4 | ✅ |
| Profesionales (Osly `d7e5e2bb`, Norelys `a07e1bcf`, Shirley `c8c5b405`, Asencio `3056e04c`) | 4 | 4 | ✅ |
| Tratamientos / Tags / patient_clinics / prof_clinics / tcp | 53 / 6 / 2 / 4 / 2 | 53 / 6 / 2 / 4 / 2 | ✅ |
| Munir PAC-001 (`cff20455`, is_active=true) | ✅ | ✅ | ✅ |
| FKs rotas | **0** | — | ✅ |
| App (3028) / Supabase (54321) | 200 / 200 | — | ✅ |

---

## 🖥️ Estado del Entorno (2026-08-18)

- App local: `localhost:3028` ✅ | Supabase local: `54321` ✅
- n8n dev: `n8n.mumaweb.com` (86 workflows, 6 MELOSMILE activos) — API key en `frontend/.env.local`
- n8n prod: `n8nv2.mumaweb.com` — rechaza la API key de dev (no tocar sin credencial prod)
- Ollama proxy: `11435` (modelos: qwen3.7-agents:4b-q8, qwen3.5:9b, qwen2.5-coder:7b, etc.)
- MLX/llama-server: `18080` (qwen3-4b-q8) — benchmark: ~4.6 tok/s, sin ventaja sobre Ollama
- Acceso n8n: vía API REST con `X-N8N-API-KEY` (sin MCP n8n configurado)
