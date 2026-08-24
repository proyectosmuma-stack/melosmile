# 🧩 ESTADO_PROYECTO.md - Melosmile

> ⚠️ **REGLA DE RAMAS**: Trabajo en rama `develop`. Nunca fusionar este archivo a `main`.
> **Última actualización**: 2026-08-24 (sesión VI: **REVIVAL COMPLETO DE MUSLY EN PRODUCCIÓN n8nv2** + certificación write-path E2E ×3 + migración total al patrón toolWorkflow→Bridge).
> **Para reiniciar la conversación**: "Lee .opencode/ESTADO_PROYECTO.md y sigamos desde ahí."
> **Histórico detallado**: `docs/knowledge-base/log.md` (entradas `[2026-08-24] fix | Revival...` y `[2026-08-24] fix | Cierre de los 4 PENDINGs...`)

---

## ✅ Objetivo Actual

**MUSLY EN PRODUCCIÓN OPERATIVO Y CERTIFICADO ✅** (lectura Y escritura verificadas contra verdad absoluta en BD).

1. Apagón prod diagnosticado y reparado: dispatcher `QgNoVFr9TBXGbdOl` crasheaba por credencial OpenRouter inexistente `4nco5fDnIohG6g9f` → sustituida por la válida `UU1j5uOp8ejNx4BU`.
2. Bug estructural del build n8nv2 esquivado: patrón `toolHttpRequest+$fromAI` registra esquema Zod degenerado ("Received tool input did not match expected schema" con input válido) → TODOS los agentes migrados a `toolWorkflow` → API Bridge centralizado.
3. Certificación E2E completa: lectura (v8, respuesta veraz contra BD), escritura (crear/reagendar/cancelar ×3 verdes) y limpieza total de datos de prueba.

## 🟢 Estado Certificado del Sistema (2026-08-24)

| Flujo | Estado |
|---|---|
| Dispatcher prod → General (horarios) | ✅ VERDE |
| Dispatcher → Agendamiento → Bridge → staging API (lectura) | ✅ VERDE v8 (5.81s, veraz) |
| CREATE cita vía chat | ✅ VERDE (cita real en BD, hora exacta UTC=España correcta) |
| REAGENDAR multiturno ("Reagéndala para el viernes") | ✅ VERDE (mismo appointment_id, update en sitio) |
| CANCELAR | ✅ VERDE (`estado:"Cancelada"` soft-delete, nunca físico) |
| Limpieza post-test | ✅ BD limpia (total_citas:0 incluso con include_cancelled=true) |
| Document Cleaner `IrLOC3fSQZCxvvBz` | ⚠️ credenciales reparadas, SIN E2E (necesita foto/Excel real) |
| Fase 11 galería + FTP rotado + histórico saneado | ✅ sesión V (sin cambios) |
| **RGPD: fotos pacientes** | ✅ **CERRADO**: bucket `patient-documents` PRIVADO (pública→400) · RLS `documents` 0 políticas públicas en local+cloud · signed URLs TTL 3600s en `/api/documents` desplegado y verificado (prod+staging fetch=200) · contrato API intacto, frontend sin tocar. Detalle: `docs/knowledge-base/log.md` [2026-08-24]. Deuda: galería DEV local rota hasta paridad storage; seed.sql conserva URLs legacy inofensivas |

## 🔑 Infraestructura y Acceso (crítico para retomar)

