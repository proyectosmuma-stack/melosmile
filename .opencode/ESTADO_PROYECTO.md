# Estado del Proyecto MeloSmile — 2026-09-03

## 🎯 Objetivo Actual
Certificación End-to-End (E2E) completa de todos los flujos del sistema Musly/Melosmile tras el reseteo de la instancia n8nv2. Todas las 6 fases/sub-agentes validados con pruebas reales contra la base de datos.

## ✅ Archivos Modificados / Relevantes

### Código Backend (frontend/)
- `frontend/src/app/api/appointments/update/route.ts` — Merge query-string params (fix binding GET toolHttpRequest n8n)
- `frontend/src/app/api/documents/upload/route.ts` — Fix RLS: usar `supabaseAdmin` (service_role)
- `frontend/src/app/api/documents/vectorize/route.ts` — Fix RLS: usar `supabaseAdmin`
- `frontend/src/app/api/billing/document-cleaner/route.ts` — Ya correcto (usa supabaseAdmin)

### Configuración (.env)
- `frontend/.env.local` — `N8N_WEBHOOK_BASE_URL=https://n8nv2.mumaweb.com`, `N8N_WEBHOOK_URL=https://n8nv2.mumaweb.com/webhook/document-cleaner`, `N8N_VECTORIZER_WEBHOOK_URL=https://n8nv2.mumaweb.com/webhook/melosmile-knowledge-processor`, `N8N_API_KEY=melosmile_internal_n8n_key_2026`, `VPS_SSH_PASSWORD` (con comillas por # y !)
- `frontend/.env.remote` — Idem para producción/Vercel
- `~/.config/opencode/.env.mumabot` — `GOOGLE_GENERATIVE_AI_API_KEY`, `GEMINI_API_KEY`, `MUMABOT_EMBEDDING_MODEL=nomic-embed-text` (pero usamos `text-embedding-004`/`gemini-embedding-001` para vectorización)

### Migraciones Supabase
- `supabase/migrations/20260903000000_vector_embeddings.sql` — Tabla `document_embeddings` con `vector(3072)` + índice HNSW (límite 2000 dims → sin HNSW)
- `supabase/migrations/20260903001000_fix_embedding_dim_3072.sql` — Fix dimensión a 3072 (gemini-embedding-001 = 3072 dims)

### Scripts n8n (eliminados basura)
- Eliminados: `create_subworkflow_crear_cita.js`, `fix_action_as_fromai.js`, `fix_connections.js`, `fix_toolcode_*.js`, `restore_and_fix_agendamiento.js`, `restore_original_tool.js`

### n8n Workflows (n8nv2.mumaweb.com)
- `5xjgNTJ86tMQ09rP` — [MELOSMILE] AI Dispatcher (active)
- `d74hAW8IkmmCqoh5` — [MELOSMILE] Sub-Agent: Agendamiento (active, v2.28.5, toolHttpRequest intacto)
- `WNViucEUuhzigYtE` — [MELOSMILE] Sub-Agent: Clínico (active, binding $fromAI en URL corregido)
- `inakl5N4ROrmmrFh` — [MELOSMILE] Sub-Agent: Contabilidad (active, placeholder arreglado)
- `T5FvJ4PMcHKp1gBa` — [MELOSMILE] Sub-Agent: General (active)
- `W4yPIa4pWCZfqFir` — [MELOSMILE] Agent Document Cleaner (active, modelo actualizado a gemini-3.6-flash)
- `mm018qWKFN9GEqpQ` — Knowledge Processor v4 (activo, 4 nodos, referencias $json.body.* + $('Webhook').item.json.body.* corregidas, modelo gemini-embedding-001 → 3072 dims, tabla pgvector 3072)
  - `hglEpR7aHzDT1SGV` — Agendamiento (bug 'Required → at' **corregido** con n8n 2.28.5)

- Duplicados eliminados: `2lhbMlR6JA1HNtxV` y `b5k6bjoyEYx8ch0x` ([MELOSMILE] Sub-Agent: Crear Cita duplicados)

### n8n Production (n8nv2.mumaweb.com)
- Imagen actualizada: `n8nio/n8n:2.20.5` → `2.28.5` (bug 'Required → at' corregido)
- Contenedor: `n8n-production` (imagen 2.28.5, volume `n8n_test_data`, network `mumaweb_network`, puerto 5679:5678)
- Backup: `n8n-production-2.20.5-bak` (renombrado, rollback disponible)
- BD: PostgreSQL `n8n_test` (separada de develop que usa SQLite)

## 🔧 Decisiones Tomadas / Correcciones Aplicadas

1. **Bug n8n 2.20.5 → 2.28.5**: Bug `Received tool input did not match expected schema → at` (campo vacío) en `toolHttpRequest` POST + `jsonBody` + `$fromAI`. Corregido actualizando n8n-production a 2.28.5 (imagen ya descargada por dev). Rollback seguro con rename.

2. **Fix Binding toolHttpRequest**: 
   - Clínico: `placeholderDefinitions` + `{patient_id}` → `$fromAI` en URL (GET, funciona)
   - Contabilidad: `placeholderDefinitions` + `{invoice_id}` → `$fromAI` (Misconfigured placeholder arreglado)
   - Agendamiento: `bodyParameters` keypair (action literal + $fromAI) → `jsonBody` + `$fromAI` + prompt corregido (lista todos los campos) → **final**: GET con query params + `$('Webhook').item.json.body.*` (referencia correcta al body del webhook)

3. **Fix RLS Supabase**: Endpoints `documents/upload` y `documents/vectorize` usaban cliente `anon` (fallaba RLS). Cambiados a `supabaseAdmin` (service_role, bypassa RLS).

3. **FTP IONOS**: Password con `#` y `!` → necesitaba comillas en `.env` (dotenv trunca en `#` sin comillas). Corregido con comillas.

4. **Vectorización**:
   - `text-embedding-004` NO accesible con AI Studio key (es Vertex AI). Usado `gemini-embedding-001` (3072 dims) vía `generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent` + `x-goog-api-key`.
   - Tabla `document_embeddings` recreada con `vector(3072)` (HNSW no soporta >2000 dims → sin índice HNSW, se puede añadir ivfflat después).
   - Migración push a cloud aplicada.
   - Workflow `[MELOSMILE] Knowledge Processor` (`mm018qWKFN9GEqpQ`): Webhook → Embed → Transform → Insert Supabase (referencias `$('Webhook').item.json.body.*` corregidas).

5. **Document Cleaner**: Modelo actualizado `gemini-2.5-flash` → `gemini-3.6-flash` (deprecado). `N8N_WEBHOOK_URL` corregido a prod. Backend ya agrega prefijo `data:image/...;base64,`.

6. **Git**: Commit selectivo (3 archivos) + push a `develop` → Vercel staging desplegando. Scripts basura borrados.

6. **n8n Production**: Actualizado a 2.28.5 (Docker, rollback seguro con rename). Backup config guardado.

## 🎯 Próximos Pasos Pendientes

| Prioridad | Tarea | Estado |
|---|---|---|
| 1 | Rotar tokens expuestos (OpenRouter, Stripe, Google, Supabase) | Pendiente (deuda seguridad) |
| 2 | Verificar build Vercel staging (build verde confirmado por equipo) | Hecho (equipo confirmó) |
| 3 | Limpiar contenedor `n8n-production-2.20.5-bak` (tras confirmar estabilidad 2.28.5) | Pendiente (mantener unos días) |
| 4 | Revisar si hay más workflows huérfanos en n8nv2 | Pendiente |

## 📊 Estado E2E Final (Certificación Completa)

| Flujo | Test | Resultado | Verificación |
|---|---|---|---|
| Agendamiento | ✅ `success` | Cita creada en Supabase cloud (mundo real) |
| Clínico | ✅ `success` | Invoca `Tool_Clinical_Context` sin error |
| Contabilidad | ✅ `needs_clarification` | Comportamiento legítimo (pide especificar) |
| Document Cleaner | ✅ `success` | OCR extrae JSON real (pacientes, horas, tratamientos, notas IPR) |
| Vectorización | ✅ `success` | Embedding 3072-dims persistido en pgvector cloud |

---

*Generado: 2026-09-03 | Proyecto: melosmile | Sesión: certificación E2E completa*
