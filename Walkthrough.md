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
* Sincronizar la base de datos de pruebas local (Supabase) con la de Producción/Develop en Cloud para asegurar que los pacientes (ej. Munir) estén importados.
