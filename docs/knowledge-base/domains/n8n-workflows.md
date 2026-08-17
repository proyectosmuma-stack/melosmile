# 🤖 Dominio: Arquitectura y Contratos de Workflows n8n (Melosmile)

Este documento describe la topología, contratos, flujos y endpoints que componen el sistema multi-agente de **Melosmile** en n8n.

---

## 1. Topología General del Sistema Multi-Agente

El sistema de Melosmile sigue el patrón **AI Dispatcher & Tool Workflows**, donde un agente central clasifica la intención del usuario y delega la ejecución a sub-agentes especializados:

```mermaid
flowchart TD
    User([💬 Paciente / Usuario]) --> Webhook[Webhook / WhatsApp Dispatcher]
    Webhook --> Dispatcher[01_MELOSMILE_AI_Dispatcher]
    
    Dispatcher -->|Intención de Citas / Agenda| Agendamiento[02_MELOSMILE_SubAgent_Agendamiento]
    Dispatcher -->|Consulta Médica / Historial| Clinico[03_MELOSMILE_SubAgent_Clinico]
    Dispatcher -->|Pagos / Presupuestos| Contabilidad[04_MELOSMILE_SubAgent_Contabilidad]
    Dispatcher -->|Información Sede / Horarios| General[05_MELOSMILE_SubAgent_General]
    
    DocIngest([📸 Foto de Agenda / PDF]) --> Cleaner[06_MELOSMILE_Agent_Document_Cleaner]
    Cleaner -->|Extracción OCR Estructurada| Dispatcher
    
    Agendamiento -->|HTTP POST/GET| API_Appointments[API: /api/appointments]
    Clinico -->|HTTP POST/GET| API_Patients[API: /api/patients]
    Contabilidad -->|HTTP POST/GET| API_Billing[API: /api/billing]
```

---

## 2. Catálogo de Flujos y Fichas Técnicas

### `01_MELOSMILE_AI_Dispatcher`
* **ID en n8n:** `Yv9X1EGUvQg8qErW`
* **Rol:** Orquestador principal de mensajes entrantes (WhatsApp / Web / Chatbot).
* **Entrada:** Payload de mensaje con `sessionId`, `userMessage`, `phone_number`.
* **Herramientas (Tool Workflows Conectados):**
  * `toolWorkflow_Agendamiento` (ID: `jTWHg9bHaNOdzL13`)
  * `toolWorkflow_Clinico` (ID: `Q7oxrbUuohca81Gn`)
  * `toolWorkflow_Contabilidad` (ID: `XSLNwq6ihH1SHPRl`)
  * `toolWorkflow_General` (ID: `MIok0ruU7JhpTxWv`)

---

### `02_MELOSMILE_SubAgent_Agendamiento`
* **ID en n8n:** `jTWHg9bHaNOdzL13`
* **Rol:** Gestión del ciclo de vida de citas y disponibilidad.
* **Endpoints de Melosmile Vinculados:**
  * `POST /api/appointments` (Crear cita)
  * `GET /api/appointments?date={date}&clinic_id={clinic_id}` (Consultar agenda)
  * `PATCH /api/appointments/{id}` (Reprogramar/Cancelar)
* **Reglas Clínicas Aplicadas:**
  * Respeta el diccionario de tratamientos (RC = Reconstrucción, Rev = Control).
  * Regla de agrupación: Mismo paciente a la misma hora se unifica en una sola cita sumando importes.

---

### `03_MELOSMILE_SubAgent_Clinico`
* **ID en n8n:** `Q7oxrbUuohca81Gn`
* **Rol:** Consulta y registro de evolución médica.
* **Endpoints de Melosmile Vinculados:**
  * `GET /api/patients/{id}` (Ficha y antecedentes)
  * `POST /api/patients/{id}/notes` (Evolución clínica)
* **Regla Estricta:** Las observaciones no facturables (ej: *Poner ataches, IPR*) se registran estrictamente en el campo `notes` y no como citas o cobros separados.

---

### `04_MELOSMILE_SubAgent_Contabilidad`
* **ID en n8n:** `XSLNwq6ihH1SHPRl`
* **Rol:** Registro de cobros, métodos de pago y presupuestos.
* **Endpoints de Melosmile Vinculados:**
  * `GET /api/billing`
  * `POST /api/billing/sessions`
  * `POST /api/billing/payments`

---

### `05_MELOSMILE_SubAgent_General`
* **ID en n8n:** `MIok0ruU7JhpTxWv`
* **Rol:** Respuestas a preguntas frecuentes sobre ubicación, horarios y profesionales de las clínicas (Albacete / Albi).

---

### `06_MELOSMILE_Agent_Document_Cleaner`
* **ID en n8n:** `OG4Yy4N7qALXojTa`
* **Rol:** Extracción OCR y limpieza de imágenes de agendas manuscritas.
* **Salida:** JSON estructurado listo para inserción en base de datos.

---

## 3. Estándares de Seguridad y Autenticación
Todas las peticiones HTTP que los nodos de n8n envían hacia la API de Melosmile (`https://melosmile-staging-git-develop-proyectosmuma-stacks-projects.vercel.app`) deben incluir la cabecera:
```http
x-api-key: melosmile_internal_n8n_key_2026
Content-Type: application/json
```
