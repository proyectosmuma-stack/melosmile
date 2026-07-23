# Documentación Sistema IA Multi-Agente — Melosmile

Este documento describe la arquitectura del sistema de Inteligencia Artificial conversacional de Melosmile, implementado sobre **n8n** con el patrón **Dispatcher → Sub-Agentes**.

---

## 1. Arquitectura General

```
[Frontend Chat UI]
        ↓  POST /api/dispatcher  (proxy Next.js — sin CORS)
[n8n Dispatcher — Yv9X1EGUvQg8qErW]
        ↓  toolWorkflow nativo (no HTTP, ejecución directa)
   ┌────┴────────────────────────────────┐
   ↓                    ↓               ↓
[Sub-Agent         [Sub-Agent      [Sub-Agent
 Agendamiento]      Clínico]        Contabilidad]
 jTWHg9bHaNOdzL13  Q7oxrbUuohca81Gn  XSLNwq6ihH1SHPRl
```

**Modelo LLM en todos los agentes**: `google/gemini-2.5-flash` via **OpenRouter**
- Credencial en n8n: `openRouterApi` (id: `4nco5fDnIohG6g9f`, nombre: "OpenRouter account")

---

## 2. Dispatcher IA (`Yv9X1EGUvQg8qErW`)

**Webhook**: `POST https://n8n.mumaweb.com/webhook/melosmile-ai-dispatcher`

### Nodos

| Nodo | Tipo | Función |
|------|------|---------|
| `Webhook_Receiver` | `n8n-nodes-base.webhook` v2.1 | Punto de entrada. `responseMode: responseNode` |
| `OpenRouter Chat Model` | `@n8n/n8n-nodes-langchain.lmChatOpenRouter` | LLM `google/gemini-2.5-flash` |
| `Dispatcher_AI_Agent` | `@n8n/n8n-nodes-langchain.agent` v1.7 | Agente principal que clasifica y delega |
| `Tool_SubAgent_Scheduling` | `@n8n/n8n-nodes-langchain.toolWorkflow` v2.2 | Delegación nativa a Sub-Agent Agendamiento |
| `Tool_SubAgent_Clinical` | `@n8n/n8n-nodes-langchain.toolWorkflow` v2.2 | Delegación nativa a Sub-Agent Clínico |
| `Tool_SubAgent_Billing` | `@n8n/n8n-nodes-langchain.toolWorkflow` v2.2 | Delegación nativa a Sub-Agent Contabilidad |
| `Parse_AI_Response` | `n8n-nodes-base.code` | Parseo del JSON del agente (extrae de bloques ```json ```) |
| `Respond_to_Webhook` | `n8n-nodes-base.respondToWebhook` v1.5 | Devuelve respuesta al frontend |

### Intents Reconocidos

| Intent | Descripción | Sub-Agente |
|--------|-------------|------------|
| `schedule_appointment` | Crear, modificar, mover o cancelar citas | Agendamiento |
| `patient_info` | Consultar historial, notas clínicas, anamnesis | Clínico |
| `billing` | Cobros pendientes, facturas, balances Odoo | Contabilidad |
| `clinical_note` | Registrar evolución médica | Clínico |
| `general_query` | Preguntas generales (sin sub-agente) | — |

### Respuesta JSON Estándar

```json
{
  "status": "success",
  "intent": "schedule_appointment",
  "extracted_entities": {
    "patient_name": "Munir",
    "date": "mañana",
    "time": "15:00",
    "clinic": "Goya",
    "treatments": ["limpieza", "revision de brackets"]
  },
  "summary": "La cita de Munir para mañana a las 15:00 ha sido agendada."
}
```

---

## 3. Sub-Agentes

### 3.1 Sub-Agent Agendamiento (`jTWHg9bHaNOdzL13`)

**Trigger**: `n8n-nodes-base.executeWorkflowTrigger` v1.1 (inputSource: `passthrough`)

| Herramienta | URL | Función |
|-------------|-----|---------|
| `Tool_Search_Patients` | `GET /api/patients/search?q={query}` | Busca paciente por nombre o teléfono |
| `Tool_Appointment_Manager` | `POST /api/appointments` | Crea o actualiza cita |

> ⚠️ URLs pendientes de conectar al API real de Supabase (`localhost:3028/api/...` o Vercel).

### 3.2 Sub-Agent Clínico (`Q7oxrbUuohca81Gn`)

**Trigger**: `executeWorkflowTrigger` v1.1 (passthrough)

| Herramienta | URL | Función |
|-------------|-----|---------|
| `Tool_Clinical_Context` | `GET /api/patients/{patient_id}/clinical` | Historial clínico completo |
| `Tool_Patient_Summary` | `GET /api/patients/{patient_id}/summary` | Resumen ejecutivo del paciente |

### 3.3 Sub-Agent Contabilidad (`XSLNwq6ihH1SHPRl`)

**Trigger**: `executeWorkflowTrigger` v1.1 (passthrough)

| Herramienta | URL | Función |
|-------------|-----|---------|
| `Tool_Odoo_Invoice` | `GET /api/invoices?query={query}` | Consulta facturas Odoo |
| `Tool_Reminders_Dispatcher` | `POST /api/billing/reminders` | Envía recordatorio de cobro |

---

## 4. Proxy Next.js (`/api/dispatcher`)

**Archivo**: [`frontend/src/app/api/dispatcher/route.ts`](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/app/api/dispatcher/route.ts)

Resuelve el problema de **CORS** — el browser no puede llamar directamente a `n8n.mumaweb.com` desde `localhost` o Vercel. El proxy corre en el servidor de Next.js y reenvía la petición al webhook de n8n sin restricciones de origen.

**Características**:
- Timeout de 30 segundos para peticiones lentas de Gemini.
- Normaliza respuestas vacías de n8n en JSON genérico.
- Convierte arrays en objeto único.
- Propaga `N8N_API_KEY` desde variables de entorno.

---

## 5. Chat UI Frontend

**Archivo**: [`frontend/src/components/dashboard/ai-agent-bar.tsx`](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/components/dashboard/ai-agent-bar.tsx)

### Características del Chat
- Historial de mensajes con burbujas diferenciadas (usuario / asistente).
- **Badge de Intent** por tipo de solicitud (coloreado por categoría).
- **Panel de entidades colapsable** — muestra paciente, fecha, hora, clínica, tratamiento extraídos.
- Spinner de carga mientras n8n procesa.
- Sugerencias de prompts predefinidos.
- `Enter` para enviar, `Shift+Enter` para salto de línea.
- Altura fija de 520px con scroll interno.

### Acceso al Chat
- **Botón flotante** `✦` en esquina inferior derecha (visible en todas las páginas).
- **Botón `✦ Agente IA`** en el header principal (morado).

---

## 6. Variables de Entorno Relevantes

```env
# En frontend/.env.local
N8N_WEBHOOK_BASE_URL=https://n8n.mumaweb.com
N8N_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 7. Pendientes

- [ ] Conectar `Tool_Search_Patients` y `Tool_Appointment_Manager` al API real de Supabase.
- [ ] Conectar `Tool_Odoo_Invoice` al API de Odoo real (`melosmile.odoo.com`).
- [ ] Añadir `memoryBufferWindow` al Dispatcher con `session_id` desde el frontend.
- [ ] Crear tabla `ai_conversation_history` en Supabase para auditoría de conversaciones.
