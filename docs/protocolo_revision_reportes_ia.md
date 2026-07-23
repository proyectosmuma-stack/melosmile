# PROTOCOLO PERMANENTE DE REVISIÓN Y RESOLUCIÓN DE ERRORES DE AGENTES IA (MELOSMILE)

> [!IMPORTANT]
> **REGLA DE ORO DE INMUTABILIDAD:** Este archivo (`docs/protocolo_revision_reportes_ia.md`) es una directiva del sistema y **NUNCA DEBE SER BORRADO NI ELIMINADO** durante la resolución de tareas o ejecución de commits.

---

## 🎯 Propósito del Protocolo
Este protocolo establece la secuencia estricta de pasos que la IA (Antigravity / Agentes) y los desarrolladores deben seguir cada vez que se solicite revisar los reportes de error o logs de comportamiento de **Musly y sus sub-agentes**.

---

## 📌 Ubicación de los Reportes de Error
Todos los reportes de error generados por los usuarios desde la interfaz web (tanto en `localhost:3028` como en **Vercel Producción**) se registran de forma **unificada e inmediata** en:

1. **Base de Datos Principal (Supabase):** Tabla `public.ai_agent_reports`
   - Campo `id`: UUID único del reporte.
   - Campo `user_comment`: Descripción dada por el usuario sobre lo que falló.
   - Campo `conversation_history`: JSON con el diálogo completo (usuario + agente + intención).
   - Campo `participating_agents`: Lista de sub-agentes involucrados.
   - Campo `resolved`: Booleano (`false` = pendiente de revisión, `true` = corregido).
   - Campo `resolution_notes`: Explicación de la solución aplicada.
2. **Archivo de Respaldo Local:** `logs/agent_reports.log`

---

## 📋 Pasos del Protocolo de Revisión (Checklist Obligatorio)

Cuando se pida *"revisar los reportes de error de la IA"* o *"ver los logs del agente"*, debes ejecutar la siguiente secuencia paso a paso:

### Paso 1: Consultar la Base de Datos de Reportes en Supabase
Ejecutar una consulta HTTP/API a `/api/ai/report?resolved=false` o consultar la tabla `ai_agent_reports` en Supabase para obtener la lista de errores pendientes (`resolved = false`).

### Paso 2: Diagnosticar la Causa Raíz
Para cada reporte pendiente, analizar:
1. **Comentario del Usuario (`user_comment`):** ¿Qué esperaba el usuario y qué ocurrió realmente?
2. **Intención Clasificada (`intent`):** ¿El Dispatcher derivó la solicitud al sub-agente correcto?
3. **Herramienta Faltante o Defectuosa:** ¿El sub-agente tenía la herramienta necesaria (ej: `Tool_List_Appointments`, `Tool_Search_Patients`)?
4. **Respuesta del Backend / API:** ¿El endpoint HTTP devolvió los datos requeridos o sanitizó los términos de búsqueda correctamente?

### Paso 3: Aplicar la Solución Técnica
- Si el fallo fue de enrutamiento o prompt: Actualizar la instrucción del agente o subir el modelo LLM en n8n (ej: a `google/gemini-2.5-pro`).
- Si el fallo fue por falta de herramientas: Añadir el nodo/tool faltante al flujo de n8n.
- Si el fallo fue de API/código Next.js: Corregir el archivo en `frontend/src/app/api/...`.

### Paso 4: Probar y Verificar en Vivo
- Ejecutar un test con `curl` o en el panel de IA para confirmar que la consulta del usuario ahora responde correctamente con datos reales.

### Paso 5: Marcar el Reporte como RESUELTO o Eliminarlo
- Actualizar el reporte en Supabase llamando a `PATCH /api/ai/report`:
  ```json
  {
    "id": "<UUID_DEL_REPORTE>",
    "resolution_notes": "Corregido enrutamiento en Dispatcher n8n y añadida herramienta Tool_List_Appointments.",
    "delete_report": false
  }
  ```
  *(O si se solicita limpiarlo completamente de la BD, enviar `"delete_report": true`)*.

---

## 🔒 Garantía de Inmutabilidad
- **El archivo `docs/protocolo_revision_reportes_ia.md` permanece permanentemente en el repositorio.**
- **No se borra en ningún proceso de limpieza o despliegue.**
