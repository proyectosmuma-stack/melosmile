# 🧩 ESTADO_PROYECTO.md - Melosmile

> ⚠️ **REGLA DE RAMAS**: Trabajo en rama `develop`. Nunca fusionar este archivo a `main`.
> **Última actualización**: 2026-08-26 (sesión X: **Configuración Email Odoo** — pendiente verificar credenciales TEST correctas y configurar SMTP).
> **Para reiniciar la conversación**: "Lee .opencode/ESTADO_PROYECTO.md y sigamos desde ahí."
> **Histórico detallado**: `docs/knowledge-base/log.md`.

---

## ✅ Objetivo Actual

**Módulo de Consentimientos Informados (Fase 12)** — arquitectura definida y auditada, pendiente implementación.

### Trabajo completado esta sesión (VIII):
1. ✅ **Fix Timezone UX** (`c328d18`): `/api/appointments/list` ahora devuelve horas y fechas en **Europe/Madrid** en vez de UTC crudo. Causa: Vercel ejecuta en UTC, `toLocaleTimeString` sin `timeZone` y `toISOString()` siempre UTC.
2. ✅ **Helpers reutilizables**: `formatTimeMadrid()` y `formatDateMadrid()` en `date-parser.ts` (ambos usan `Intl.DateTimeFormat` con `timeZone: "Europe/Madrid"` explícito).
3. ✅ **Deploy staging**: commit `c328d18` mergeado a `main`, pusheado, deploy staging + alias `staging.melosmile.com` verificado (200 OK).

### Trabajo completado esta sesión (IX — Odoo TEST):
4. ✅ **Configuración Odoo TEST**: `ODOO_URL` actualizado de `https://melosmile.odoo.com` (producción) a `https://melosmile-test.odoo.com` (test) en `frontend/.env.local`.
5. ✅ **Conexión verificada**: Test de autenticación exitoso contra instancia TEST de Odoo 17.0.
6. ✅ **Script de configuración**: `scripts/set-odoo-test.sh` creado para configurar credenciales de prueba de forma segura (100% local).
7. ✅ **Protocolo Clean Envelope documentado**: Flujo seguro para pasar credenciales sin exponerlas en el chat.

### Pendiente de esta sesión:
- **Recepción de plantillas clínicas** del usuario (Ortodoncia, Miofuncional, Ortopedia) antes de implementar consentimientos.
- **Probar facturación end-to-end** en Odoo TEST (crear factura de prueba, verificar que no es legal). ⚠️ **Bloqueo**: Error `Failed to parse URL from undefined/web/session/authenticate` en staging — ver sección "Infraestructura Odoo" abajo. Se requiere configurar variables de entorno en Vercel.

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
| **Timezone UX appointments** | ✅ **CERRADO** (2026-08-26): `formatTimeMadrid()` y `formatDateMadrid()` con `timeZone: "Europe/Madrid"` explícito. Commit `c328d18`, desplegado en staging + alias `staging.melosmile.com`. Verificado curl 200 OK. |

## 🔑 Infraestructura y Acceso (crítico para retomar)

- **CONVENCIÓN DE ENTORNOS (aclarada por usuario)**: `https://n8n.mumaweb.com` = DEV · `https://n8nv2.mumaweb.com` = **PRODUCCIÓN**. MCP servers: herramientas `n8n-dev_*` (dev) · `n8nv2-prod_*` (prod).
- **Credencial OpenRouter válida en n8nv2**: `UU1j5uOp8ejNx4BU` ("OpenRouter - Muma Account", extraída de Hungrys GPB `cpQ8Tx1H8ct8QU5m`). La `4nco5fDnIohG6g9f` NO existe — eliminarla donde aparezca.
- **API staging**: base `https://melosmile-staging-git-develop-proyectosmuma-stacks-projects.vercel.app` · header `x-api-key: melosmile_internal_n8n_key_2026`. Excepción documentada (no leer .env).
- **API auth web**: header `x-api-key: melosmile_internal_n8n_key_2026` o cookie `melosmile_session=valid_melosmile_session_token_oslysmile`.
- **Deploy STAGING**: `cd frontend && vercel --prod` → **re-aliasear**: `vercel alias set <url> staging.melosmile.com`
- **Deploy PRODUCCIÓN**: desde raíz `vercel --prod` → normalmente auto-aliasea a agenda.melosmile.com; si no, `vercel alias set <url> agenda.melosmile.com`.
- **Odoo TEST configurado** (sesión IX): `ODOO_URL=https://melosmile-test.odoo.com` en `frontend/.env.local`. Credenciales de prueba: `ODOO_DB=melosmile`, `ODOO_USER=gestion@melosmile.com`. ⚠️ **Para que funcione en staging/production**: Estas variables **DEBEN** añadirse en el panel de Vercel → Project Settings → Environment Variables (no solo en .env.local local). Ver sección "Error Odoo en staging" abajo.
- **Supabase CLI 56**: NO existe `db execute` → para SQL contra CLOUD usar `supabase db query --linked --file <archivo.sql>` (vía Management API, proyecto vinculado en `supabase/.temp/`). Para LOCAL: `docker exec -i supabase_db_melosmile psql -U postgres -d postgres < archivo.sql`. RPC `exec_sql` NO existe en cloud (404).
- **Storage API gotcha**: actualizar bucket = `PUT /storage/v1/bucket/{id}` con body `{public:false}` — PATCH devuelve 404.
- **BD cloud**: scripts Node con dotenv cargando `frontend/.env.remote`, cwd=`frontend/`, service role nunca en contexto del agente.
- **UUIDs reales**: PAC-001 Munir Callaos `cff20455-456e-4eb5-9385-b32b65e97d6b` · PAC-025 Leal Rey `b641759d-1ffe-4197-b55c-42a6504b11e1`.
- **Acceso root VPS**: `ssh -i ~/.ssh/id_ed25519_vps root@94.143.139.120`.

