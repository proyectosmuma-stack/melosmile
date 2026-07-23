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

### 🤖 Sistema IA Conversacional Multi-Agente
- [x] Dispatcher IA en n8n con OpenRouter `google/gemini-2.5-flash` (workflow `Yv9X1EGUvQg8qErW`).
- [x] Sub-Agente Agendamiento con `executeWorkflowTrigger` + OpenRouter (workflow `jTWHg9bHaNOdzL13`).
- [x] Sub-Agente Clínico con `executeWorkflowTrigger` + OpenRouter (workflow `Q7oxrbUuohca81Gn`).
- [x] Sub-Agente Contabilidad con `executeWorkflowTrigger` + OpenRouter (workflow `XSLNwq6ihH1SHPRl`).
- [x] Chat UI completo en frontend con burbujas, historial, badges de intent y entidades colapsables.
- [x] Proxy Next.js `/api/dispatcher` para evitar CORS (browser → servidor → n8n).
- [x] Botón flotante + botón en header con modal de chat global.
- [ ] **Conectar herramientas de Sub-Agentes a APIs reales de Supabase** (pacientes, citas).
- [ ] **Conectar herramientas de Sub-Agente Contabilidad a Odoo ERP** (facturas pendientes).
- [ ] **Añadir memoria conversacional** (Window Buffer Memory nativo n8n + `session_id` en frontend).
- [ ] **Persistencia de historial en Supabase** (tabla `ai_conversation_history` para auditoría).

### ⚙️ Interfaz & Ajustes UI
- [x] **Ajuste Asistente IA Flotante**: TextArea expandible con atajo `Enter` (enviar) y `Shift+Enter` (salto de línea).
- [x] **Disponibilidad Global del Chat IA**: Botón flotante omnipresente + botón en cabecera superior.
- [x] **Panel de respuesta del Dispatcher**: Chat completo con feedback visual de intent, entidades y respuesta del agente.

---

## 🔄 3. Instrucciones de Mantenimiento de `tareas.md`
1. Al completar cualquier requerimiento o sugerencia del usuario, actualizar la casilla correspondiente de `[ ]` a `[x]`.
2. Al proponer nuevos flujos de n8n o módulos, añadirlos a la sección 1 o 2 manteniendo la numeración.
3. Este archivo debe mantenerse alineado con `walkthrough.md` y la documentación técnica de `docs/`.
