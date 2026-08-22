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
