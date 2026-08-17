# Wiki de Conocimiento — Melosmile (Protocolo Karpathy)

> **Qué es**: capa de conocimiento compilado y persistente. Los agentes LEEN este wiki primero (vía `index.md`) en lugar de re-derivar todo desde los archivos fuente en cada sesión. El LLM lo mantiene; el humano lo consulta.
> **Mantenimiento**: cada cambio relevante actualiza las páginas afectadas + `log.md`. Nunca placeholders. Contradicciones → marcar PENDING y escalar.

## Índice de páginas

### Equipo de agentes
- [Equipo MumaBot Cloud Pro](domains/agent-team.md) — orquestador + 5 subagentes: modelos, especialidades, rutado, reglas de seguridad.
- [Incidente 2026-08-18: subagentes vacíos](decisions/incidente-2026-08-18-subagentes-vacios.md) — causa raíz (modelos deprecados), corrección aplicada, lecciones.

### Convenciones y procesos
- Ver `context.md` (raíz) para estado técnico completo del proyecto.
- Ver `.agents/AGENTS.md` para reglas de negocio y comandos de sesión.
- Ver `docs/audit-report.md` para el último informe de auditoría del reviewer.

---

## Cómo mantener este wiki (reglas Karpathy)

1. **Lee `index.md` primero** antes de investigar cualquier tema del proyecto.
2. **Actualiza la página afectada** al descubrir algo nuevo (no crees duplicados).
3. **Registra en `log.md`** cada ingesta/actualización (formato `## [AAAA-MM-DD] accion | tema`).
4. **Sin placeholders**: si no puedes completar una página, no la crees a medias.
5. **Contradicciones**: documenta ambas posturas, marca `PENDING`, escala al humano.
6. **Respuestas valiosas se archivan** de vuelta al wiki (las exploraciones se acumulan).