### 📊 Cambios en Base de Datos (Sesión Actual)

| Tabla | Columna | Estado | Comentario |
|-------|---------|--------|------------|
| `billing_records` | `appointment_reason` | ✅ Añadida | Migración `20260826000000_add_appointment_reason_to_billing_records.sql` aplicada en linked (staging) |
| `billing_records` | `patient_id` | ✅ Añadida | Aplicada en linked (staging) tras error "Could not find the 'patient_id' column" |
| `billing_records` | (schema completo) | ✅ Verificado | 17 columnas totales, estructura compatible con código actual |

### ⚠️ Error Odoo en staging

**Sintoma**: `Failed to parse URL from undefined/web/session/authenticate` al llamar `/api/odoo/invoice` en `staging.melosmile.com`.

**Causa**: En el runtime de Vercel (staging/production), `process.env.ODOO_URL` es `undefined` aunque esté definido en `frontend/.env.local`. Vercel no inyecta variables locales automáticamente a menos que se configuren explícitamente en el panel.

**Solución**:
1. Ir a Vercel → Project Settings → Environment Variables para el proyecto de staging
2. Agregar:
   - `ODOO_URL: https://melosmile-test.odoo.com`
   - `ODOO_DB: melosmile-test`
   - `ODOO_USER: gestion@melosmile.com`
   - `ODOO_PASSWORD: @oslyMelo1983`
   - `ODOO_API_KEY: 981e72d3d9ffc422e5d5d54627c38111c9f7ed9c`
3. *Opcional*: tambien agregar en el proyecto de production para consistencia
4. Hacer redeploy (`vercel --prod` o `vercel --prod` desde frontend)

