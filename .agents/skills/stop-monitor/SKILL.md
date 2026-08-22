---
name: stop-monitor
description: Detiene y cancela la tarea cron de monitorización periódica en segundo plano.
---

# /stop-monitor (Detiene Monitorización Periódica)

Cuando el usuario ejecute `/stop-monitor`, diga `"deten monitoreo"`, `"pausa monitoreo"`, `"para la monitorizacion"` o similar:

### Paso 1: Localizar la Tarea de Monitorización Activa
- Ejecutar la herramienta `manage_task` con `Action: 'list'`.
- Identificar el `taskId` del cron correspondiente a la monitorización periódica (`schedule`).

### Paso 2: Cancelar la Tarea en Segundo Plano
- Ejecutar la herramienta `manage_task` con:
  - `Action`: `'kill'`
  - `TaskId`: `<taskId_identificado>`

### Paso 3: Confirmación y Resumen
- Notificar al usuario:
  `🛑 Monitorización detenida correctamente. He cancelado la tarea en segundo plano.`
- Incluir un breve resumen (3 líneas) del estado actual de los servicios y del repositorio.
