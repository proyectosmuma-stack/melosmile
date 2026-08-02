---
name: inicia-sesion
description: Comprobación rápida de estado del entorno local (3028) y Supabase (54321). Si están activos, notifica OK inmediatamente.
---

# /Inicia Sesion

> ⚠️ **REGLA IMPORTANTE**: NUNCA pedir usuario ni contraseña. Usar `npm --prefix frontend` para ejecutar desde el directorio raíz.

### Paso 1: Health Check HTTP
Ejecutar la siguiente línea en bash:
```bash
curl -s -o /dev/null -w "%{http_code}" -L http://localhost:3028 && curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:54321/rest/v1/
```

### Paso 2: Respuesta Inmediata OK
- Si la salida es `200200`:
  1. **Carga Eficiente de Contexto (REGLA 32K)**:
     - NO leas `context.md`, `roadmap.md` y `Walkthrough.md` enteros al mismo tiempo.
     - Lee **únicamente las primeras 40 líneas de `context.md`** o usa rangos de líneas (ej. `StartLine: 1, EndLine: 40` en `view_file`) para conocer el estado actual.
     - Lee el resto de secciones **solo cuando la tarea específica lo requiera**.
  2. Responder de inmediato al usuario:
     `✅ Entorno local (http://localhost:3028) y Supabase (http://127.0.0.1:54321) están activos y listos para trabajar.`
  3. Detener la ejecución sin arrancar comandos adicionales ni volcar el resumen al historial.

- Si Supabase está inactivo: Ejecutar `npm --prefix frontend run db:sync`.
- Si el servidor web está inactivo: Ejecutar `npm --prefix frontend run dev`.