**Estado verificado**: `curl` directo a `https://melosmile-test.odoo.com/web/session/authenticate` devuelve `uid: 2` exitosamente. El código es correcto, falta la inyección de vars en Vercel.

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
7. **RGPD (sesión 24/08 tarde)**: seguridad en producción con orden crítico código→verificar contra cloud→deploy ambos entornos→recién entonces flip privado (cero ventana rota). Signed URLs server-side con fallback legacy = contrato API intacto, frontend sin tocar. RLS sin políticas públicas: backend opera vía service_role que bypasa RLS.
8. **Orquestación (24/08)**: free tier `gemini-3.6-flash` se agota (~20 req/día) → ante fallo ×3 del subagente cloud, Regla Anti-Bucle e implementación directa del orquestador con auditoría compensatoria documentada. Agentes locales Qwen devolvieron meta-respuestas SIN ejecutar herramientas → verificar siempre evidencia literal antes de aceptar un task "completed" (Regla Anti-Falso Positivo).
9. Patrones previos vigentes: ai_tool per-tool→agente; helpers deterministas; estados cita enum real `Confirmada/Pendiente/Realizada/Cancelada`; alias Vercel manuales tras cada deploy; rotación FTP via chpasswd stdin.
10. **Architect: DeepSeek V4 Pro 0813** (2026-08-24 VII): `gemini-3.1-pro-preview` free tier quota = 0 en Google directo. Migrado a `openrouter/deepseek/deepseek-v4-pro-0813` (128k ctx, razonamiento profundo). Config: `~/.config/opencode/agents/coding/mumabot-architect.md` + `opencode.jsonc`. **CUIDADO**: model ID = `openrouter/deepseek/deepseek-v4-pro-0813` (con prefijo `openrouter/`).
11. **Consentimientos: RLS con service_role** (no auth.uid()): backend usa `supabaseAdmin` que bypasa RLS. Policies deben permitir service_role.
12. **Consentimientos: soft delete** para docs legales: `eliminado_en TIMESTAMPTZ` en vez de DELETE físico.
13. **Consentimientos: ENUM explícito** `consent_tipo` en vez de `TEXT CHECK`.
14. **Storage consentimientos**: reutilizar bucket `patient-documents`. Path: `consentimientos/{patient_id}/{tipo}_{fecha}.pdf`.
15. **Timezone UX (sesión VIII)**: `Intl.DateTimeFormat` con `timeZone: "Europe/Madrid"` explícito es la ÚNICA forma fiable de formatear fechas/horas en Next.js server-side. `toLocaleTimeString` sin `timeZone` usa la del runtime (UTC en Vercel). `toISOString()` siempre UTC. Helpers `formatTimeMadrid()` y `formatDateMadrid()` son reutilizables desde `date-parser.ts`.
16. **Odoo TEST (sesión IX)**: Producción NO tiene modo test → se usa instancia separada `melosmile-test.odoo.com`. Credenciales de prueba en `.env.local`, producción en `.env.local.backup`. Script `scripts/set-odoo-test.sh` permite alternar de forma segura. Protocolo Clean Envelope para pasar credenciales sin exponerlas en chat.

## 📁 Archivos Relevantes

- ★ `docs/knowledge-base/domains/consentimientos-informados.md` — arquitectura completa del módulo (DDL, API, componentes, storage, auditoría).
- ★ `docs/knowledge-base/domains/agent-team.md` — equipo de agentes (architect migrado a DeepSeek V4 Pro).
- ★ `docs/knowledge-base/log.md` — histórico de sesiones.
- `.opencode/ESTADO_PROYECTO.md` — este archivo.
- **Odoo TEST (sesión IX)**: `frontend/.env.local` (ODOO_URL actualizado a test) · `scripts/set-odoo-test.sh` (script de configuración segura).
- **Timezone (sesión VIII, commit `c328d18`)**: `frontend/src/lib/utils/date-parser.ts` (helpers `formatTimeMadrid`, `formatDateMadrid`) · `frontend/src/app/api/appointments/list/route.ts` (usa helpers).
- **RGPD (commit `64b4e08`)**: `frontend/src/lib/server/storage.ts` (helper `signDocumentUrl`, TTL 3600s, anti path-traversal) · `frontend/src/app/api/documents/route.ts` (firma+fallback) · `supabase/migrations/20260824000000_secure_documents_rls.sql` (DROP 4 políticas públicas). Consumidores intactos: `photo-gallery.tsx` · `appointment-detail-drawer.tsx` vía `resolved_url`.
- Contratos API (glob-verificados): `frontend/src/app/api/appointments/{list,update}/route.ts` · `patients/{search,create,[id]/clinical,[id]/summary}` · `odoo/invoice/route.ts` · `billing/reminders/route.ts` · `ai/memory/*`.
- **Consentimientos (pendiente crear)**: `frontend/src/app/api/consentimientos/{route.ts, [id]/route.ts, plantillas/route.ts}` · `components/consentimientos/{ConsentimientoGenerator,ConsentimientoPreview,ConsentimientoList}.tsx` · `patients/[id]/page.tsx` (nueva tab).
- Fase 11 (sesión V): `frontend/src/lib/utils/document-utils.ts` · componentes galería/badges.

## ▶️ Próximos Pasos Pendientes

1. **Consentimientos Informados — IMPLEMENTACIÓN** (Fase 12): arquitectura lista, pendiente recepción de plantillas clínicas del usuario (Ortodoncia, Miofuncional, Ortopedia). Una vez recibidas: SQL migration → API routes → Componentes → Tab en ficha paciente → Auditoría.
2. **Confirmación MANUAL del usuario** del reporte IA `29aee7e1-15fc-4a8f-a439-f8209220e9de` → solo entonces marcarlo `resolved`. **Nota**: se consultó y decidió MANTENERLO ABIERTO — no re-preguntar.
3. **E2E Document Cleaner** con material real del usuario (foto de agenda manuscrita o Excel contable).
4. ~~**Timezone UX**~~ → ✅ COMPLETADA (2026-08-26, sesión VIII, commit `c328d18`).
5. **Odoo TEST**: ~~configurar `ODOO_*`~~ → ✅ URL configurada y conexión verificada. **Siguiente**: probar facturación end-to-end en test (crear factura de prueba, verificar que no es legal). NOTA: credenciales de producción en `.env.local.backup`, test en `.env.local`.
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
Fechas relativas: hoy=mar 2026-08-26. Timezone: todos los endpoints ahora devuelven Europe/Madrid (fix sesión VIII).

