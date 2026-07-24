# Walkthrough Maestro — Melosmile

Este documento es el **Walkthrough Maestro del Proyecto**, donde se acumula la trazabilidad histórica de todas las versiones, componentes desarrollados, refactorizaciones y avances del sistema Melosmile.

---

## 🏛️ Estado Global de la Arquitectura

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript.
- **Estilos**: TailwindCSS v4 + Lucide Icons + Shadcn UI.
- **Backend & Base de Datos**: Supabase PostgreSQL + RLS + Triggers PL/pgSQL.
- **Integraciones Externas**:
  - **Odoo ERP**: Conexión JSON-RPC nativa para sincronización de contactos y facturación agrupada (`account.move`).
  - **VPS Storage**: Almacenamiento físico en servidor VPS (`/opt/melosmile/pacientes/{id}/...`) discriminando fotos clínicas (sin vectorizar) de documentos PDF.
  - **n8n Automation Engine**: 9 flujos activos — 6 flujos operativos previos + 1 Dispatcher IA + 3 Sub-Agentes especializados.
  - **OpenRouter**: Modelo `google/gemini-2.5-flash` para todos los agentes IA conversacionales.

---

## 📅 Historial de Entregas & Sesiones

### Sesión Anterior: Módulo de Citas, Ficha de Paciente, Recordatorios & Asignación de Doctores

#### 1. Ficha de Gestión de Cita (`/appointments/[id]`)
- Header Notion con botones `Dr. Colaborador` y `Contabilidad ($)`.
- Banner de Alerta Médica (Alergias, Antecedentes, Medicación).
- Multi-procedimiento con precios Odoo, calculadora financiera y odontograma FDI.
- Registro fotográfico directo a VPS y adjuntos con vectorización n8n.
- Análisis IA automático con anillo degradado morado alrededor del avatar.

#### 2. Ficha del Paciente (`/patients/[id]`)
- Layout 2 columnas, odontograma consolidado en solo lectura.
- Historial de citas con doctor principal + invitado.
- Facturación multi-cobro Odoo con checkboxes y badges de estado.
- Recordatorios multi-canal (WhatsApp, Email, SMS) vía n8n.

---

### Sesión Actual: Sistema de Aprendizaje Dinámico Autónomo, Regla Anti-Alucinación & RLS Fixes

#### Fecha: 2026-07-24

#### 1. Sistema de Aprendizaje Dinámico Autónomo (Memoria Persistente)
- **Base de Datos Supabase (`agent_learnings`)**: Tabla relacional creada con políticas de seguridad Row-Level Security (RLS) para lectura/escritura pública autenticada. Permite almacenar modismos (`expression`), significados/acciones (`meaning`), categorías (`vocabulary`, `preference`, `clinical_alias`, `billing_rule`) y contador de frecuencia (`usage_count`).
- **Endpoints de Backend Next.js**:
  - [`/api/ai/memory/search`](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/app/api/ai/memory/search/route.ts): Realiza búsquedas difusas/semánticas de expresiones activas para inyectar al prompt del agente.
  - [`/api/ai/memory/learn`](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/app/api/ai/memory/learn/route.ts): Permite al agente o usuario registrar/actualizar modismos en tiempo real (*upsert*).
- **Herramientas de n8n Desplegadas**:
  - `Tool_Search_Memory`: Consulta el diccionario dinámico de modismos antes de ejecutar una acción.
  - `Tool_Save_Learning`: Guarda autónomamente aprendizajes cuando el profesional le enseña una regla (ej: *"Aprende esto: cuando diga X me refiero a Y"*).

#### 2. Protocolo Anti-Alucinación ("Fallback Strategy")
- Propagación de la regla obligatoria a **todos los agentes n8n** (`Dispatcher_AI_Agent`, `Agent_Scheduling`, `Agent_Clinical` y `Agent_Billing`):
  > *REGLA ANTI-ALUCINACIÓN — OBLIGATORIA:*
  > Cuando NO entiendas claramente la intención del usuario o faltan datos necesarios:
  > 1. NUNCA ejecutes una herramienta con datos inventados o incorrectos.
  > 2. NUNCA generes una respuesta de contenido no devuelta por una herramienta.
  > 3. EN SU LUGAR, pregunta al usuario para confirmar usando opciones concretas.

