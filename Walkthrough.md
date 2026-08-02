# Documentación Completa de Cambios y Optimizaciones — Melosmile

## 📌 Resumen Ejecutivo
Se ha completado una revisión exhaustiva, corrección y auditoría integral del flujo de **Ingesta de Citas, Tarifas Personalizadas por Clínica, Motor Financiero y UX de Fichas de Citas**.

---

## 1. 🤖 Ingesta Masiva y Limpieza con Agente IA ("Musly")
- **Fuente Única de Verdad (`appointments`)**: Las citas registradas en la agenda son la fuente primaria de datos para la generación contable.
- **Asignación Prioritaria de Profesional**: Se configuró la API de creación (`/api/appointments/create/route.ts`) para que toda cita creada por el agente o sin médico especificado se asigne automáticamente a la **Dra. Osly Melo** (`d7e5e2bb-a7c4-44f6-9ef8-ba453e7dc477`), profesional principal de la clínica (`[0]`).
- **Generación Secuencial de Historia Clínica (`historia_id`)**: Corregido el algoritmo para consultar el correlativo mayor en Supabase (`PAC-001`, `PAC-002`, `PAC-003`...) evitando números aleatorios.
- **Pipeline Probado y Auditado**: Se verificó la eliminación completa de datos de prueba, la ingesta del Excel mediante el agente Document Cleaner en n8n (`/api/billing/document-cleaner`), y la creación limpia de 31 citas y 32 líneas contables.

---

## 2. 💶 Tarifas Personalizadas por Sede (`treatment_clinic_prices`)
- **Acceso Server-Side sin Bloqueo RLS**: Se implementó el cliente `supabaseAdmin` en `src/lib/supabase/server.ts` con `SUPABASE_SERVICE_ROLE_KEY` en `/api/billing/sessions/generate/route.ts` para garantizar la lectura de precios específicos por clínica sin restricciones de políticas RLS.
- **Resolución Dinámica de Precios de Sede**:
  - Al generar sesiones contables (`appointments-to-lines.ts`), el sistema consulta `catalogMap` y aplica la tarifa de la sede (ej. **120€** para *Control de Ortodoncia* en *Clinica Daniel Bustamante* en lugar del precio base de **60€**).
  - Al crear citas (`/api/appointments/create/route.ts`), la API consulta `treatment_clinic_prices` e inserta la tarifa de la sede.
  - Al visualizar la ficha de la cita (`appointments/[id]/page.tsx`), la interfaz resuelve el precio de la sede incluso en citas previamente creadas con snapshots antiguos.
  - Se removieron los precios estáticos `(60 €)` del texto desplegable del catálogo de tratamientos para mantener una interfaz limpia y sin precios confusos.

---

## 3. ⚖️ Alineación del Modelo Financiero y Terminología
- **Aclaración de la Fórmula Contable (`calculator.ts`)**:
  $$\text{Comisión Bruta (Médico)} = \text{Subtotal} \times \% \text{Comisión Profesional}$$
  $$\text{Honorarios Netos (Médico)} = \text{Comisión Bruta} - \text{Laboratorio Ajustado}$$
  El porcentaje de comisión (ej. 60%) calcula los honorarios brutos del profesional, de los cuales se descuenta la porción de laboratorio para obtener los **Honorarios Netos a liquidar al Médico**.

- **Estandarización de Etiquetas y Enunciados**:
  - **Detalle de Liquidación (`/billing/[id]`)**: `% Comisión Profesional`, `Comisión Bruta Dr.`, `Honorarios Netos Dr.` y `NETO A LIQUIDAR (MÉDICO)`.
  - **Informe PDF (`/api/billing/report/[id]`)**: `Comisión Profesional: XX%`, `Comisión Dr. (XX%)` y `NETO A LIQUIDAR (MÉDICO)`.
  - **Configuración de Sedes (`/settings/clinics`)**: `% Comisión Base Dr.`.
  - **Hub de Contabilidad (`/billing`)**: `Comisión base Dr.: XX%`.
  - **Ficha de Cita (`/appointments/[id]`)**: `% COMISIÓN DRA.`.

---

## 4. 🎨 Corrección de UX en Modales de la Cita
- **Desplegables Nativa HTML en Edición de Cita**: Se reemplazaron los componentes Radix UI `<Select>` del modal *"Modificar Datos de la Cita"* por selectores `<select>` nativos de HTML estilizados.
- Esto resolvió el problema visual donde se mostraban los identificadores UUID crudos (`59d7b4f4-ed8f...` / `d7e5e2bb-a7c4...`) dentro del campo cerrado, mostrando ahora de forma inmediata y 100% confiable:
  - **Clínica / Sede**: `Clinica Daniel Bustamante`
  - **Doctor / Profesional Principal**: `Dr. Osly Melo`

---

## 💻 Archivos Clave Modificados
---

