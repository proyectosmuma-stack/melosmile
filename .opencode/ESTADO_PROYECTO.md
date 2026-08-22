# 🧩 ESTADO_PROYECTO.md - Melosmile

> ⚠️ **REGLA DE RAMAS**: Trabajo en rama `develop`. Nunca fusionar este archivo a `main`.
> **Última actualización**: 2026-08-22 (sesión III: certificación E2E de gestión de citas vía agente Musly. Hardening anti-mass-update + nueva arquitectura n8n v2. TODOS los flujos verificados contra BD ✅)
> **Para reiniciar la conversación**: "Lee .opencode/ESTADO_PROYECTO.md y sigamos desde ahí."

---

## ✅ Objetivo Actual

**RONDA ACTUAL (2026-08-22, sesión III) — Agente Musly/n8n: CERTIFICADO ✅**

Contexto: el usuario reportó que Musly alucinaba ("no hay citas"), duplicaba y movía citas al día equivocado al pedir reagendados. Diagnóstico multi-capa y fixes aplicados.

### 1. Root causes encontrados (apilados)

- **Mass-update en la ruta**: POST /api/appointments/update sin appointment_id actualizaba TODAS las citas activas del paciente (execs 91954/91960 → count:4). El systemMessage base original ENSEÑABA ese patrón dañino.
- **Clase entera de nodos toolHttpRequest ROTA en este n8n**: la LLM emitía el tool_call correcto pero recibía resultado VACÍO (prueba: inputOverride del exec 91990) → alucinaba "no hay citas". Mismo bug que mató Tool_Search_Patients (401 aliasing). Era intermitente-preexistente, NO causado por ediciones del día.
- **Modelo/versión inconsistente**: el workflow viejo ejecutaba una versión publicada obsoleta (gpt-4o-mini pese a PUTs posteriores; feature Workflow Versions fija activeVersion). Solución definitiva: workflow fresco.

### 2. Fixes aplicados

- **Ruta endurecida** (delegada a coder-cloud, tsc OK): rama sin-id consulta citas activas (.neq status Cancelada) → 0→404 · >1→HTTP 409 {action:"ambiguous", candidates≤10} · exactamente 1→update quirúrgico por id. Eliminado fallback silencioso "la más reciente". La UI no consume esta ruta (solo helpers n8n).
- **SystemMessage consolidado (2545 chars)** en 5 secciones: REGLA DE ORO TOOL-FIRST · VERIFICACIÓN DE FECHAS ("si hoy es sábado 22, el lunes es 24, NO el 25") · PROTOCOLO MODIFICAR/CANCELAR (List→id→Update, PROHIBIDO sin appointment_id) · REGLAS CREACIÓN (dedup + default Pendiente) · REGLAS GENERALES.
- **Arquitectura n8n v2**: todas las tools del subagente convertidas al patrón toolWorkflow (única clase que funciona).

### 3. Matriz de pruebas E2E (contrastadas con BD)

| Flujo | Resultado |
|-------|-----------|
| Consulta hora cita lunes | ✅ "16:00" (hora España correcta) |
| Consulta semana que viene | ✅ Lista ambas citas con TZ convertida |
| Reagendado lunes 16:00→17:00 | ✅ List→id→Update, count:1 quirúrgico, seeds intactos |
| Crear (regresión) | ✅ Comunica "Pendiente de confirmación" |
| Cancelar por conversación | ✅ AHORA FUNCIONA (antes imposible) — BD limpia |

---

## 📁 Archivos Modificados/Relevantes

**Ronda actual (sesión III):**

- frontend/src/app/api/appointments/update/route.ts — hardening 0/1/N candidatas (create defaults status||"Pendiente" y delete-by-id intactos).