- **CONVENCIÓN DE ENTORNOS (aclarada por usuario)**: `https://n8n.mumaweb.com` = DEV · `https://n8nv2.mumaweb.com` = **PRODUCCIÓN**. MCP servers: herramientas `n8n-dev_*` (dev) · `n8nv2-prod_*` (prod).
- **Credencial OpenRouter válida en n8nv2**: `UU1j5uOp8ejNx4BU` ("OpenRouter - Muma Account", extraída de Hungrys GPB `cpQ8Tx1H8ct8QU5m`). La `4nco5fDnIohG6g9f` NO existe — eliminarla donde aparezca.
- **API staging**: base `https://melosmile-staging-git-develop-proyectosmuma-stacks-projects.vercel.app` · header `x-api-key: melosmile_internal_n8n_key_2026`. Excepción documentada (no leer .env).
- **API auth web**: header `x-api-key: melosmile_internal_n8n_key_2026` o cookie `melosmile_session=valid_melosmile_session_token_oslysmile`.
- **Deploy STAGING**: `cd frontend && vercel --prod` → **re-aliasear**: `vercel alias set <url> staging.melosmile.com`
- **Deploy PRODUCCIÓN**: desde raíz `vercel --prod` → `vercel alias set <url> agenda.melosmile.com` (alias manuales; `--prod` NO toca dominios).
- **BD cloud**: scripts Node con dotenv cargando `frontend/.env.remote`, cwd=`frontend/`, service role nunca en contexto del agente.
- **UUIDs reales**: PAC-001 Munir Callaos `cff20455-456e-4eb5-9385-b32b65e97d6b` · PAC-025 Leal Rey `b641759d-1ffe-4197-b55c-42a6504b11e1`.
- **Acceso root VPS**: `ssh -i ~/.ssh/id_ed25519_vps root@94.143.139.120`.

### 📇 Workflows PRODUCCIÓN (n8nv2) — todos ACTIVOS
| Workflow | ID |
|---|---|
| AI Dispatcher | `QgNoVFr9TBXGbdOl` |
| Sub-Agent: Agendamiento | `E59OoSRNJ4skt43W` (7 toolWorkflow→Bridge, SM = dev verbatim, modelo google/gemini-2.5-flash) |
| **API Bridge (Prod)** ★nuevo | `CyCVHWOxPuHCLteP` (15 nodos, Switch 11 rutas: list/update/create/search_patients/create_patient/memory_search/memory_learn/clinical/summary/odoo_invoice/reminders + Normalize_Input + Unknown_Action) |
| Sub-Agent: Clinico | `cQQGecziVfareNtI` (Tool_Clinical_Context + Tool_Patient_Summary → Bridge) |
| Sub-Agent: Contabilidad | `4Z7PdsGK2wAIi2iE` (Tool_Odoo_Invoice + Tool_Reminders_Dispatcher → Bridge) |
| Sub-Agent: General | `9scMTKJwP7TKFSJV` (Tool_Search_Memory + Tool_Save_Learning → Bridge) |
| Agent Document Cleaner | `IrLOC3fSQZCxvvBz` (webhook `document-cleaner`: Vision OCR imágenes + chainLlm Excel/CSV) |

### 📇 Workflows DEV (n8n.mumaweb.com) — referencia
Dispatcher `Yv9X1EGUvQg8qErW` · Agendamiento `vg2HrtIQpvDrcUOC` · Clínico `Q7oxrbUuohca81Gn` · Contabilidad `XSLNwq6ihH1SHPRl` · General `MIok0ruU7JhpTxWv` · Helpers: PatientSearch `ungEfZO2qzDQvuVC` · ApptCreate `BTJZSpohjoxeY5Ru` · ApptModify `MlrysSNd3N8tDjVh` · BillingQuery `AzGmCQ5rd7gvEQ3w` · PatientCreate `AwZXnNEdTjVaPXsE`

## 🏛️ Decisiones Técnicas Clave (esta sesión)

1. **Arquitectura prod unificada**: todos los agentes usan `toolWorkflow`→Bridge (nunca `toolHttpRequest+$fromAI`: esquema degenerado en este build @langchain/core 1.1.41). Descripciones JSON-exactas con `"action"` obligatorio.
2. **Gotchas toolWorkflow en n8nv2**: (1) exige workflow destino ACTIVO ("Workflow is not active"); (2) trigger passthrough sin esquema → args llegan como STRING bajo clave `query` → nodo Code `Normalize_Input` obligatorio antes del Switch; (3) `$fromAI(...,'','')` NO hace opcional el parámetro.
3. **Dispatcher prod SM = dev verbatim**: incluye REGLA DE ORO DE RUTEO + PROHIBIDO-SIN-DELEGAR (sin tool invocada → status error) + ENTIDADES DE FECHA verbatim (prohibido calcular ISO) + TRANSFERENCIA MULTITURNO con bloque `[CONTEXTO PREVIO: ...]`. Sin esto, fabricaba anuncios de éxito sin ejecutar nada (detectado: respuesta en 1.3s sin ejecución del subagente).
4. **Política de cancelación**: status `Cancelada`, NUNCA delete físico salvo orden literal del usuario + `delete_appointment:true`. El listado excluye canceladas por defecto (`include_cancelled=true` las revela).
5. **gemini-2.5-flash NO está deprecado en n8nv2** (corrige diagnóstico del 22/08): el fallo real era la credencial ausente. Funciona vía `UU1j5uOp8ejNx4BU`.
6. **Validación anti-alucinación**: NUNCA creer al agente; verificar SIEMPRE en BD (curl directo) + forense de ejecuciones (duración <2s sin ejecución de subagente = no hubo delegación).
7. Patrones previos vigentes: ai_tool per-tool→agente; helpers deterministas; estados cita enum real `Confirmada/Pendiente/Realizada/Cancelada`; alias Vercel manuales tras cada deploy; rotación FTP via chpasswd stdin.

