# Reglas del Proyecto MeloSmile

## Diccionario de Tratamiento y Abreviaturas de Clínica (Albi / Albacete)
- **RC** o **R.C.** → **Reconstrucción Simple**
- **Rev** o **Rev.** → **Control**
- **Notas y Observaciones Clínicas**: Indicaciones no facturables (ej: *Ataches / Poner ataches*, *Quitar Brackets*, *Poner Brackets Superior*, *Hará un poco de IPR*, *Coloc Myobrace*, etc.) deben registrarse estrictamente como una **nota / observación** dentro del campo `notes` (Evolución Clínica & Observaciones del Doctor) de la cita de Control (o Revisión) correspondiente, y **NO** como un procedimiento facturable separado.

## Reglas de Agrupamiento de Citas
- **Misma Hora y Paciente**: Si un mismo paciente tiene varios tratamientos o renglones anotados a la misma hora (ej: 09:30 Lucas cementar 60€ y 09:30 Lucas líneas 50€), deben unificarse en **una sola cita** a esa hora.
- Los tratamientos se agregan en un array/lista de tratamientos `["cementar", "líneas"]` y el precio total se suma (ej: `price_eur: 110`).

## Reglas de Precios e Identificación de Pacientes
- **Precios Escritos**: Si en el papel/documento aparece reflejado un precio numérico en euros (ej: 60€, 100€, 125€), se debe usar **estrictamente ese monto** (prevalece sobre los precios por defecto del catálogo).
- **Resolución de Paciente por Nombre**: Si sólo se dispone del nombre de pila del paciente (sin apellido), el sistema debe buscar en la base de datos de la clínica:
  1. **Si existe 1 solo paciente** con ese nombre de pila (ej: "Lucas Callaos"), la cita se asocia directamente a ese paciente.
  2. **Si existen varios pacientes** con el mismo nombre de pila (ej: "Lucas Pérez" y "Lucas Callaos"), la cita SE CREA igualmente, pero se marca con estado/nota de **Pendiente de Revisión** para que el usuario pueda seleccionar manualmente el paciente correcto.
  3. **Si no existe ningún paciente** con ese nombre de pila, se crea la ficha inicial del paciente.

## Flujo de Trabajo de Sesión del Agente (Comandos de Chat)

### Comando: "Inicia Sesión"
Cuando el usuario diga **"Inicia Sesión"** o ejecute `/inicia-sesion`:
*(Nota: Este comando es para preparar el entorno local de desarrollo. NUNCA pedir usuario ni contraseña).*
1. **Comprobación Previa de Estado (Health Check)**:
   - Ejecutar la comprobación HTTP: `curl -s -o /dev/null -w "%{http_code}" -L http://localhost:3028 && curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:54321/auth/v1/health`.
   - **Si ambos responden HTTP 200 (salida 200200)**: Omitir el reinicio de servidores, cargar el contexto (`context.md`, `roadmap.md`, `Walkthrough.md`) y responder inmediatamente: `"✅ Entorno local y Supabase activos y listos para trabajar."`
2. **Contexto**: Leer exhaustivamente los documentos `context.md`, `roadmap.md` y `Walkthrough.md` para ponerse en contexto completo con el estado actual del proyecto y las tareas planificadas.
3. **Supabase & Redundancia**: Si Supabase Local no está activo, ejecutar `supabase start` para iniciar los contenedores de Supabase Local con los datos de prueba locales.
4. **Servidor Web**: Si el servidor en `http://localhost:3028` no está activo, iniciarlo ejecutando `npm --prefix frontend run dev`.

### Comando: "Actualiza datos"
Cuando el usuario diga **"Actualiza datos"** o similar:
1. **Sincronización**: Ejecutar exclusivamente `npm run db:sync` desde la carpeta `frontend` para descargar y aplicar todos los datos recientes de Supabase Cloud a la base de datos local.
2. **Notificación**: Confirmar al usuario el número de registros y tablas actualizadas en local.