#### 3. Refactorización de APIs y Fixes de Despliegue en Vercel
- **Bypass de RLS en Backend**: `supabaseAdmin` implementado con la clave de servicio en `/api/ai/report/route.ts` y `/api/appointments/edit/route.ts`.
- **Robustez de Clientes Supabase**: Añadido fallback defensivo a `createClient` en rutas `/api/ai/report` y `/api/ai-context` para evitar errores durante la recopilación de páginas estáticas en la compilación de Turbopack/Next.js en Vercel.

---

### Sesión Anterior: Sistema de IA Multi-Agente — Dispatcher + Sub-Agentes

#### Fecha: 2026-07-23

#### 1. Arquitectura Multi-Agente n8n Implementada

Se diseñó e implementó un sistema de IA conversacional completo con patrón Dispatcher → Sub-Agentes:

```
[Frontend Chat] → [Next.js /api/dispatcher proxy] → [n8n Dispatcher (Yv9X1EGUvQg8qErW)]
                                                           ↓ (toolWorkflow nativo)
                                         ┌─────────────────┼─────────────────┐
                                         ↓                 ↓                 ↓
                              [Sub-Agent Scheduling]  [Sub-Agent Clinical]  [Sub-Agent Billing]
                              (jTWHg9bHaNOdzL13)     (Q7oxrbUuohca81Gn)   (XSLNwq6ihH1SHPRl)
```

**Modelo LLM**: `google/gemini-2.5-flash` vía **OpenRouter** (credencial `openRouterApi` id `4nco5fDnIohG6g9f`).

#### 2. Flujos n8n Creados / Actualizados

| ID n8n | Nombre | Trigger | Estado |
|--------|--------|---------|--------|
| `Yv9X1EGUvQg8qErW` | `[MELOSMILE] AI Dispatcher` | Webhook POST `/webhook/melosmile-ai-dispatcher` | ✅ Activo |
| `jTWHg9bHaNOdzL13` | `[MELOSMILE] Sub-Agent: Agendamiento` | `executeWorkflowTrigger` (passthrough) | ✅ Activo |
| `Q7oxrbUuohca81Gn` | `[MELOSMILE] Sub-Agent: Clinico` | `executeWorkflowTrigger` (passthrough) | ✅ Activo |
| `XSLNwq6ihH1SHPRl` | `[MELOSMILE] Sub-Agent: Contabilidad` | `executeWorkflowTrigger` (passthrough) | ✅ Activo |

