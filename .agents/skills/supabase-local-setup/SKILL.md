---
name: supabase-local-setup
description: Configura un entorno de desarrollo local ligero de Supabase usando Colima en macOS, sincroniza esquemas desde la nube, separa entornos (local vs Vercel/Producción) y define flujos de trabajo de sesión.
---

# Supabase Local Setup & Sync Skill

Esta habilidad proporciona una guía estandarizada y un flujo de trabajo para implementar un entorno local ligero de **Supabase** usando **Colima** y **Docker CLI** en macOS, clonar esquemas desde la nube y mantener aislado el entorno local del entorno de despliegue en Vercel.

---

## 1. Verificación e Instalación de Herramientas (Global macOS)

Antes de realizar la instalación, verificar si Supabase CLI y Colima ya se encuentran instalados en el sistema:

```bash
if command -v supabase &> /dev/null && command -v colima &> /dev/null; then
  echo "✅ Supabase CLI y Colima ya están instalados. Omitiendo instalación..."
else
  echo "📦 Instalando Colima, Docker y Supabase CLI..."
  brew install colima docker docker-compose supabase/tap/supabase
fi
```

Arrancar el runtime de Colima si no está activo:
```bash
colima status &> /dev/null || colima start
```

*Nota: En Colima 1.0+, `DOCKER_HOST` se configura automáticamente. Si `docker ps` diera un error de conexión, exportar:*
```bash
export DOCKER_HOST="unix://${HOME}/.colima/default/docker.sock"
```

---

## 2. Sincronización de Esquema (Cloud → Local)

### Paso A: Vincular con el Proyecto en la Nube
Ubicarse en la raíz del repositorio donde se encuentra la carpeta `supabase/`:

```bash
export SUPABASE_ACCESS_TOKEN="<TU_SUPABASE_ACCESS_TOKEN>"
supabase link --project-ref <PROJECT_REF_NUBE>
```

### Paso B: Extraer el Esquema de la Nube
Descargar las tablas, funciones, disparadores, tipos y políticas RLS como una migración local:

```bash
supabase db pull
```

### Paso C: Aplicar Migraciones en Local
Iniciar o reiniciar la base de datos local aplicando el esquema descargado:

```bash
supabase db reset
```

---

## 3. Aislamiento de Entornos (Local vs Vercel / Nube)

### Estructura de Archivos `.env`
1. **`frontend/.env.remote`**: Respaldo de las llaves de Supabase Cloud.
2. **`frontend/.env.local`**: Configuración exclusiva de desarrollo local:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<LOCAL_ANON_KEY_DE_SUPABASE_STATUS>
   SUPABASE_SERVICE_ROLE_KEY=<LOCAL_SERVICE_ROLE_KEY_DE_SUPABASE_STATUS>
   ```

3. **Vercel**: Los despliegues en Vercel continúan usando sus propias variables de entorno configuradas en el panel web, apuntando a `https://<PROJECT_REF>.supabase.co`.

---

## 4. Automatización en 1 Solo Comando (`package.json`)

Modificar el script `dev` en `package.json` para que al ejecutar `npm run dev`, se garantice que Supabase local esté encendido:

```json
"scripts": {
  "dev": "supabase start -w ../ && next dev -p 3028",
  "typegen": "supabase gen types typescript --local > src/types/supabase.ts"
}
```

---

## 5. Protocolo de Flujo de Sesión (Reglas para AGENTS.md)

En el archivo `.agents/AGENTS.md` del proyecto, registrar los siguientes comandos:

### Comando: "Inicia Sesión"
1. **Contexto**: Leer `context.md`, `roadmap.md` y `Walkthrough.md`.
2. **Supabase & Redundancia**: `npm run db:sync` y `supabase start`.
3. **Servidor Web**: `npm run dev` en `frontend`.

### Comando: "Actualiza datos"
1. **Sincronización**: Ejecutar `npm run db:sync` desde la carpeta `frontend` para traer de inmediato los datos de Supabase Cloud a Supabase Local.

### Comando: "Cierra sesión"
1. **Documentación**: Actualizar `context.md`, `roadmap.md` y `Walkthrough.md`.
2. **Limpieza**: Borrar archivos temporales/basura.
3. **Git y Vercel**: Preguntar si realiza `git commit` a `develop` y revisar el estado del despliegue en Vercel.
4. **Apagado**: Preguntar si apaga `localhost:3028` y la base de datos de Supabase.

---

## 6. Buenas Prácticas Adicionales

1. **Datos de Prueba (`supabase/seed.sql`)**: Crear datos ficticios para pruebas locales de desarrollo que se cargarán automáticamente al ejecutar `supabase db reset`.
2. **Tipado Automático**: Ejecutar `npm run typegen` para actualizar las definiciones de tipos TypeScript cuando cambie la estructura de la base de datos.
