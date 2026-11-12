# Tareas & Roadmap de Inteligencia — Melosmile

Este documento registra el estado del proyecto, el listado exhaustivo de los **flujos de n8n** planteados, y la lista de tareas activas para seguimiento continuo entre sesiones.

---

## 🚀 1. Listado de Flujos n8n Planteados

| ID Flujo | Nombre del Flujo | Webhook / Endpoint | Descripción & Modelo | Estado |
|----------|------------------|-------------------|----------------------|--------|
| **N8N-01** | `melosmile-document-vectorizer` | `POST /api/documents/vectorize` | Extracción de texto con Gemini Flash, fragmentación y generación de embeddings vectoriales en Supabase para PDFs/documentos adjuntos. | ✅ Operativo |
| **N8N-02** | `melosmile-appointment-analyzer` | `POST /api/ai/analyze-appointment` | Análisis automático al guardar notas de cita. Detecta la pauta de seguimiento y sugiere fecha de la próxima cita. Gatilla el anillo degradado morado en el perfil. | ✅ Operativo |
| **N8N-03** | `melosmile-patient-summary` | `POST /api/ai/patient-summary` | Generación de síntesis técnica clínica en el perfil del paciente basándose estrictamente en las notas reales de las citas (sin inventar). | ✅ Operativo |
| **N8N-04** | `melosmile-reminders-dispatcher` | `POST /api/reminders/send-now` | Despacho multi-canal (WhatsApp 💬, Email 📧, SMS 📱) de recordatorios de citas, avisos de alineadores y cobros. | ✅ Operativo |
| **N8N-05** | `melosmile-odoo-sync` | `POST /api/odoo/invoice` | Sincronización bidireccional y emisión de facturas agrupadas en Odoo ERP (`res.partner` y `account.move`). | ✅ Operativo |
| **N8N-06** | `melosmile-ai-dispatcher` | `POST /webhook/melosmile-ai-dispatcher` | Dispatcher IA central con Gemini 2.5 Flash (OpenRouter). Clasifica intenciones (`schedule_appointment`, `patient_info`, `billing`, `clinical_note`, `general_query`) y delega al sub-agente correcto vía `toolWorkflow` nativo. | ✅ Operativo |
| **N8N-07** | Sub-Agent: Agendamiento | `executeWorkflowTrigger` (passthrough) | Sub-agente especializado en interpretar fechas relativas y procesar agendamiento/modificación/cancelación de citas. Herramientas: `Tool_Search_Patients`, `Tool_Appointment_Manager`. | ✅ Activo — Herramientas pendientes conexión real |
| **N8N-08** | Sub-Agent: Clínico | `executeWorkflowTrigger` (passthrough) | Sub-agente especializado en consultas de historial clínico, notas de evolución y anamnesis. Herramientas: `Tool_Clinical_Context`, `Tool_Patient_Summary`. | ✅ Activo — Herramientas pendientes conexión real |
| **N8N-09** | Sub-Agent: Contabilidad | `executeWorkflowTrigger` (passthrough) | Sub-agente especializado en cobros pendientes y emisión de facturas Odoo. Herramientas: `Tool_Odoo_Invoice`, `Tool_Reminders_Dispatcher`. | ✅ Activo — Herramientas pendientes conexión real |

> **Nota**: Las skills especializadas de creación de flujos (`n8n-mcp-tools-expert`, `n8n-node-configuration`, `n8n-multi-agent-architect`) han sido copiadas en `.agents/skills/` para consulta directa en este proyecto.

---

## 📋 2. Matriz de Tareas por Módulo

### 🏥 Ficha de Cita (`/appointments/[id]`)
- [x] Cabecera estilo Notion con avatar, historia `PAC-###`, clínica y selector de estado.
- [x] Banner de Alerta Médica de Anamnesis (Alergias, Antecedentes, Medicación).
- [x] Multi-procedimiento por sesión con precios de catálogo y panel `⚙️ Modificar valores` (overrides locales).
- [x] Calculadora Financiera y Rentabilidad colapsable ($) ubicada por **encima del odontograma** al activarse.
- [x] Odontograma FDI interactivo con soporte permanente (11-48) y de leche (51-85) para menores.
- [x] Registro fotográfico directo a VPS (`/opt/melosmile/pacientes/{id}/registros/{fecha}/`) sin vectorizar.
- [x] Adjuntos de documentos en VPS con vectorización n8n.
- [x] Menú de botones superiores con **`Dr. Colaborador`** (desplegable con selector de BD y creación `+ Guardar en BD`) y **`Contabilidad ($)`**.
- [x] Análisis IA automático al guardar cita con indicación visual de **anillo degradado morado** alrededor del avatar del paciente.