#### 3. Ficheros Frontend Creados / Modificados

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| [`src/components/dashboard/ai-agent-bar.tsx`](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/components/dashboard/ai-agent-bar.tsx) | **Reescrito** | Interfaz de chat completo con historial de mensajes, burbujas diferenciadas usuario/agente, badge de intent, entidades extraídas colapsables, spinner de carga, sugerencias rápidas |
| [`src/components/dashboard/global-ai-agent-modal.tsx`](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/components/dashboard/global-ai-agent-modal.tsx) | **Actualizado** | Modal simplificado que embebe directamente el chat sin padding extra |
| [`src/app/api/dispatcher/route.ts`](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/app/api/dispatcher/route.ts) | **[NUEVO]** | Proxy server-side Next.js que reenvía las peticiones del browser a n8n, eliminando el error CORS. Gestiona respuestas vacías, timeouts de 30s y normalización JSON |
| [`frontend/.env.local`](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/.env.local) | **Actualizado** | Añadida `N8N_API_KEY` completa |
| [`.agents/skills/n8n-multi-agent-architect/SKILL.md`](file:///Users/munircallaos/Antigravity%20Projects/melosmile/.agents/skills/n8n-multi-agent-architect/SKILL.md) | **[NUEVO]** | Skill de workspace documentando el patrón de arquitectura multi-agente n8n |

#### 4. Diagnósticos y Resoluciones

| Problema | Causa | Solución |
|----------|-------|---------|
| Error CORS en browser | n8n solo permite `access-control-allow-origin: https://n8n.mumaweb.com` | Proxy Next.js `/api/dispatcher/route.ts` |
| `404 models/gemini-1.5-flash` | Modelo deprecado | Cambiado a `google/gemini-2.5-flash` vía OpenRouter |
| `429 Free Tier exceeded` | Cuota Gemini API agotada | Migrado a OpenRouter (sin límite de cuota en cuenta del usuario) |
| `Missing node to start execution` | Sub-agentes usaban `Webhook` como trigger en lugar de `executeWorkflowTrigger` | Reemplazado el trigger en los 3 sub-agentes con `executeWorkflowTrigger v1.1 (passthrough)` |

#### 5. Resultados de Pruebas End-to-End

```bash
# TEST 1: Agendamiento ✅ EXITOSO
POST /webhook/melosmile-ai-dispatcher
{ "message": "cita para munir para mañana a las 15:00 en goya..." }
→ intent: "schedule_appointment"
→ entities: { patient_name: "Munir", date: "mañana", time: "15:00", clinic: "Albacete", treatments: [...] }
→ summary: "La cita de Munir para mañana a las 15:00 para limpieza y revisión de brackets... ha sido agendada."

# TEST 2: Facturación ⚠️ PARCIAL (intent OK, herramientas placeholder)
→ intent: "billing" ✅, entities: { time_frame: "esta semana", scope: "todas las clinicas" } ✅
→ Tool_Reminders_Dispatcher → URL placeholder (pendiente conexión Odoo real)

# TEST 3: Clínico ⚠️ PARCIAL (intent OK, herramientas placeholder)
→ intent: "patient_info" ✅, entities: { patient_name: "Munir Callaos" } ✅
→ melosmile.app/api/patients → endpoint pendiente implementación
```

#### 6. Últimos Ajustes & Mejoras (2026-07-23)

| Componente | Mejora / Corrección | Detalle Técnico |
|------------|---------------------|-----------------|
| **Renombrado del Agente** | **Musly** | Cambiadas todas las referencias de "Agente IA" o "Dispatcher" a **Musly** en la interfaz y mensajes |
| **Sidebar Naves** | Colapsable por defecto | Estado inicial colapsado con `tooltips` explicativos en hover y corrección de superposición con el logo |
| **Memoria Conversacional** | Historial de Contexto | `ai-agent-bar.tsx` envía los últimos 10 mensajes del chat en la petición a n8n para mantener contexto continuo ("para mañana") |
| **Persistencia de Auditoría** | Supabase Migration | Creada tabla `ai_conversation_history` en Supabase para registrar conversaciones y respuestas |
| **Herramientas n8n** | Corrección de Sintaxis JSON | Reparada la evaluación de `$fromAI` en los cuerpos de las herramientas HTTP de n8n para enviar JSON válido a la API |
| **Emparejamiento de Tratamientos** | Buscador Difuso en API | Endpoint `api/appointments/create` busca coincidencias en la tabla `treatments` de Supabase para asociar `treatment_id` y usar el nombre oficial |
| **Ficha de Cita en Calendario** | Navegación a Ficha Completa | Botón "Ver Ficha Completa" en `AppointmentDetailDrawer` redirige directamente a la página `/appointments/[id]` |

---

## ✅ Verificación de Entorno

- **TypeScript**: `npx tsc --noEmit` → **0 errores** ✅
- **Servidor Dev**: Operativo en `http://localhost:3028/`
- **Dispatcher n8n**: Activo en `https://n8n.mumaweb.com/webhook/melosmile-ai-dispatcher`
- **4 Workflows n8n**: Todos activos (`active: true`)
- **Git**: Cambios empujados a la rama `develop` ✅
