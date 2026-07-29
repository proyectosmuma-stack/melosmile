---
name: cierra-sesion
description: Finaliza la sesión actualizando la documentación context.md, roadmap.md y Walkthrough.md, respaldando la base de datos y ofreciendo git commit y apagado del servidor.
---

# /Cierra Sesion

Cuando el usuario ejecute `/cierra-sesion` o diga "Cierra sesión":

1. **Documentación**: Actualizar y documentar exhaustivamente todos los cambios realizados en:
   - `context.md`
   - `roadmap.md`
   - `Walkthrough.md`
2. **Redundancia & Respaldo**: Ejecutar `npm run db:sync` en `frontend`.
3. **Git y Vercel**: Preguntar al usuario si desea realizar `git commit` y `git push` a la rama `develop`.
4. **Apagado de Entorno**: Preguntar al usuario si desea apagar el servidor local (`localhost:3028`) y detener Supabase Local (`supabase stop`).
