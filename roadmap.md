# Roadmap de Desarrollo — Melosmile

> ⚠️ **REGLA DE RAMAS**: Este archivo pertenece exclusivamente a la rama `develop` y NUNCA debe fusionarse a la rama `main`.

Este documento establece el plan de desarrollo, hitos alcanzados y próximos fases para la plataforma **Melosmile**.

---

## 📍 Estado Actual: Rama `develop` (Entorno `melosmile-staging`)

---

## 🎯 Fase 1: Arquitectura Base y UI/UX de Agenda (COMPLETADO)
- [x] Maquetación de la interfaz principal con Next.js App Router, TailwindCSS y Lucide Icons.
- [x] Vista de calendario semanal/diaria dividida en intervalos de 15 minutos con Supabase en tiempo real.
- [x] Funcionalidad de Drag & Drop para mover citas de hora/día dinámicamente y guardar en Supabase.
- [x] Tooltip de vista previa rápida al pasar el cursor sobre las citas (teléfono, email, ID `PAC-###`).
- [x] Rediseño de Ficha de Cita (`/appointments/[id]`) con texto libre de tratamiento, evolución clínica estilo Notion y subida de archivos.
- [x] Directorio de Fichas de Pacientes (`/patients`) con selector de vista en Tarjetas / Listado, filtros y formulario completo de alta.
- [x] Ficha Histórica del Paciente (`/patients/[id]`) con historial unificado, edad calculada automáticamente y documentos estilo Notion a ancho completo.
- [x] Formulario de Edición de Paciente (`/patients/[id]/edit`) con soporte para menores de edad, representantes legales, vinculación multiclínica y datos de facturación Odoo.
- [x] **Sistema de Etiquetas estilo WordPress**:
  - [x] Tablas PostgreSQL `tags` y `patient_tags`.
  - [x] Autocompletado `TagInput` con sugerencias dinámicas y creación sobre la marcha (`+ Crear etiqueta "[query]"`).
  - [x] Barra de Filtros por Etiquetas en el directorio `/patients` y badges en las fichas del paciente.
- [x] Lógica de cálculos financieros con sobrescritura por cita de `% Comisión` y `% Descuento Laboratorio`.

---

