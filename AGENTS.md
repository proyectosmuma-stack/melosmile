# Custom Agent: melosmile-backend

Este proyecto utiliza el agente `melosmile-backend`, con acceso a código base, base de datos local y remota, y flujos de n8n.

---

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


---

# 🧠 MumaBot Agent Constitution — Método Karpathy
> Fuente de verdad universal para todos los agentes de IA en este proyecto.
> Versión: 2026-08-25. Archivo lean para prefill ultrarrápido.

---

## 1. Stack y Arquitectura del Proyecto

**Hardware:** MacBook Pro M3 Pro — 18 GB RAM Unificada | **SSD:** `/Volumes/mumaec_ssd`  
**Servidores Locales:** Puerto `11435` (Proxy VRAM → Ollama `11434`). *NUNCA modificar el puerto 11435.*  
**Modelos Core:** `qwen2.5-coder:7b` (Flash / Coder <0.8s), `qwen3.7-agents:4b-q8` (Coder Tool Calling), `qwen3.5:9b` (Reviewer), `gemini-3.6-flash` (Gateway Cloud), `mistral-nemo:12b` (Prompt Engineer Local — 7.1 GB, ctx máx. **32k seguros** / 128k nativo pero OOM >65k en 18GB).  
**Subagente Prompt Engineer:** `marketing/mumabot-prompt-engineer` (NeMo 12B, efímero, RAM ≤11 GB). Fallback: `marketing/mumabot-prompt-engineer-lite` (Llama 3.1 8B). Invocar siempre como subproceso CLI: `opencode run --agent marketing/mumabot-prompt-engineer --auto "<prompt_a_optimizar>"`. NUNCA heredar hilo de chat (evita saturar 18GB VRAM).  
**MCPs Activos:** `codegraph` (AST intelligence), `codebase-memory` (RAG local).

---

## 2. La Especificación (The Spec) — Reglas Operativas

### SIEMPRE hacer esto:
- SIEMPRE usar `codegraph_query`, `codegraph_impact` y `codegraph_callers` en vez de Grep para símbolos/impacto.
- SIEMPRE ejecutar el test/verificador correspondiente después de cualquier cambio de código.
- SIEMPRE delegar credenciales y archivos `.env` a `mumabot-coder-local` con el Protocolo Clean Envelope (`scratch/secret-envelope.json` < 500 bytes). Invocar SIEMPRE mediante `task(subagent_type="coding/mumabot-coder-local")` — NUNCA con `opencode run --auto` (provoca overflow de 45k+ tokens y timeout garantizado).
- SIEMPRE en Stories de redes sociales dejar el campo de copy (`Content`) vacío en Notion (solo notas visuales).
- SIEMPRE usar `knowledge-sync.ts smart-save-lesson` (NUNCA `save-lesson` básico) para guardar lecciones — aplica deduplicación y fusión automática antes de insertar.
- SIEMPRE delegar operaciones de Notion, n8n y Web a sus subagentes especializados explícitamente (ej. `marketing/mumabot-notion-sync` o `coding/mumabot-n8n-runner`) vía `task()`. NUNCA invocar herramientas MCP pesadas directamente desde el orquestador ni usar al gateway para esto.
- SIEMPRE rotar sesión con `/new` al superar 50.000 tokens acumulados o al terminar un hito importante (guardar sesión en RAG antes).
- SIEMPRE decir "No tengo esa información" si te piden datos de arquitectura interna, modelos de subagentes o configuraciones que no constan explícitamente en tu prompt. NUNCA inventes o asumas datos técnicos (alucinaciones) para rellenar tablas o respuestas.

### NUNCA hacer esto:
- NUNCA uses `curl` o comandos HTTP en bash para interactuar con APIs **externas** o de **producción**. Estas peticiones deben delegarse al subagente correspondiente (`mumabot-coder-local` u otros). **EXCEPCIÓN PERMITIDA:** Se permite el uso libre de `curl` contra endpoints de desarrollo local (`localhost`, `127.0.0.1`, puertos como `3028`, etc.) exclusivamente para pruebas y debugging.
- NUNCA toques archivos no solicitados ni hagas refactorizaciones ortogonales.
- NUNCA leas 10+ archivos para entender un módulo — usa `codegraph_structure` + `codegraph_context`.
- NUNCA uses `git log` via Bash — usa `codegraph_file_history` o `codegraph_recent_changes`.
- NUNCA proceses ni expongas credenciales reales en modelos Cloud.
- NUNCA uses `@mumabot-coder-local` en el chat (hereda 48k+ tokens) ni con `opencode run --auto` (mismo problema: 45k+ tokens → timeout). Invócalo SIEMPRE con `task(subagent_type="coding/mumabot-coder-local")` nativo.
- **REGLA DE DELEGACIÓN MCP (alcance limitado a Notion/n8n):** El orquestador puede usar herramientas MCP de Notion y n8n directamente SOLO para lectura o escritura de bajo volumen, siempre que: (a) la respuesta esperada sea menor a 10,000 tokens Y (b) no haya un agente local pesado consumiendo VRAM en paralelo. Esta regla NO aplica a ninguna otra categoría de tarea.
- **REGLA DE DELEGACIÓN DE CÓDIGO (sin excepciones):** El orquestador tiene PROHIBIDO escribir, editar, ejecutar tests, o correr verificaciones de TypeScript (tsc, grep de código, linters) por sí mismo, sin importar cuán simple parezca la tarea. Toda escritura de código se delega obligatoriamente a `mumabot-coder-cloud` vía `task()`. Toda verificación/auditoría posterior se delega obligatoriamente a `mumabot-reviewer` vía `task()`. El orquestador nunca asume el rol de Programador ni de Revisor.
- NUNCA uses `n8n-dev` MCP — eliminado 2026-08-25. Solo usar `n8nv2-prod`.