## 📁 Archivos Relevantes

- ★ `docs/knowledge-base/log.md` — entradas del 2026-08-24 con toda la evidencia (revival + cierre PENDINGs).
- ★ `.opencode/ESTADO_PROYECTO.md` — este archivo (sin commitear, intencional).
- Contratos API (glob-verificados): `frontend/src/app/api/appointments/{list,update}/route.ts` · `patients/{search,create,[id]/clinical,[id]/summary}` · `odoo/invoice/route.ts` · `billing/reminders/route.ts` · `ai/memory/*`.
- Fase 11 (sesión V, ya mergeada): `frontend/src/lib/utils/document-utils.ts` · `api/documents/route.ts` · componentes galería/badges.

## ▶️ Próximos Pasos Pendientes

1. **Confirmación MANUAL del usuario** del reporte IA `29aee7e1-15fc-4a8f-a439-f8209220e9de` → solo entonces marcarlo `resolved` (protocolo inmutable `docs/protocolo_revision_reportes_ia.md`; el orquestador NO debe cerrarlo por su cuenta). **Nota 2026-08-24**: se consultó al usuario y decidió MANTENERLO ABIERTO — no re-preguntar salvo que él lo mencione.
2. **E2E Document Cleaner** con material real del usuario (foto de agenda manuscrita o Excel contable) — flujo reparado pero sin certificar.
3. **Timezone UX (backlog nuevo)**: `/api/appointments/list` devuelve horas en UTC crudo (14:00) vs hora España del usuario (16:00); el agente lo compensa pidiendo confirmación, pero conviene normalizar en endpoint o enriquecer contexto.
4. ~~Seguridad RGPD~~ → ✅ COMPLETADA (2026-08-24, ver fila RGPD en Estado Certificado). Residual: paridad storage dev-local (opcional) y Document Cleaner deberá consumir signed URLs/base64 cuando se certifique.
5. **Odoo**: configurar `ODOO_*` en Vercel y probar facturación end-to-end (el Bridge ya tiene ruta `odoinvoice` lista).
6. **Excel + Calculadora**: auditar `frontend/src/lib/billing/calculator.ts` contra `datos-prueba/datos prueba.xlsx`.
7. **Agente añade procedimientos**: formalizar `action:"add_procedures"` en `/api/appointments/update` (fix dedup L433, overwrite notes L370).
8. Migrar enum `whatsapp` a Supabase CLOUD.

---

### 🧪 Recetas de test E2E (para reproducir certificaciones)
```bash
# Lectura/escritura vía webhook prod (simula widget):
POST https://n8nv2.mumaweb.com/webhook/melosmile-dispatcher
{"message":"...", "history":[{"role":"user","content":"..."},{"role":"assistant","content":"..."}], "session_id":"test-<slug>"}
# Verdad absoluta:
curl ".../api/appointments/list?date=YYYY-MM-DD&include_cancelled=true" -H "x-api-key: melosmile_internal_n8n_key_2026"
# Limpieza física de cita de prueba:
POST .../api/appointments/update {"action":"delete","appointment_id":"<uuid>","delete_appointment":true}
```
Fechas relativas: hoy=lun 2026-08-24 → mañana=25, viernes=28. Horas: España−2h=UTC almacenado.