### 🧪 Receta Odoo TEST (facturación sin generar facturas legales)
```bash
# 1) Verificar conexión a TEST:
curl -X POST "https://melosmile-test.odoo.com/web/session/authenticate" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","params":{"db":"melosmile","login":"gestion@melosmile.com","password":"<API_KEY>"}}'
# Debe devolver "uid" en la respuesta

# 2) Volver a producción (si necesario):
sed -i '' 's|melosmile-test.odoo.com|melosmile.odoo.com|' frontend/.env.local

# 3) Volver a test:
sed -i '' 's|melosmile.odoo.com|melosmile-test.odoo.com|' frontend/.env.local
```

### 🆕 Configuración Odoo MCP (sesión IX — 2026-08-26)

**Objetivo**: Integrar Melosmile con Odoo ERP para automatización de facturación.

**Estado**: ✅ **COMPLETADO** — Endpoint `/api/odoo/invoice` funcional y probado.

**Credenciales configuradas en Vercel (staging)**:
- `ODOO_URL: https://melosmile-test.odoo.com`
- `ODOO_DB: melosmile-test`
- `ODOO_USER: gestion@melosmile.com`
- `ODOO_PASSWORD: @oslyMelo1983`
- `ODOO_API_KEY: 981e72d3d9ffc422e5d5d54627c38111c9f7ed9c`

**Endpoints y cabeceras probados**:
- `POST /api/odoo/invoice` requiere cabecera `x-api-key: melosmile_internal_n8n_key_2026`
- Formato petición exitosa:
```json
{
  "partner_id": 1,
  "invoice_lines": [{"name": "Test Service", "quantity": 1, "price_unit": 50}],
  "patientId": 1,
  "patientDetails": {}
```
- Respuesta exitosa:
```json
{"success":true,"invoiceId":1,"invoiceNumber":"INV/ODOO/1","partnerId":8,"updatedCount":0}
```

**Flujo verificado**:
```
Solicitud HTTP
    ↓
Validación cabecera x-api-key
    ↓
Autenticación Odoo (getUID → session via ODOO_PASSWORD/ODOO_API_KEY)
    ↓
Ejecutar modelo (account.move.create en Odoo)
    ↓
Respuesta JSON con invoiceId y invoiceNumber
```

**Script de configuración segura**: Protocolo Clean Envelope usado — ninguna credencial expuesta en el chat.

**Próximos pasos**:
1. Probar endpoint con producción (`agenda.melosmile.com`) usando variables de entorno de prod
2. Integrar con workflow n8n `07-melosmile-agent-billing.json` (API Bridge `CyCVHWOxPuHCLteP`)
3. Validar campos completos del catálogo de tratamientos y laboratorio

### 🧪 Receta RGPD (certificación fotos, ya VERDE — re-ejecutable)
```bash
# 1) Listado sirve FIRMADAS (prod o staging; cookie de sesión web):
curl "https://agenda.melosmile.com/api/documents?patientId=b641759d-1ffe-4197-b55c-42a6504b11e1&limit=1" \
  -H "Cookie: melosmile_session=valid_melosmile_session_token_oslysmile"
# 2) Fetch de la resolved_url devuelta → debe ser 200
# 3) URL pública legacy → debe ser 400:
curl -s -o /dev/null -w "%{http_code}" "https://amhfdzfcmpastmlsosou.supabase.co/storage/v1/object/public/patient-documents/<file_path>"
# 4) RLS: SELECT count(*) FROM pg_policies WHERE tablename='documents'; → 0
```

### ⚠️ Árbol git con restos ajenos (NO commitear sin revisar)
`.mcp.json` (+`.mcp.json.backup`) · `supabase/seed.sql` · `supabase/config.toml` · `frontend/scripts/migrate_notion_to_production.js` · `frontend/scripts/_tmp_confirmadas_realizadas.mjs` (temporal). Quedaron fuera de `64b4e08` deliberadamente.
Entorno al cierre: dev server `:3028` y Supabase local **ENCENDIDOS** (decisión del usuario).
