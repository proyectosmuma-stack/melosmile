# Command: /inicia-sesion

> ⚠️ **DEVELOPER NOTE**: Este comando es para preparar e iniciar el entorno local (Next.js + Supabase). NO pidas usuario ni contraseña.

### Paso 1: Comprobación de Estado (Health Check)
Ejecutar este comando exacto en bash:
```bash
curl -s -o /dev/null -w "%{http_code}" -L http://localhost:3028 && curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:54321/rest/v1/
```

### Paso 2: Evaluación
- **Si la salida de la terminal es `200200`**:
  1. Leer los archivos `context.md`, `roadmap.md` y `Walkthrough.md`.
  2. Responder directamente al usuario:
     `✅ Entorno local (http://localhost:3028) y Supabase (http://127.0.0.1:54321) activos y listos para trabajar.`
  3. **DETENER EJECUCIÓN**. No ejecutar ningún otro comando de consola.

- **Si Supabase Local no responde HTTP 200**:
  - Ejecutar: `npm --prefix frontend run db:sync`

- **Si el servidor local (3028) no responde HTTP 200**:
  - Ejecutar: `npm --prefix frontend run dev`
