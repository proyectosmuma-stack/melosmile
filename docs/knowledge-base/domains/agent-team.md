# Equipo MumaBot Cloud Pro

> Página de dominio — wiki Karpathy. Fuente de verdad del equipo de agentes OpenCode para Melosmile.
> Última actualización: 2026-08-18.

## Resumen

Equipo mixto (cloud + local) orquestado por **MumaBot Cloud Pro**. El orquestador NO genera código: analiza, planifica, delega y valida. Las definiciones viven en `~/.config/opencode/agents/*.md`.

## Composición

| Agente | Modelo | Modo | Especialidad |
|--------|--------|------|--------------|
| `mumabot-cloud-pro` | `opencode/deepseek-v4-flash-free` | primary | Orquestador: plan, delegación, validación |
| `mumabot-architect` | `openrouter/google/gemini-3.1-pro-preview` | subagent | Arquitectura, ERD, contratos API |
| `mumabot-coder-cloud` | `google/gemini-3.6-flash` | subagent | Código público, algoritmos, tests |
| `mumabot-designer` | `google/gemini-3.6-flash` | subagent | UI/UX premium, CSS, HTML, animaciones |
| `mumabot-coder-local` | `ollama/llama3.1:8b` | subagent | 🔒 .env, API keys, secretos (100% offline) |
| `mumabot-reviewer` | `ollama/llama3.1:8b` | subagent | Auditoría final local (lint, seguridad, formato) |

## Flujo de orquestación

1. **Fase 0 — Contexto**: `codegraph_query` / `codegraph_structure` / `ls` antes de actuar.
2. **Plan**: descomponer la solicitud con asignación explícita por agente.
3. **Delegación**: `task(agent=..., prompt=...)` — un agente por especialidad.
4. **Seguridad**: credenciales/.env SIEMPRE a `mumabot-coder-local`; código público a cloud.
5. **Auditoría obligatoria**: `mumabot-reviewer` → `docs/audit-report.md`.
6. **Informe final** al usuario con archivos creados y estado.

## Reglas de modelos (CRÍTICO — aprender del incidente)

| Modelo | Estado | Uso |
|--------|--------|-----|
| `google/gemini-2.5-pro` / `gemini-2.5-flash` | ❌ DEPRECADOS (ago 2026) | NUNCA usar — causa del incidente |
| `google/gemini-3.6-flash` | ✅ Free tier OK | coder-cloud, designer |
| `openrouter/google/gemini-3.1-pro-preview` | ✅ vía OpenRouter | architect (NO en free tier de Google, quota 0) |
| `ollama/llama3.1:8b` | ✅ Local | coder-local + reviewer (tool calling nativo CONSISTENTE) |
| `ollama/mistral-nemo:12b` | ❌ INCONSISTENTE (1/5 tool calls) | NO usar — a veces JSON en texto o alucina |
| `ollama/qwen3.7-agents:4b-q8` | ⚠️ Retirado (falló 2x en deploy) | sustituido por llama3.1:8b |
| `ollama/qwen3.5:9b` | ⚠️ Retirado (más lento) | sustituido por llama3.1:8b |
| `ollama/deepseek-coder-v2:16b` | ❌ No soporta tools en Ollama | NO usar como agente |
| `mlx/qwen3-4b-q8` | ❌ Zombie (18080) + sin ventaja | NO usar |

**Verificación previa**: `opencode models | grep google/gemini-3` antes de asignar un modelo cloud.
**Cacheo**: los cambios en `~/.config/opencode/agents/*.md` se cachean al arrancar — requieren **reiniciar opencode**.

## Referencias cruzadas

- [Incidente 2026-08-18](decisions/incidente-2026-08-18-subagentes-vacios.md)
- ADR "MumaBot Agent Team" (grafo codebase-memory)
- `~/.config/opencode/context.md` (memoria del sistema de agentes)