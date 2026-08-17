# Incidente 2026-08-18: Subagentes devolvían vacío

> Decisión/registro — wiki Karpathy.
> Estado: RESUELTO (con acción pendiente: reiniciar opencode).

## Síntoma
`mumabot-architect`, `mumabot-coder-cloud` y `mumabot-designer` devolvían resultados **vacíos** al ser invocados desde el orquestador.

## Causa raíz 1 (original)
Modelos `google/gemini-2.5-pro` y `google/gemini-2.5-flash` **ya no existen** en la API de Google (agosto 2026). Error en log:
```
This model models/gemini-2.5-pro is no longer available to new users.
Please update your code to use models/gemini-3.1-pro-preview
```

## Causa raíz 2 (descubierta en el test del 18-08)
`google/gemini-3.1-pro-preview` tiene **quota 0 en el free tier** de Google:
```
Quota exceeded for metric: generate_content_free_tier_input_token_count, limit: 0, model: gemini-3.1-pro
```
→ El modelo pro SOLO funciona con plan de pago de Google o vía **OpenRouter**.

## Corrección aplicada

| Agente | Antes | Después |
|--------|-------|---------|
| `mumabot-architect` | `google/gemini-2.5-pro` | `openrouter/google/gemini-3.1-pro-preview` |
| `mumabot-coder-cloud` | `google/gemini-2.5-flash` | `google/gemini-3.6-flash` |
| `mumabot-designer` | `google/gemini-2.5-flash` | `google/gemini-3.6-flash` |

Además: `~/.config/opencode/opencode.jsonc` → provider `google` corregido (se eliminaron los modelos 2.5 deprecados y se listaron los vigentes).

## Test de verificación (2026-08-18)
| Agente | Resultado | Nota |
|--------|-----------|------|
| `mumabot-coder-cloud` | ✅ TEST OK | responde con gemini-3.6-flash |
| `mumabot-designer` | ✅ TEST OK | responde con gemini-3.6-flash |
| `mumabot-architect` | ❌ → ✅ | vía Google free tier falla; vía OpenRouter verificado OK por API directa (requiere reiniciar opencode para tomar la ruta openrouter) |

## Lecciones aprendidas
1. **Los agentes se cachean al arrancar opencode** — editar `~/.config/opencode/agents/*.md` no basta en caliente; hay que reiniciar la sesión.
2. **Síntoma "agente vacío" = error de modelo/provider**, no de prompt. Diagnóstico: `grep -E "stream error|AI_APICallError" ~/.local/share/opencode/log/opencode.log | tail -20`.
3. **Verificar modelos vigentes** antes de asignar: `opencode models | grep google/gemini-3`.
4. **Gemini 3.1 Pro NO está en free tier** — usar `openrouter/google/gemini-3.1-pro-preview` o `gemini-3.6-flash` (free tier OK).
5. **Nunca reintroducir gemini-2.5-\*** — están deprecados y fueron la causa raíz.

## Verificación completa del equipo (2026-08-18, re-test no destructivo)

| Agente | Resultado | Nota |
|--------|-----------|------|
| `mumabot-architect` | ✅ TEST OK | responde con gemini-3.1-pro-preview vía OpenRouter (ruta ya cargada) |
| `mumabot-coder-cloud` | ✅ TEST OK | responde con gemini-3.6-flash |
| `mumabot-designer` | ✅ TEST OK | responde con gemini-3.6-flash |
| `mumabot-coder-local` | ✅ TEST OK | responde con qwen3.7-agents:4b-q8 (con reintentos) |
| `mumabot-reviewer` | ⚠️ → ✅ | 1º vacío (OOM); reintento en solitario OK con qwen3.5:9b |

## Nuevo hallazgo (2026-08-18): OOM al lanzar subagentes locales en paralelo
- Error: `AI_APICallError: llama-server process has terminated: signal: killed`.
- Causa: Mac con 18 GB RAM y swap al 90% (9/10 GB); lanzar 5 subagentes a la vez carga 2 modelos locales grandes (qwen3.7-agents 4B + qwen3.5 9B) y el kernel mata el proceso.
- Mitigación: **lanzar agentes locales en solitario o secuencialmente**, nunca en paralelo con otros modelos locales. Los agentes cloud (gemini) pueden ir en paralelo sin problema.
- Lección: el síndrome "agente vacío" también puede deberse a **OOM local**, no solo a modelos deprecados.

## Acción pendiente
- [x] Reiniciar opencode para que `mumabot-architect` cargue la ruta `openrouter/...` — confirmado OK en re-test.
- [x] Re-ejecutar el test de todo el equipo (2026-08-18) — todos responden.