## 5. 🖥️ Almacenamiento Remoto por FTP en IONOS VPS (`melosmile.com`)
- **Conexión Directa por Red (`basic-ftp`)**:
  - Se reestructuró la API `/api/documents/upload/route.ts` para transmitir archivos (fotos clínicas, informes PDF, etc.) por **FTP pasivo en el puerto 21** hacia la IP `94.143.139.120`.
  - Se eliminó el uso de `fs.mkdirSync` y `fs.writeFileSync` local, haciendo el sistema 100% compatible con **Vercel Serverless**.
- **Estructura Remota Organizativa**:
  - `melosmile.com/pacientes/{patient_id}/registros/{YYYY-MM-DD}/{timestamp}_{filename}` (Fotos clínicas).
  - `melosmile.com/pacientes/{patient_id}/docs/{timestamp}_{filename}` (PDFs e informes).
- **Procesamiento de Conocimiento**:
  - Al completar la subida FTP, guarda la metadata en Supabase y dispara la vectorización en n8n para documentos PDF.

---

## 6. 🏛️ Filtro Global de Sede Activa (`ClinicContext`)
- **React Context Unificado (`src/context/clinic-context.tsx`)**:
  - Hook `useClinic()` que consulta la lista de **4 sedes reales** desde Supabase (`Clinica Daniel Bustamante`, `Clínica Goya`, `Clínica Las Rozas`, `Clínica RyA`).
  - Mantiene la sede activa (`selectedClinicId`) sincronizada globalmente y guardada en `localStorage` (`melosmile_selected_clinic`).
- **Sidebar Dinámico**:
  - Desplegable **"SEDE ACTIVA"** con indicador visual por clínica y opción *"Todas las Clínicas"*.
- **Filtrado Reactivo en la Plataforma**:
  - **Agenda (`/`) y `CalendarView`**: Filtra citas e indicadores (citas del día, facturado en el mes, pacientes) según la sede activa.
  - **Facturación (`/billing`)**: Muestra únicamente las sesiones contables de la sede elegida.
  - **Fichas Pacientes (`/patients`)**: Filtra el listado de pacientes asociados a esa sede.
- **Middleware Exento**:
  - Exención de rutas de contexto e IA `/api/ai-context`, `/api/dispatcher` y `/api/billing/document-cleaner` en `middleware.ts`, garantizando la carga continua de sedes sin bloqueos 401.

---

