---
name: monitor
description: Inicia la monitorización periódica del equipo de agentes y recursos de máquina cada 5 minutos usando un cron en segundo plano.
---

# /monitor (Inicia Monitorización Periódica)

Cuando el usuario ejecute `/monitor`, diga `"inicia monitoreo"`, `"comienza monitorizacion"` o similar:

### Paso 1: Comprobación de Tareas Activas
- Ejecutar la herramienta `manage_task` con `Action: 'list'`.
- Si ya existe un cron de monitorización activo, notificar al usuario.

### Paso 2: Programación del Cron Periódico (cada 5 minutos)
- Invocar la herramienta `schedule` con los siguientes parámetros:
  - `CronExpression`: `"*/5 * * * *"`
  - `IsDaemon`: `false`
  - `Prompt`: `"Auditoría periódica (cada 5 minutos): Verificar actividad en OpenCode/MumaBot. OBLIGATORIO: Incluir: 1) '👥 Confirmación de Uso de Subagentes', 2) '💻 Diagnóstico de Recursos de Máquina' (RAM, VRAM Ollama, % GPU/CPU, estabilidad del modelo local), 3) '🔍 Calidad de Código y Salud de Servicios'. Mantén un contador de revisiones inactivas."`

### Paso 3: Informe Inicial Instantáneo
- Ejecutar comprobación rápida del sistema:
  ```bash
  git status --short && ollama ps && top -l 1 | head -n 12
  ```
- Entregar el informe inicial con las 3 secciones obligatorias:
  1. **👥 Confirmación de Uso de Subagentes:** Estado del orquestador y subagentes.
  2. **💻 Diagnóstico de Recursos de Máquina:** VRAM, GPU Metal, % CPU, RAM, Docker Colima.
  3. **🔍 Calidad de Código y Salud de Servicios:** Estado de puertos `:3028`, `:54321` y Vercel.

### Reglas de Intervención y Cancelación Automática
1. **Intervención:** El monitor **SOLO debe intervenir** si detecta que el agente o el proceso ha entrado en un bucle (loop) del que no puede salir. Si el proceso avanza o está trabajando con normalidad, el monitor **no debe intervenir** (solo reporta).
2. **Cancelación por inactividad:** Si durante la auditoría periódica se detectan **3 revisiones consecutivas sin que el agente realice ningún avance** (inactividad total o proceso idle sin trabajo), el agente encargado de monitorizar debe:
   - Cancelar la tarea de monitorización automáticamente (usando `manage_task(Action='kill')`).
   - Emitir un **reporte completo** detallando el estado final del sistema y notificando al usuario que la monitorización se ha detenido por inactividad.
- Confirmar al usuario que la monitorización automática se ejecutará cada 5 minutos.
