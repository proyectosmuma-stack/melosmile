## 🧩 ESTADO_PROYECTO.md - Melosmile

> ⚠️ **REGLA DE RAMAS**: Trabajo en rama `develop`. Nunca fusionar este archivo a `main`.
> **Última actualización**: 2026-08-18 (sesión de sincronización de BD)

---

### ✅ Objetivo Actual
**PLAN 2 — Migración y sincronización de base de datos: Local ← Cloud (COMPLETADO ✅)**

Hacer que el Supabase Local sea un **espejo exacto de Cloud staging** (`melosmile-staging-git-develop-proyectosmuma-stacks-projects.vercel.app`), garantizando:
- Paciente **Munir Mauel Callaos Cardama (PAC-001)** presente en ambos entornos con el mismo ID.
- IDs de clínicas/profesionales alineados 100% (el código de `billing/extract` depende del ID de Osly `d7e5e2bb`).
- Integridad referencial total (0 FKs rotas).
- Que `supabase db reset` funcione de principio a fin sin errores.

**Queda pendiente PLAN 1 — n8n**: reemplazar URL obsoleta `frontend-eight-dusky-42.vercel.app` → `melosmile-staging-git-develop-proyectosmuma-stacks-projects.vercel.app` en los flujos n8n.

---

### 📁 Archivos Modificados/Relevantes

**Corregidos en esta sesión:**
- `supabase/migrations/20260816000001_add_is_active_to_patients_clinics.sql` — **BUG CRÍTICO FIXEADO**: el down migration estaba SIN comentar (`ALTER TABLE ... DROP COLUMN is_active`), así que Supabase ejecutaba ADD + DROP inmediato → la columna nunca quedaba creada → `db reset` fallaba en seed con `SQLSTATE 42703`.
- `supabase/seed.sql` — exportado desde Cloud (IDs reales de producción), recargado tras TRUNCATE.
- `Walkthrough.md` — sección 4 "Sincronización de BD (Completada ✅)".
- `roadmap.md` — estado actual con fase de sync completada + pendiente n8n.
- `docs/knowledge-base/log.md` — entrada `sync | Sincronización Supabase Local ← Cloud`.

**Relevantes del contexto general (sesiones previas):**
- `frontend/src/app/api/billing/extract/route.ts` — referencia el ID de Osly `d7e5e2bb` (ahora existe en local ✅).
- `frontend/scripts/sync_db.js` — protocolo `db:sync`: export → reset → agent_learnings.
- `frontend/scripts/export_remote_data.js` — exporta 23 tablas de cloud; service key + DNS override (`172.64.149.246`) hardcodeados.
- `frontend/scripts/seed-munir-real.js` — seed de Munir a cloud (upsert por nombre).
- `middleware.ts` — excepción de seguridad n8n con header `x-api-key: melosmile_internal_n8n_key_2026`.
- `.mcp.json` — solo MCP codegraph (NO hay MCP de n8n configurado).
- `~/.config/opencode/opencode.jsonc` — providers: ollama (11435), mlx (18080).

---

### 🛠 Decisiones Tomadas

1. **Cloud staging = fuente de verdad** (decisión del usuario: "Sync completo cloud → local").
2. **Bug 1 (migración rota):** comentar el down migration en `20260816000001` → la columna `is_active` ahora se crea correctamente y el reset+seed completan sin errores.
3. **Bug 2 (IDs divergentes):** la migración `20260722000005` siembra clínicas/profesionales con `gen_random_uuid()` + `ON CONFLICT (name) DO NOTHING` → el seed de cloud no puede sobrescribir IDs → **Fix operativo**: `TRUNCATE ... CASCADE` de tablas de datos + recarga de `supabase/seed.sql`.
4. **Lección KB**: nunca dejar SQL de down migration descomentado en archivos de migración Supabase (registrado en `docs/knowledge-base/log.md`).
5. **Gestión de RAM (18GB)**: contenedores auxiliares Supabase se detienen/arrancan según necesidad; agentes locales (ollama/mlx) se ejecutan SOLO en secuencial (paralelo = OOM `signal: killed`).
6. **Modelos de agentes (2026-08-18)**: `gemini-3.1-pro-preview` → SIEMPRE vía `openrouter/` (sin cuota free tier); `gemini-3.6-flash` → free tier OK; `gemini-2.5-*` DEPRECADOS, nunca usar. Ver `docs/knowledge-base/domains/agent-team.md`.

---

### 🚀 Próximos Pasos Pendientes

1. **PLAN 1 (n8n) — PENDIENTE**: Reemplazar en los flujos n8n (`[MELOSMILE] AI Dispatcher`, agendamiento/clínica) la URL `https://frontend-eight-dusky-42.vercel.app` por `https://melosmile-staging-git-develop-proyectosmuma-stacks-projects.vercel.app`. Nota: 0 ocurrencias en `frontend/src`; no hay MCP de n8n en `.mcp.json` (revisar acceso: n8n.mumaweb.com dev / n8nv2.mumaweb.com prod).
2. **Decisión de diseño pendiente (preguntar al usuario)**: ¿eliminar el seed de la migración `20260722000005` para que `supabase db reset` sea limpio en 1 solo paso (sin TRUNCATE manual)?
3. Verificar sincronización con n8n: que los agentes consulten local (3028) y cloud correctamente.
4. Considerar commit de los cambios (migración fix + seed + docs).

---

### 📊 Estado de la BD Local (verificado 2026-08-18, espejo de cloud)

| Entidad | Local | Cloud | ¿OK? |
|---|---|---|---|
| Clínicas (Goya `056bfb44`, RyA `0da2b67b`, Las Rozas `7c82ad1e`, D. Bustamante `59d7b4f4`) | 4 | 4 | ✅ |
| Profesionales (Osly `d7e5e2bb`, Norelys `a07e1bcf`, Shirley `c8c5b405`, Asencio `3056e04c`) | 4 | 4 | ✅ |
| Tratamientos / Tags / patient_clinics / prof_clinics / tcp | 53 / 6 / 2 / 4 / 2 | 53 / 6 / 2 / 4 / 2 | ✅ |
| Munir PAC-001 (`cff20455`, is_active=true) | ✅ | ✅ | ✅ |
| FKs rotas | **0** | — | ✅ |
| App (3028) / Supabase (54321) | 200 / 200 | — | ✅ |