## 💻 Archivos Clave Modificados en la Sesión
- [`src/context/clinic-context.tsx`](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/context/clinic-context.tsx)
- [`src/app/(dashboard)/layout.tsx`](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/app/(dashboard)/layout.tsx)
- [`src/components/layout/sidebar.tsx`](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/components/layout/sidebar.tsx)
- [`src/app/(dashboard)/page.tsx`](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/app/(dashboard)/page.tsx)
- [`src/app/(dashboard)/billing/page.tsx`](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/app/(dashboard)/billing/page.tsx)
- [`src/app/(dashboard)/patients/page.tsx`](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/app/(dashboard)/patients/page.tsx)
- [`src/app/api/documents/upload/route.ts`](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/app/api/documents/upload/route.ts)
- [`src/app/api/ai-context/route.ts`](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/app/api/ai-context/route.ts)
- [`src/middleware.ts`](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/middleware.ts)
- [`context.md`](file:///Users/munircallaos/Antigravity%20Projects/melosmile/context.md)
- [`roadmap.md`](file:///Users/munircallaos/Antigravity%20Projects/melosmile/roadmap.md)


---

## 5. 🏥 Planes de Tratamiento y Volcado de Históricos
- **Selección de Tipo de Tratamiento**: El modal de planes de tratamiento ahora permite seleccionar dinámicamente si el plan es de `Ortodoncia`, `Miofuncional` u `Otro`, y la cabecera verde de la ficha se actualiza automáticamente con esta información (ej. *Plan de Miofuncional Pautado*).
- **Ingesta de Históricos (Volcado)**: Se implementó el soporte manual en el formulario para registrar el histórico de `Mensualidades Ya Pagadas` y el `Monto Ya Pagado` total previo al uso de Melosmile.
- **Motor Inteligente de Cuotas**: El cálculo de cuotas completadas ahora suma transparentemente los controles registrados históricamente con los controles marcados como "Realizada" en el nuevo sistema, activando las alertas de "Revisión de Plan" al acercarse o completar el total de cuotas estipuladas.

---

## 6. 🚀 Notificaciones Permanentes, Bypass RLS y Correcciones de la Agenda
- **API Server-Side `/api/treatment-plans`**: Creado el endpoint backend con `SERVICE_ROLE_KEY` para lectura (`GET`), escritura (`POST`) y borrado (`DELETE`), resolviendo el bloqueo silencioso de Row Level Security (RLS) en Supabase para usuarios no autenticados en el navegador.
- **Eliminación de Planes de Tratamiento**: Opción de borrado añadida a la tarjeta del plan y al modal de edición.
- **Notificaciones Dinámicas Permanentes**: Sincronización en tiempo real con la campana de la cabecera mediante el evento `melosmile_notifications_updated`. Las alertas de revisión de cuotas ($\le 1$ cuota restante) permanecen visibles de forma dinámica en la campana (`Plan Activo`) y en la tarjeta del paciente.
- **Fix KPI "Citas para Hoy"**: Recuento preciso utilizando la fecha local (`YYYY-MM-DD`) y descartando citas canceladas, reflejando el número exacto de citas diarias.
- **Fix Navegación "Ver Paciente"**: Selección explícita de `id` y `historia_id` en la consulta del calendario (`calendar-view.tsx`), habilitando la redirección inmediata a `/patients/[id]` al pulsar en el modal de la cita.

---

## 7. 🔄 Redundancia, Dual MCP, Unificación de Citas & Protocolo de Borrado
- **Configuración de Supabase Local**: Entorno PostgreSQL local con Colima en `127.0.0.1:54321`. Exportación automática de la nube a `seed.sql`.
- **Dual MCP Configured**: Servidor `supabase-local` integrado en `mcp_config.json` conviviendo de forma transparente con `supabase` Cloud.
- **Guard IA Offline**: `ai-offline-guard.ts` detecta falta de internet en entorno local enviando alertas amigables al usuario.
- **Configuración Centralizada de Entorno (`src/config/env.ts`)**: Archivo estilo `wp-config.php` que abstrae y valida las variables de entorno, eliminando URLs hardcodeadas de producción de los clientes de Supabase.
- **Unificación Automática de Citas (`/api/appointments/create/route.ts`)**: Las citas de un mismo paciente agendadas a la misma hora se unifican automáticamente fusionando motivos, sumando precios e integrando observaciones clínicas en `notes`.
- **Protocolo de Borrado de Base de Datos ("Borra datos")**: Protocolo formalizado en `AGENTS.md` para vaciado secuencial de datos respetando Foreign Keys (local y cloud vía `clean_remote_db.js`), manteniendo la ficha limpia de Munir Mauel Callaos Cardama (`PAC-001`).
- **Comandos de Sesión Registrados**: `Inicia Sesión`, `Actualiza datos`, `Borra datos`, `Cierra sesión`.

---

## 8. 🛡️ Auditoría de Código y Preparación para Producción (COMPLETADO)
- **Eliminación de Credenciales Hardcodeadas**: Eliminados los JWTs fallback de `SUPABASE_SERVICE_ROLE_KEY` en `create/route.ts`, `update/route.ts`, `treatment-plans/route.ts` y `ai/report/route.ts`.
- **Credenciales de Login a Env Vars**: Modificado `auth/login/route.ts` para consumir `process.env.AUTH_USERNAME` y `process.env.AUTH_PASSWORD` con fallbacks para desarrollo local.
- **Móvil y Serverless URLs**: Eliminadas las llamadas internas estáticas `http://localhost:3028` en `document-cleaner/route.ts` y `auth/logout/route.ts`, sustituyéndolas por `INTERNAL_BASE_URL` dinámico (`NEXT_PUBLIC_APP_URL` / `VERCEL_URL` / `localhost`).
- **Fix de Hoisting en TypeScript**: Extraída la función `toTitleCase` fuera de `POST()` a nivel de módulo en `appointments/create/route.ts`.
- **Servicio Server-Side de Supabase (`supabaseAdmin`)**: Actualizados los endpoints `billing/sessions/route.ts`, `dispatcher/route.ts`, `billing/report/[id]/route.ts` y `ai/memory/search/route.ts` para usar `supabaseAdmin` y evitar bloqueos RLS.
- **Compilación Exitosa (Build Verificado)**: `npm run build` ejecutado y finalizado al 100% sin errores de compilación ni errores TypeScript (38 páginas dinámicas y estáticas generadas correctamente).

---

## 9. 🤖 Optimización de OpenCode a 22K, Conexión de MCPs y Manual `MANUAL_EQUIPOS_OPENCODE.md`

- **Presupuesto de Contexto Estable a 22K (22.528 Tokens):** Configurado en Ollama y `~/.config/opencode/opencode.jsonc` para eliminar el congelamiento y degradación del modelo a 32K.
- **Tool Calling Activo:** Habilitada la propiedad `"tools": true` en OpenCode para todos los modelos locales (`qwen2.5-coder:14b`, `gemma4:latest`, `gemma2:27b`, `deepseek-coder-v2:lite`).
- **MCP Servers Conectados:** Registrados los 4 servidores (`supabase`, `n8n`, `notion`, `github`) y verificados con `opencode mcp list`.
- **Manual Oficial de Equipos `MANUAL_EQUIPOS_OPENCODE.md`**: Creado el manual global en `~/.config/opencode/MANUAL_EQUIPOS_OPENCODE.md` detallando la arquitectura de **MumaBot** (Desarrollo) y **SecBot** (Ciberseguridad).