**Workflows n8n dev** (https://n8n.mumaweb.com, API key en ~/.config/opencode/opencode.jsonc bloque "n8n-dev"):

| Workflow | ID | Estado |
|---|---|---|
| [MELOSMILE] Sub-Agent: Agendamiento v2 | vg2HrtIQpvDrcUOC | ACTIVO — 6 nodos: trigger → OpenRouter_Chat_Model (**google/gemini-2.5-flash** temp 0) → Agent_Scheduling tv1.7 → Tool_Manager / Tool_List / Tool_Update (todas toolWorkflow) |
| [MELOSMILE] Helper - Appointment Read | waAlOzJA1cokXi2X | ACTIVO — executeWorkflowTrigger(passthrough tv1.1) → GET /appointments/list → nodo Code TZ_Madrid (UTC→Europe/Madrid). Desenvuelve args wrapped ($json.query string) tolerando date_range/appointment_date/date |
| Dispatcher melosmile-dispatcher | Yv9X1EGUvQg8qErW | ACTIVO — Tool_SubAgent_Scheduling.workflowId.value = vg2HrtIQpvDrcUOC (resourceLocator {__rl:true,mode:"id"}) |
| Helper - Appointment Create | BTJZSpohjoxeY5Ru | ACTIVO (patrón referencia) |
| Helper - Appointment Modify | MlrysSNd3N8tDjVh | ACTIVO |
| Subagente viejo | jTWHg9bHaNOdzL13 | DESACTIVADO (histórico) |

**Endpoints**: dispatcher webhook POST https://n8n.mumaweb.com/webhook/melosmile-dispatcher {"message","sessionId"} · staging API https://melosmile-staging-git-develop-proyectosmuma-stacks-projects.vercel.app/api header x-api-key: melosmile_internal_n8n_key_2026.

**Snapshots forenses** en /tmp/opencode/ (se pierden al reiniciar): ex-91990.json (prueba root cause), helper-read-v5.json (helper final), v2-listfix.json (v2 final), disp-rep2.json (dispatcher repuntado).

**Sesión II (histórico):** docs/knowledge-base/domains/infra-vercel.md (NUEVO), context.md sección Staging, doble enlace .vercel (raíz→production, frontend/.vercel→staging; deploys staging SIEMPRE desde frontend/), sync BD local↔cloud idempotente, marcador anti-FOUC melosmile_theme.

**Vigentes rondas previas:** theme-toggle.tsx, layout.tsx (anti-FOUC), settings/page.tsx, calendar-view.tsx + new-appointment-modal.tsx (slots 09:30–20:30, status hardcoded "Pendiente"), middleware.ts (header x-api-key para n8n), supabase/seed.sql.

---

## 🛠 Decisiones Tomadas

*(nuevas sesión III)*

18. **Patrón obligatorio toolWorkflow**: los nodos toolHttpRequest como AI-tools devuelven resultados vacíos en este n8n → toda tool del subagente debe ser toolWorkflow hacia un helper con executeWorkflowTrigger(inputSource:"passthrough", typeVersion 1.1) + HTTP interno + nodo Code final si hay que transformar datos.
19. **Args wrapped toolWorkflow→helper**: la LLM envía {"query":"<json-string>"}; los helpers deben desenvolver tolerando variantes (query string, date_range, appointment_date, date).
20. **Horas SIEMPRE en Europe/Madrid hacia el usuario**: conversión UTC→Madrid en Helper-Read (nodo TZ_Madrid); el agente comunica "16:00", la BD guarda 14:00Z.
21. **Subagente con google/gemini-2.5-flash temp 0**: gemini-3.6-flash existe en catálogo OpenRouter pero devuelve 400 desde este credential/nodo; gpt-4o-mini era la fuente de inestabilidad original.
22. **PUT a API n8n**: settings whitelist estricta (executionOrder, saveDataErrorExecution, saveDataSuccessExecution, saveManualExecutions, saveExecutionProgress) o HTTP 400. Si un workflow queda clavado en versión publicada vieja → crear workflow fresco mejor que pelear con versions.
23. **Trampas de scripting**: heredocs bash SIEMPRE citados (<< 'EOF') cuando contengan $json/$fromAI (se expandieron a vacío 2 veces); usar curl nunca urllib Python (falla SSL silencioso en esta máquina).
24. **Status 'Pendiente'** = "pendiente de confirmación" (semántica acordada); ENUM Supabase no se toca sin estrategia de migración.

*(histórico comprimido)* Deploy staging desde frontend/ · TODO a develop/staging, producción solo con orden explícita · cloud staging fuente de verdad BD · auth n8n↔staging header x-api-key · enums reminders email|telegram|web|sms · agentes locales en secuencial (RAM 18GB) · Clean Envelope CLI roto → usar task() directo · credenciales cloud extraídas runtime desde export_remote_data.js jamás impresas · gotchas @base-ui Select, TW4 dark .dark, anti-FOUC, navegación Ajustes · auditoría manual del orquestador como estándar.

---

## 🚀 Próximos Pasos Pendientes

**Sesión III:**

1. **Docs de cierre (cierra-sesion)**: actualizar docs/knowledge-base/log.md + domains/agent-team.md + context.md con arquitectura v2, bug toolHttpRequest y lecciones de scripting.
2. **Decidir destino memory tools**: Tool_Search_Memory / Tool_Save_Learning quedaron FUERA de v2 (clase rota). Si se quieren, reconstruir como helpers toolWorkflow.
3. **Texto legacy del dispatcher**: el payload delegado aún inyecta "INSTRUCCIÓN CRÍTICA… pasando action=update, patient_name…" que contradice el protocolo List→id. Corregir systemMessage/description del dispatcher.
4. **Investigar upstream**: por qué toolHttpRequest como AI-tool devuelve vacío (bug plataforma n8n a reportar/evitar permanentemente).
5. **Deuda técnica**: frontend/src/lib/billing/utils.test.ts sintaxis rota líneas 18–19 (únicos errores tsc, preexistente); dropdown "Clínica:" del hub muta contexto global; pulido modo CLARO.

**Sesión II (siguen vigentes):**

6. Verificar hosts en frontend/.env.local / .env.remote (N8N_WEBHOOK_BASE_URL=https://n8n.mumaweb.com; NEXT_PUBLIC_SUPABASE_URL=https://amhfdzfcmpastmlsosou.supabase.co).
7. Añadir vars explícitas a Vercel melosmile-staging (N8N_WEBHOOK_BASE_URL, N8N_WEBHOOK_URL=document-cleaner).
8. DNS (acción usuario): CNAME develop → cname.vercel-dns.com (hoy apunta a VPS IONOS).
9. Producción agenda.melosmile.com obsoleta: desplegar SOLO con aprobación explícita del usuario.
10. Validación manual staging post-fc541b2 (toggle tema, clínicas en selects, facturación 4 sedes, citas visibles).
11. Al cerrar sesión: ejecutar skill cierra-sesion.

---

## 📊 Estado de la BD Staging Cloud (2026-08-22, post-certificación)

| Cita | Fecha/hora UTC | Motivo | Estado | Clínica |
|---|---|---|---|---|
| Seed …000000000001 | 2026-07-18 10:00 | Revisión semestral | Realizada | RyA |
| Seed …000000000002 | 2026-08-12 12:30 | Limpieza e higiene | Realizada | Goya |
| **Usuario f69583a5-920a-4516-9f46-59c74073d852** | **2026-08-24 14:00 (= lunes 16:00 Madrid). NO TOCAR salvo E2E controlado + restore** | Control y Revisión | Pendiente | Goya |
| Talasemia 1434e78d-47e8-48ff-b48c-e52eadb1d1ad | 2026-08-27 09:30 (= 11:30 Madrid) | Control talasemia — seguimiento | Confirmada | RyA |

Resto: patients 1 (PAC-001 Munir cff20455-456e-4eb5-9385-b32b65e97d6b) · reminders/reminder_events/billing 0 · ai_conversation_history drift benigno local 143 vs cloud 141.

---

## 🖥️ Estado del Entorno (2026-08-22)

- App local: localhost:3028 ✅ | Supabase local: 54321 ✅ | Git: develop == origin/develop @ fc541b2
- Vercel staging LIVE: frontend-eight-dusky-42.vercel.app + melosmile-staging-git-develop-proyectosmuma-stacks-projects.vercel.app
- Supabase cloud staging: amhfdzfcmpastmlsosou.supabase.co (creds en export_remote_data.js) | prod: xylqytpudbdcsbuuwqpi.supabase.co
- n8n dev: n8n.mumaweb.com | n8n prod: n8nv2.mumaweb.com (NO tocar sin credencial)
- Ollama proxy: 11435 | MLX: 18080
- MCP: solo codegraph (.mcp.json)
