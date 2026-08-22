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
1. **Documentación**: Actualizar y documentar exhaustivamente todos los cambios realizados en `context.md`, `roadmap.md` y `Walkthrough.md`.
2. **Redundancia & Limpieza**: Ejecutar respaldo automático de datos (`npm run db:sync`), y limpiar y eliminar archivos temporales o basura generados durante la sesión.
3. **Git y Vercel**: Preguntar al usuario si desea hacer `git commit` a la rama `develop` y verificar el estado del despliegue en Vercel.
4. **Apagado**: Preguntar al usuario si desea apagar el servidor local (`localhost:3028`) y detener la base de datos de Supabase.

### Comando: "/monitor" / "Inicia monitoreo"
Cuando el usuario diga **/monitor**, **"Inicia monitoreo"**, **"Comienza monitorizacion"** o similar:
1. **Verificación de Tareas**: Comprobar si ya existe un cron de monitorización con `manage_task(Action='list')`.
2. **Programación Cron**: Invocar `schedule` con `CronExpression="*/5 * * * *"` y `IsDaemon=false` para auditar cada 5 minutos.
3. **Estructura Obligatoria de Informe**:
   - `👥 Confirmación de Uso de Subagentes`
   - `💻 Diagnóstico de Recursos de Máquina` (VRAM, GPU Metal, % CPU, RAM, Docker Colima)
   - `🔍 Calidad de Código y Salud de Servicios` (Local `:3028`, Supabase `:54321`, Vercel Staging)
4. **Snapshot Inicial**: Emitir un reporte instantáneo al activar.

### Comando: "/stop-monitor" / "Detén monitoreo"
Cuando el usuario diga **/stop-monitor**, **"Deten monitoreo"**, **"Pausa monitoreo"** o similar:
1. **Localización**: Encontrar el `taskId` del cron activo en `manage_task(Action='list')`.
2. **Cancelación**: Ejecutar `manage_task(Action='kill', TaskId=...)`.
3. **Confirmación**: Notificar la detención y emitir un resumen de 3 líneas del estado del sistema.

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


## 🛑 REGLA ANTI-BUCLES DE DIAGNÓSTICO E2E (Protocolo de 3 Capas Aisladas)

Queda ESTRICTAMENTE PROHIBIDO el patrón de "ensayo-error acoplado" (hacer 1 cambio menor -> lanzar E2E completo -> fallar -> repetir).
Cuando un flujo o integración falle en pruebas E2E, se DEBE seguir obligatoriamente este orden secuencial:

### CAPA 1 — Infraestructura y Transporte (Bulk Fix & Pure Plumbing)
1. **Auditoría Exhaustiva de Nodos:** Inspeccionar TODOS los nodos y herramientas del flujo en una sola pasada (no nodo por nodo).
2. **Bulk Configuration:** Aplicar flags obligatorios (`sendHeaders: true`, content-types, auth headers) a TODOS los nodos en un solo PUT/Update masivo.
3. **Validación en Seco (Unit Tests / Curl):** Verificar directamente contra los endpoints HTTP con curl que devuelven `200 OK` antes de involucrar al LLM.

### CAPA 2 — Orquestación y Prompts (Contratos de Delegación)
1. **Endurecimiento de Reglas:** Prohibir explícitamente al Dispatcher o Supervisor responder con texto o JSON inventado. Forzar la invocación de la herramienta/sub-workflow.
2. **Aislamiento de Nodos Deshabilitados:** Nunca dejar nodos deshabilitados conectados al grafo del agente LangChain (eliminarlos para evitar bucles de iteración máxima).

### CAPA 3 — Certificación E2E Única y Verdad Absoluta
1. **Un Solo Test de Integración:** Ejecutar el test E2E completo únicamente tras haber verificado el 100% de la Capa 1 y Capa 2.
2. **Verdad Absoluta en Base de Datos:** Comprobar siempre el registro real en la base de datos (PostgreSQL / Supabase), nunca fiarse del texto de éxito devuelto por el LLM.