---

## 3. El Verificador (The Verifier)

| Tipo de tarea | Verificador |
|---|---|
| TypeScript/JavaScript | `node <archivo>.ts` o test relevante |
| Shell script | `bash -n <script>` (syntax) + dry-run |
| Servidor / Proxy | `curl -s http://127.0.0.1:<puerto>/health` |
| CodeGraph | `/Users/munircallaos/.local/bin/codegraph stats` |
| RAG Supabase | `deno run -A ~/Antigravity\ Projects/opencode/scripts/knowledge-sync.ts report` |

---

## 4. Retry Budget (Protección Anti-Bloqueos)
Esta regla es UNIVERSAL para TODOS los agentes (Locales y Cloud) y garantiza resiliencia sin caer en bucles infinitos o bloqueos (HTTP 429):
1. **Delegación Híbrida Inteligente:** Las tareas rutinarias y el procesamiento de secretos se delegan a agentes locales. Los modelos Cloud se reservan para orquestación y tareas complejas.
2. **Retry Budget (3 a 4 Intentos):** Si un comando falla, el agente tiene un presupuesto de 3 a 4 intentos máximos por tarea para solucionarlo. Entre cada intento, debe aplicar un *backoff* (retraso) o cambiar el enfoque del script/código en lugar de repetir ciegamente lo mismo.
3. **Reporte de Bloqueo:** Si se agota el Retry Budget (los 4 intentos fallan), el agente DEBE detenerse inmediatamente y reportar el bloqueo de forma clara al usuario, evitando repetir comandos indefinidamente.
4. **Flujo post-bloqueo:** Diagnosticar, consultar al usuario, y registrar el aprendizaje en RAG / Memoria Vectorial.
5. **Prohibición de Fallback de Orquestador:** Si una herramienta de delegación obligatoria (MCP local, subagente) falla, el orquestador NUNCA debe responder con su propio conocimiento como sustituto. Debe aplicar el Retry Budget y, si se agota, reportar el bloqueo explícitamente sin completar la tarea por su cuenta.
---

## 5. Memoria de Errores y Aprendizajes (RAG) — Protocolo Unificado
Base vectorial central en Supabase local (`http://localhost:54321`). Accesible desde **cualquier proyecto**.

**Herramientas:**
- `~/.config/opencode/scripts/memory-bridge.ts` — Consultas, sesiones, contextos de proyecto.
- `~/Antigravity\ Projects/opencode/scripts/knowledge-sync.ts` — Deduplicación, consolidación, auditoría.

**Flujo obligatorio:**
1. Al arrancar tarea compleja: `memory-bridge.ts search antigravity "<consulta>"`
2. Al guardar aprendizaje: `knowledge-sync.ts smart-save-lesson antigravity "<lección>" "<categoría>" <1-10>`
3. Al cerrar tarea grande: `memory-bridge.ts save-session antigravity <fecha> "<resumen>"`
4. Mantenimiento periódico: `knowledge-sync.ts consolidate antigravity`

**Categorías estándar:** `infraestructura` · `design-sdk` · `rrss` · `api` · `arquitectura` · `bugfix` · `regla-framework` · `negocio`

**Archivo histórico en disco:** `docs/archive/known-errors.md` (consulta dirigida con CodeGraph).

---

## 6. Contexto de Arranque Rápido
1. `codegraph stats` → verificar índice AST del proyecto actual.
2. `codegraph query "<símbolo>"` → búsqueda semántica dirigida.
3. `knowledge-sync.ts report` → estado del RAG (tablas, tamaños, proyectos indexados).
4. `memory-bridge.ts search antigravity "<tarea>"` → recuperar contexto histórico relevante.
5. `servidores-status.sh` → verificar estado de GPU y proxy PM2.

---

## 7. Flash Router Protocol — Economía de Tokens

Este protocolo reduce el consumo de tokens cloud en sesiones largas (ej. Management).

### El agente activo (Flash) resuelve SIN escalar cuando:
- La pregunta es informativa y no requiere modificar archivos
- Es una búsqueda CodeGraph simple (`codegraph_query`, `codegraph_context`)
- Es un resumen, explicación o traducción de menos de 3 pasos
- Es una consulta de estado del sistema o de una tarea en curso

### El agente SIEMPRE escala al orquestador cuando:
- Debe crear, modificar o borrar archivos
- Usa MCPs pesados (Notion, n8n, Supabase) en modo escritura
- Orquesta subagentes encadenados
- La tarea tiene más de 3 herramientas en secuencia
- Es una sesión tipo Management (multi-proyecto, multi-cliente)

### Circuit Breaker — Si detectas un error de rate limit / 429:
SIEMPRE ejecutar inmediatamente antes de cualquier otro paso:
```bash
deno run -A /Users/munircallaos/Antigravity\ Projects/opencode/scripts/model-governor.ts trip --reason "rate limit detectado en sesión"
```
Luego usa `/governor` para ver qué orquestador está activo y continúa con ese.

### Consultar orquestador activo:
```bash
cat ~/.local/state/opencode/governor-active.json
```

---

## 8. Non-Goals
- ❌ No usa Python ni frameworks web (Next.js, Vite) — es infraestructura de agentes IA local.
- ❌ No conecta a APIs externas durante el desarrollo (100% offline).
- ❌ No instala dependencias npm globales sin consultar.