### Comando: "Borra datos" / Protocolo de Borrado de Base de Datos
Cuando el usuario pida **"Borra datos"**, **"Limpia la base de datos"** o similar:
1. **Orden Estricto de Eliminación (FK Constraints)**:
   - `DELETE FROM billing_session_lines;`
   - `DELETE FROM billing_sessions;`
   - `DELETE FROM billing_records;`
   - `DELETE FROM appointments;`
   - `DELETE FROM patient_tags WHERE patient_id NOT IN (SELECT id FROM patients WHERE first_name ILIKE '%Munir%' OR last_name ILIKE '%Callaos%');`
   - `DELETE FROM patient_clinics WHERE patient_id NOT IN (SELECT id FROM patients WHERE first_name ILIKE '%Munir%' OR last_name ILIKE '%Callaos%');`
   - `DELETE FROM patient_representatives WHERE patient_id NOT IN (SELECT id FROM patients WHERE first_name ILIKE '%Munir%' OR last_name ILIKE '%Callaos%');`
   - `DELETE FROM documents WHERE patient_id NOT IN (SELECT id FROM patients WHERE first_name ILIKE '%Munir%' OR last_name ILIKE '%Callaos%');`
   - `DELETE FROM reminders WHERE patient_id NOT IN (SELECT id FROM patients WHERE first_name ILIKE '%Munir%' OR last_name ILIKE '%Callaos%');`
   - `DELETE FROM patients WHERE first_name NOT ILIKE '%Munir%' AND last_name NOT ILIKE '%Callaos%';`
2. **Ejecución Dual (Local & Cloud)**:
   - Ejecutar la limpieza en **Supabase Local** (vía PostgreSQL / CLI).
   - Ejecutar la limpieza en **Supabase Cloud** (vía `node scripts/clean_remote_db.js`).
3. **Confirmación**: Reportar los contadores de registros restantes (dejando únicamente la ficha de Munir y la base limpia).

### Comando: "Cierra sesión"
Cuando el usuario diga **"Cierra sesión"** o similar:
1. **Documentación**: Actualizar y documentar exhaustivamente todos los cambios realizados en:
   - `context.md`
   - `roadmap.md`
   - `Walkthrough.md`
2. **Redundancia & Limpieza**: Ejecutar respaldo automático de datos (`npm run db:sync`), y limpiar y eliminar archivos temporales o basura generados durante la sesión.
3. **Git y Vercel**: Preguntar al usuario si desea hacer `git commit` a la rama `develop` y verificar el estado del despliegue en Vercel.
4. **Apagado**: Preguntar al usuario si desea apagar el servidor local (`localhost:3028`) y detener la base de datos de Supabase.

---

## ⚡ Reglas de Eficiencia de Contexto para OpenCode (Ventana 22k / qwen2.5-coder:14b)

Para optimizar el uso de contexto y evitar la degradación en modelos locales con ventanas de 22k tokens:

1. **Lectura por Secciones (Index Pattern)**:
   - Usa siempre el comando o herramienta `view_file` con rangos específicos (ej. `StartLine`, `EndLine`) o `grep_search` en lugar de leer archivos completos de más de 100 líneas.
   - **Nunca** leas `context.md`, `roadmap.md` y `Walkthrough.md` completos en una sola respuesta. Lee solo los resúmenes iniciales o la sección pertinente.

2. **Sin Volcado de Resúmenes (Zero Dump)**:
   - Tras realizar un cambio o ejecutar un comando, responde con un resumen conciso de 2 a 4 líneas.
   - **NO** repitas el contenido de los archivos creados o modificados en tus respuestas.

3. **Inteligencia de Código con CodeGraph (OBLIGATORIO)**:
   - SIEMPRE usar `codegraph_query` en vez de Grep para buscar funciones, componentes o símbolos.
   - SIEMPRE usar `codegraph_callers` antes de modificar una función para saber quién la llama.
   - SIEMPRE usar `codegraph_structure` para entender la arquitectura de un módulo sin leer archivos completos.
   - SIEMPRE usar `codegraph_impact` antes de editar un archivo para evaluar posibles rupturas.
