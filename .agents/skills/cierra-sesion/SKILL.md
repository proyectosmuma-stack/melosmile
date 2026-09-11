---
name: cierra-sesion
description: Finaliza la sesión actualizando la documentación, indexando el estado en RAG, respaldando la base de datos y ofreciendo git commit y apagado del servidor.
---

# /Cierra Sesion

Cuando el usuario ejecute `/cierra-sesion` o diga "Cierra sesión":

1. **Documentación**: Actualizar y documentar exhaustivamente todos los cambios realizados en `.opencode/ESTADO_PROYECTO.md` (fuente de verdad principal). También actualizar `context.md`, `roadmap.md` y `Walkthrough.md` si existen.

2. **Auto-sync RAG** *(nuevo — SIEMPRE ejecutar)*: Indexar el estado actualizado en RAG para búsqueda semántica en futuras sesiones:
   ```bash
   cd <PROJECT_ROOT> && deno run -A ~/Antigravity\ Projects/opencode/scripts/sync-estado-to-rag.ts <project_id>
   ```
   - Ejemplo para melosmile: `cd ~/Antigravity\ Projects/melosmile && deno run -A ~/Antigravity\ Projects/opencode/scripts/sync-estado-to-rag.ts melosmile`
   - El script divide `ESTADO_PROYECTO.md` en chunks semánticos por secciones `##` y solo re-indexa los que cambiaron (deduplicación por hash).
   - Luego ejecutar el `save-session` de resumen breve:
     ```bash
     deno run -A ~/.config/opencode/scripts/memory-bridge.ts save-session antigravity "<FECHA>-<proyecto>" "<resumen 1 línea>"
     ```

3. **Redundancia & Respaldo**: Ejecutar `npm run db:sync` en `frontend`.

4. **Git y Vercel**: Preguntar al usuario si desea realizar `git commit` y `git push` a la rama `develop`.

5. **Apagado de Entorno**: Preguntar al usuario si desea apagar el servidor local (`localhost:3028`) y detener Supabase Local (`supabase stop`).

---

> **Nota de inicio de sesión**: Al inicio de la siguiente sesión, el agente puede recuperar contexto con:
> ```bash
> deno run -A ~/.config/opencode/scripts/memory-bridge.ts search antigravity "melosmile <tema>"
> ```
> Esto devolverá los chunks relevantes del ESTADO_PROYECTO.md sin necesidad de leerlo completo.