### 👤 Ficha del Paciente (`/patients/[id]`)
- [x] Disposición en 2 columnas: Resumen IA + Plan a la izquierda, Odontograma Base a la derecha.
- [x] Odontograma General consolidado en solo lectura por defecto, con botones `✏️ Editar Base` y `💾 Guardar Base` bajo confirmación.
- [x] Historial de Citas con navegación directa a `/appointments/[id]` mostrando profesional principal y doctor invitado: `Dra. Osly Melo (+ Dr. Carlos Pérez)`.
- [x] Pestaña Facturación con selección multi-cobro mediante checkboxes y facturación agrupada Odoo (`Facturada INV/2026/XXXX` vs `Por Facturar`).
- [x] Pestaña Recordatorios con modal `NewReminderModal` multi-canal (WhatsApp, Email, SMS) y botón `Enviar Ahora`.

### 🤖 Sistema IA Conversacional Multi-Agente (Musly)
- [x] Dispatcher IA (Musly) en n8n con OpenRouter `google/gemini-2.5-flash` (workflow `Yv9X1EGUvQg8qErW`).
- [x] Sub-Agente Agendamiento con `executeWorkflowTrigger` + OpenRouter (workflow `jTWHg9bHaNOdzL13`).
- [x] Sub-Agente Clínico con `executeWorkflowTrigger` + OpenRouter (workflow `Q7oxrbUuohca81Gn`).
- [x] Sub-Agente Contabilidad con `executeWorkflowTrigger` + OpenRouter (workflow `XSLNwq6ihH1SHPRl`).
- [x] Chat UI completo en frontend con burbujas, historial, badges de intent y entidades colapsables. Renombrado globalmente a **Musly**.
- [x] Proxy Next.js `/api/dispatcher` para evitar CORS (browser → servidor → n8n).
- [x] Botón flotante solo con icono de estrella (sin texto) + sidebar colapsable por defecto con tooltips.
- [x] **Conectar herramientas de Sub-Agentes a APIs reales de Supabase** (pacientes, citas con emparejamiento automático en la tabla `treatments`).
- [x] **Conectar herramientas de Sub-Agente Contabilidad a Odoo ERP** (facturas pendientes).
- [x] **Añadir memoria conversacional** (Inyección de historial conversacional desde `ai-agent-bar.tsx` hacia los nodos de n8n).
- [x] **Persistencia de historial en Supabase** (tabla `ai_conversation_history` para auditoría).
- [x] **Navegación directa desde el Calendario**: Botón "Ver Ficha Completa" en la ficha flotante para editar la cita en `/appointments/[id]`.
- [x] **Sistema de Reporte de Errores y Contexto IA (`logs/agent_reports.log`)**: Botón en respuestas del asistente para reportar fallos de lógica con formulario modal, fecha/hora, comentario del usuario, agentes involucrados e historial completo.
- [x] **Regla Global de Profesional Tratante por Defecto**: Asignación automática de la **Dra. Osly Melo** en la creación y visualización de citas por el agente o API.
- [x] **Fix de Edición y Carga de Citas (`/appointments/[id]`)**: Auto-emparejamiento con el catálogo `treatments`, carga automática de precios por defecto y gastos de laboratorio sin pérdida de datos al guardar o recargar.
- [x] **Regla Global Anti-Alucinación**: Implementación de la directiva de confirmación previa en los 4 agentes en n8n (`Dispatcher`, `Scheduling`, `Clinical`, `Billing`).
- [x] **Sistema de Aprendizaje Dinámico Autónomo**: Tabla Supabase `agent_learnings`, endpoints `/api/ai/memory/search` y `/api/ai/memory/learn`, y herramientas n8n `Tool_Search_Memory` + `Tool_Save_Learning`.
- [x] **Borrado Físico (HARD DELETE) de Citas**: Soporte para `action: "delete"` en `/api/appointments/update` e integración de `Tool_Update_Appointment` en n8n para eliminar citas físicamente a petición del usuario.
- [x] **Filtro Automático de Agenda Limpia**: Exclusión de citas con estado `Cancelada` por defecto en `/api/appointments/list` para evitar contaminar la consulta diaria o semanal del profesional.
- [x] **Auditoría & Resolución de `agent_log`**: Verificación y resolución continua de reportes de error en Supabase (`ai_agent_reports`).

### ⚙️ Interfaz & Ajustes UI
- [x] **Ajuste Asistente IA Flotante**: TextArea expandible con atajo `Enter` (enviar) y `Shift+Enter` (salto de línea).
- [x] **Disponibilidad Global del Chat IA**: Botón flotante omnipresente + botón en cabecera superior.
- [x] **Panel de respuesta del Dispatcher**: Chat completo con feedback visual de intent, entidades y respuesta del agente.

---

## 🔄 3. Instrucciones de Mantenimiento de `tareas.md`
1. Al completar cualquier requerimiento o sugerencia del usuario, actualizar la casilla correspondiente de `[ ]` a `[x]`.
2. Al proponer nuevos flujos de n8n o módulos, añadirlos a la sección 1 o 2 manteniendo la numeración.
3. Este archivo debe mantenerse alineado con `walkthrough.md` y la documentación técnica de `docs/`.