## 🚀 Fase 2: Conexión con Supabase y Autenticación (COMPLETADO)
- [x] Instalación de `@supabase/supabase-js` y creación del cliente ([src/lib/supabase/client.ts](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/lib/supabase/client.ts)).
- [x] Diseño e inicialización de la CLI de Supabase con `supabase init` y vinculación del proyecto `amhfdzfcmpastmlsosou`.
- [x] Despliegue de migración inicial ([20260722000000_initial_schema.sql](file:///Users/munircallaos/Antigravity%20Projects/melosmile/supabase/migrations/20260722000000_initial_schema.sql)).
- [x] Creación de migración de esquema extendido ([20260722000002_extended_schema.sql](file:///Users/munircallaos/Antigravity%20Projects/melosmile/supabase/migrations/20260722000002_extended_schema.sql)).
- [x] Creación de migración de esquema de etiquetas ([20260722000003_tags_schema.sql](file:///Users/munircallaos/Antigravity%20Projects/melosmile/supabase/migrations/20260722000003_tags_schema.sql)).
- [x] Generación de tipos estáticos TypeScript desde Supabase Cloud ([src/lib/supabase/types.ts](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/lib/supabase/types.ts)).
- [x] Configuración de variables de entorno de producción/desarrollo (`.env.local` y Vercel).
- [x] Conexión del buscador autocompletado de pacientes (`PatientSelect`) mediante peticiones Ajax en tiempo real a Supabase.
- [x] Compatibilidad completa con **Next.js 16 / React 19** mediante `React.use(params)` para desempaquetar parámetros dinámicos.

---

## 🏗️ Fase 3: Módulo de Configuración — Clínicas, Profesionales y Tratamientos (COMPLETADO)
- [x] **Documentación completa**: ([docs/configuration_module.md](file:///Users/munircallaos/Antigravity%20Projects/melosmile/docs/configuration_module.md)).
- [x] **Migración BD 005**: Nuevas tablas `treatment_families` y `clinic_commission_rules`, columnas `actual_lab_cost` + `profitability_status` en `billing_records`.
- [x] **Datos Semilla**: 10 familias de tratamientos (Ortodoncia, Implantología, Endodoncia, etc.) y 50+ tratamientos con precios y costes de laboratorio típicos.
- [x] **Sidebar expandible**: Sub-menú de Configuración con 3 sub-secciones (Clínicas, Profesionales, Tratamientos).
- [x] **Página Hub de Configuración** (`/settings`): Cards de navegación a las 3 sub-secciones.
- [x] **CRUD Clínicas** (`/settings/clinics`): Alta/edición con dirección, teléfono, email, color y % comisión base. Panel de reglas de comisión por familia expandible.
- [x] **CRUD Profesionales** (`/settings/professionals`): Alta/edición de colaboradores asociados a sedes (reglas financieras centralizadas en la clínica).
- [x] **Ficha del Profesional** (`/settings/professionals/[id]`): Vista de perfil estilo Notion con métricas (citas atendidas, citas mes, pacientes distintos), historial de citas y notas internas.
- [x] **CRUD Tratamientos** (`/settings/treatments`): Catálogo agrupado por familia con búsqueda, precios y costes de laboratorio típicos.
- [x] **Modales de Confirmación Custom**: Modales React `<Dialog>` para eliminación de entidades, eliminando cierres prematuros de ventana nativa.
- [x] **Rentabilidad por Tratamiento** (`/appointments/[id]`): Campo "Gasto Lab Real (€)", cálculo de neto en tiempo real, badge de alerta 🔴 EN PÉRDIDA / 🟡 MARGEN BAJO / 🟢 Rentable.
- [x] **Fix popup modal**: Clínica y Profesional cargando nombres reales desde Supabase (no UUIDs). Estado de carga visible.
- [x] **API `/api/ai-context`**: Endpoint JSON para el agente IA con todo el catálogo, reglas de comisión y fórmulas de cálculo.

---

## 💼 Fase 4: Integración con Odoo y Facturación (COMPLETADO)
- [x] Creación del cliente JSON-RPC Odoo ([src/lib/odoo/client.ts](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/lib/odoo/client.ts)).
- [x] API Route `GET /api/odoo/products` para consultar el catálogo de servicios de Odoo.
- [x] API Route `POST /api/odoo/invoice` para búsqueda/creación de contactos (`res.partner`) y generación de facturas borrador en Odoo.
- [x] Vinculación de `odoo_partner_id` y `odoo_invoice_id` con Supabase.

---

## 🤖 Fase 5: Integración de IA y Workflows n8n — Agente Musly (COMPLETADO)
- [x] Creación del flujo enrutador `[MELOSMILE] AI Dispatcher` (**Musly**) (`04-melosmile-ai-dispatcher-v2.json`).
- [x] Importación y activación de 4 workflows en la instancia n8n (`https://n8n.mumaweb.com`).
- [x] Conexión de la barra conversacional del frontend (`AIAgentBar`) mediante proxy server-side Next.js `/api/dispatcher`.
- [x] Sub-agentes especializados en n8n conectados por `toolWorkflow` (Agendamiento, Clínico, Contabilidad).
- [x] Conexión de herramientas a Supabase real con emparejamiento automático de tratamientos (`treatment_id`) y facturación Odoo.
- [x] Implementación de Memoria Conversacional (historial de sesión) e Historial de Auditoría en Supabase (`ai_conversation_history`).
- [x] **Sistema de Reporte de Errores y Contexto IA (`logs/agent_reports.log`)**: Botón en respuestas del asistente para reportar fallos de lógica con formulario modal, fecha/hora, comentario del usuario, agentes involucrados e historial completo.
- [x] **Regla Global de Profesional Tratante por Defecto**: Asignación automática de la **Dra. Osly Melo** en la creación y visualización de citas por el agente o API.
- [x] **Fix de Edición y Carga de Citas (`/appointments/[id]`)**: Auto-emparejamiento con el catálogo `treatments`, carga automática de precios por defecto y gastos de laboratorio sin pérdida de datos al guardar o recargar.

---

## 🧠 Fase 6: Aprendizaje Dinámico Autónomo & Memoria Semántica (COMPLETADO)
- [x] **Tabla `agent_learnings` en Supabase**: PostgreSQL con índices y políticas RLS para lectura y escritura de modismos y preferencias.
- [x] **Endpoints Backend Next.js**:
  - `GET /api/ai/memory/search`: Búsqueda difusa/semántica de reglas activas.
  - `POST /api/ai/memory/learn`: Guardado en caliente (*upsert*) de nuevos aprendizajes del agente.
- [x] **Regla Global Anti-Alucinación**: Inyectada en los 4 agentes n8n para forzar la confirmación con el usuario antes de asumir o alucinar datos.
- [x] **Herramientas n8n Desplegadas**: `Tool_Search_Memory` y `Tool_Save_Learning` en producción.
- [x] **Borrado Físico (HARD DELETE) & Filtro Inteligente de Agenda**:
  - Endpoint `/api/appointments/update` soporta `action: "delete"` para eliminar citas físicamente de la base de datos a petición del usuario.
  - Endpoint `/api/appointments/list` excluye automáticamente citas canceladas por defecto para mantener la agenda diaria/semanal limpia.

---

## 🛡️ Fase 7: Arquitectura Dispatcher 7-Pasos, Sub-Agente General, Desambiguación de Identidad & Verificación Supabase (COMPLETADO)
- [x] **Sub-Agente General de FAQs (`07-melosmile-agent-general.json`)**: Implementado y activado el 4º sub-agente (`MIok0ruU7JhpTxWv`) para consultas de horarios de sedes (Goya, Albacete, Las Rozas), ubicaciones, servicios ofrecidos y precios orientativos.
- [x] **Temperatura Determinista 0 & Retry en Herramientas**: Configurado `temperature: 0` en OpenRouter Chat Model y `retryOnFail` (2 intentos) en todas las llamadas `toolWorkflow`.
- [x] **Filtro de Tokens Estáticos**: Exclusión del saludo de bienvenida inicial (`"Hola 👋 Soy Musly..."`) en Frontend (`historySnapshot`) y n8n para reducir el consumo innecesario de tokens.
- [x] **Regla Crítica de Identidad de Paciente & Corrección de Seguimiento**: Desambiguación estricta entre la persona que consulta (ej. *"Dra. Osly Melo"*) y el paciente real de la cita (`patient_name`), con reutilización de contexto en mensajes de seguimiento cortos.
- [x] **Verificación Nativa & Restauración Supabase**:
  - Auditada la tabla `appointments` vía SDK Supabase (`SUPABASE_SERVICE_ROLE_KEY`).
  - Restablecida la cita de Munir Manuel Callaos Cardama a su fecha original (**Viernes 24 de Julio de 2026 a las 16:30**).
  - Evaluada la cita de Test General (**Martes 28 de Julio de 2026 a las 13:00 / 15:00**).
  - Verificada la prueba conversacional en 4 turnos comparada 100% contra el estado real de Supabase.
  - Herramienta `Tool_Update_Appointment` en n8n desplegada con soporte para modificación y borrado físico.
- [x] **Resolución de Memoria de Sesión y Contexto Anafórico (Multiturno)**: Transmisión del historial conversacional completo en n8n Dispatcher, reescritura automática de peticiones relativas ("cambia esa cita"), mapeo robusto de parámetros (`patient_name`, `patient`, `date`, `time`) en `Tool_Update_Appointment` y resolución en backend Next.js.
- [x] **Auditoría & Resolución Continua de `agent_log`**: Proceso activo de lectura, corrección de causas raíz y resolución de reportes de error en Supabase (`ai_agent_reports`).

---

## 💰 Fase 8: Módulo de Cálculo y Facturación Contable — Modelo ALBACETE (COMPLETADO)
- [x] **Modelo de Referencia ALBACETE DEFINITIVO**:
  - Análisis del Excel `ALBACETE DEFINITIVO.xlsx` (55 hojas mensuales 2021–2026, hoja `Resumen` por servicio y hoja `Pivot` por paciente).
  - Estructura estándar de 19 columnas de contabilidad clínica.
- [x] **Migración PostgreSQL Supabase (`20260727000000_billing_calculation_schema.sql`)**:
  - Tabla `billing_sessions` organizada por `(clinic_id, year, month)` único.
  - Tabla `billing_session_lines` con 19 columnas y flags de control.
  - Extensión a `clinics` con campos `tracks_payments` y `lab_discount_pct`.
- [x] **Razonamiento de Tratamientos y Emparejamiento BD (`frontend/src/lib/billing/calculator.ts`)**:
  - Refactorizado el motor de interpretación para sobreescribir entradas genéricas o vacías con la coincidencia exacta del catálogo.
- [x] **Sugerencia Inteligente de Aparatología y Gastos de Lab (`TREATMENT_LAB_SUGGESTIONS`)**:
  - Auto-sugerencia de trabajos de laboratorio y costes según el tratamiento (Ortodoncia Invisible 700€, Brackets Metálicos 350€, Coronas Zirconio 300€).
  - Celdas sugeridas destacadas en amarillo (`bg-amber-50`) con la insignia `💡 Sugerido`.
- [x] **Dropdowns Interactivos del Catálogo BD**:
  - Dropdowns para Paciente, Tratamiento (catálogo completo) y Equipo de Laboratorio.
- [x] **Cálculo de Porcentaje y Monto Médico (`% Dr.`, `€ Dr.`)**:
  - Visualización y edición del porcentaje y honorarios del médico en cada línea y desglose global en el footer pegajoso.
- [x] **Médico Tratante por Defecto — Dra. Osly Melo**:
  - Asignación obligatoria de la **Dra. Osly Melo** (`d7e5e2bb-a7c4-44f6-9ef8-ba453e7dc477`) a todas las citas agendadas o vinculadas durante el procesamiento contable.
- [x] **Auto-Creación Secuencial (`PAC-00X`) y Enlace a Ficha del Paciente**:
  - `getNextHistoriaId`: Generación limpia e incremental de códigos de historia médica (`PAC-006` a `PAC-030`).
  - Enlace directo con icono en la celda de cada paciente (`/patients/[id]`) para consultar su historial médico en pestaña nueva.
- [x] **Fix de Ficha de Cita (`/appointments/[id]`)**:
  - Mapeo robusto de cadenas de texto en `notes` a objetos `ProcedureItem` con `treatmentId` válido para pre-seleccionar correctamente el dropdown de tratamiento.

### Fase 5: Billing Driven by Appointments & Document Cleaner 🟢
- [x] Motor de Generación de Sesiones Contables desde Citas (`appointments-to-lines.ts`).
- [x] Múltiples líneas contables por cita (soporte para N procedimientos en una misma cita).
- [x] Endpoint `GET /api/billing/sessions/generate` para crear/refrescar la sesión en base a citas `Realizadas`.
- [x] Integración en UI `/billing/[id]` de botón "Actualizar desde Citas" que preserva ajustes manuales.
- [x] Portal de Importación Multimodal `Document Cleaner Portal` en `/billing/new` conectado a proxy `/api/billing/document-cleaner`.
- [x] Flujo N8N `[MELOSMILE] Agent Document Cleaner` (`OG4Yy4N7qALXojTa`) implementado con enrutador `If Node` para imágenes y textos.
- [x] Agente de Visión en OpenRouter con `google/gemini-2.5-flash` para extracción precisa de agendas manuscritas.
- [x] **Reglas de Negocio & Inteligencia de Ingesta**:
  - [x] Diccionario de clínica: traducción automática de `RC` / `R.C.` a `Reconstrucción Compleja`.
  - [x] Agrupamiento por paciente y hora en 1 sola cita con array de tratamientos y suma de importes.
  - [x] Respeto estricto de precios en euros escritos en la agenda sobre precios por defecto del catálogo.
  - [x] Búsqueda inteligente por nombre de pila (asociación a paciente si hay 1 coincidencia; marca `Pendiente de Revisión` si hay múltiples homónimos).
  - [x] Exclusión automática de citas tachadas (`status: 'Cancelada'`) de la facturación contable.
  - [x] **Selección Manual del Día en Importación de Billing**: Campo opcional de selección de Día del Mes (Día 1 a Día 31) en `/billing/new` como fallback o asignación explícita cuando el documento importado no contiene el número de día.

---

## 🔧 Pendiente

- [x] **Intención `add_procedure_to_appointment`**: El agente n8n actualmente solo soporta la creación de nuevas citas (`schedule_appointment`). Se debe añadir soporte para que el agente pueda añadir procedimientos adicionales a una cita ya existente sin sobrescribir los procedimientos anteriores.

### Fase 6: Planes de Tratamiento, Notificaciones y Fixes de Agenda 🟢
- [x] Soporte para diferentes tipos de planes de tratamiento (`Ortodoncia`, `Miofuncional`, `Otro`) y planes simultáneos en la ficha.
- [x] Registro manual de **Mensualidades Ya Pagadas** y **Monto Ya Pagado** para migración de datos (volcado histórico).
- [x] Motor de alertas unificado (Histórico + Registrado) para avisos automáticos al completarse las cuotas.
- [x] API Server-Side `/api/treatment-plans` (`GET`, `POST`, `DELETE`) para bypass seguro del bloqueo RLS en Supabase.
- [x] Opción de eliminación de plan desde la tarjeta y dentro del modal de edición.
- [x] Sincronización en tiempo real y permanencia de alertas dinámicas en la campana de notificaciones del encabezado (`melosmile_notifications_updated`).
- [x] Fix del contador KPI "Citas para Hoy" en la Agenda Principal con fecha local `YYYY-MM-DD` y filtro estricto de citas no canceladas.
- [x] Fix de la propiedad `id`/`historia_id` en las consultas de `calendar-view.tsx` y redirección inmediata al pulsar "Ver Paciente" en el drawer de la cita.

### Fase 7: Sincronización Local, Dual MCP, Unificación de Citas & Protocolo de Borrado 🟢
- [x] Configuración de Supabase Local con Colima (`127.0.0.1:54321`) y exportación automática de seed data.
- [x] Configuración Dual MCP (`supabase` Cloud + `supabase-local`) en `mcp_config.json`.
- [x] Guard de Conexión IA Offline en desarrollo local (`ai-offline-guard.ts`).
- [x] Protocolos de sesión formalizados en `AGENTS.md` (`Inicia Sesión`, `Actualiza datos`, `Borra datos`, `Cierra sesión`).
- [x] Configuración Centralizada de Entorno (`src/config/env.ts`, estilo `wp-config.php`).
- [x] Unificación Automática de Citas a la misma hora para el mismo paciente en la API (`/api/appointments/create/route.ts`).
- [x] Protocolo y script de limpieza de base de datos (`clean_remote_db.js` y `unify_duplicate_appointments.js`).

### Fase 8: Auditoría Completa de Producción & Hardening de Seguridad 🟢
- [x] Eliminación de credenciales hardcodeadas (JWTs fallback de Supabase) en todos los endpoints API.
- [x] Migración de credenciales de login a `AUTH_USERNAME` y `AUTH_PASSWORD`.
- [x] Sustitución de URLs `localhost:3028` por `INTERNAL_BASE_URL` dinámico para Vercel serverless.
- [x] Corrección de scoping/hoisting de funciones en TypeScript (`toTitleCase`).
- [x] Cambio de cliente Supabase cliente → `supabaseAdmin` en endpoints server-side para evitar bloqueos RLS.
- [x] Compilación y build verificado al 100% con `npm run build` (38 rutas compiladas sin errores).



