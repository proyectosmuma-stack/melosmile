# Auditoría Fase 11 + Backlog Append — hallazgos verificados (2026-08-23)

> Compilado de dos auditorías de código (coder-cloud) verificadas contra el árbol real. Sirve como base de implementación sin re-derivar. NO incluye cambios de código aún.

## 1. Galería cronológica de fotos por paciente (Fase 11-A)

### Estado actual
- Esquema `documents` (migración `20260722000002_extended_schema.sql:90-112`): `id, patient_id NOT NULL FK→patients, appointment_id NULL FK→appointments (SET NULL), document_type enum(foto_clinica|radiografia|...), file_name, file_path, file_url NULL, file_size_bytes, mime_type, description, created_at`.
- **La relación documents→appointments YA EXISTE**: agrupar fotos por cita NO requiere migración.
- RLS vigente: policy "Allow public all" (`20260722000004_fix_rls_policies.sql`) — abierta del todo.
- NO existe ningún endpoint GET de listado bajo `/api/documents/` (solo upload y vectorize).
- La ficha de cita (`appointments/[id]/page.tsx:237-241,727-732,1226-1248`) ya lista fotos vía `file_url`; si es NULL muestra placeholder (sin lightbox).
- Ficha paciente (`patients/[id]/page.tsx`, tabs historial/facturacion/recordatorios): su query de documents NO selecciona appointment_id/file_path/mime_type.

### ⚠️ Brecha bloqueante: DOS backends conviviendo
| Origen | file_url | Renderiza hoy |
|---|---|---|
| Legacy seed/migración Notion | URL pública Supabase Storage (`patient-documents`) | SÍ |
| Flujo FTP vigente (`upload/route.ts`) | **SIEMPRE NULL** | NO (placeholder) |

Toda la galería depende de resolver URLs server-side desde `file_path` (VPS) o migrar binarios legacy. Decisión pendiente con el humano.

### Plan (10–14 h)
1. `src/lib/utils/document-utils.ts` (NUEVO): `isImageDocument()`, `resolveDocumentUrl()` (file_url → VPS path → null).
2. `api/documents/route.ts` (NUEVO, GET): listado paginado por patientId + embed cita; resuelve URLs server-side (env privada `VPS_FILES_BASE`). Cierra también el contrato n8n "/api/documents".
3. `components/patients/photo-lightbox.tsx` (NUEVO): zoom rueda+botones (1x–5x), pan, teclado, descarga, panel metadatos, contador. Sobre `ui/dialog.tsx` existente (0 dependencias nuevas).
4. `components/patients/photo-gallery.tsx` (NUEVO): grupos por fecha de cita (embed), cabecera "Sin cita asociada" para appointment_id NULL, secciones colapsables descendentes, grid lazy + "Cargar más" (bloques de 50).
5. Integrar tab `galeria` en ficha paciente (ampliar select de documents). Opcional: reutilizar Lightbox en la ficha de cita.

## 2. Badges de adjuntos en citas + drawer (Fase 11-B)

### Estado actual
- `calendar-view.tsx`: interfaz AppointmentEvent SIN campos de adjuntos; query carga TODAS las citas sin join a documents; tarjetas (DraggableEvent week/day) y chips mensuales sin badges.
- `appointment-detail-drawer.tsx` (237 lín): SIN sección adjuntos; estado hardcodeado a "Confirmada" (bug menor aparte).
- Matiz: `notes` almacena marcadores estructurales ([Odontograma:], [DoctorInvitado:]) → badge "tiene notas" debe filtrarlos o siempre saldría activo.

### Plan (8–12 h)
1. Conteo de adjuntos: RPC SQL (migración nueva) que devuelva (appointment_id, photos, docs) por lote — preferible a `.in()` cliente (la query del calendario ya trae la tabla entera sin límite).
2. `AppointmentEvent` += hasPhotos/hasDocs/photoCount/docCount; hasNotes filtra marcadores.
3. `components/calendar/attachment-badges.tsx` (NUEVO): Camera×N / Paperclip×N / StickyNote con tooltips, tamaños sm (mes) y xs (week/day).
4. Drawer: useEffect al abrir → query documents por appointment_id; sección "Adjuntos (N)" con thumbnails que abren el PhotoLightbox reutilizado.

**Total core Fase 11: 18–26 h.**

## 3. Backlog: append de procedimientos en citas (Musly)

### Punto real de sobrescritura
- `api/appointments/create/route.ts:337-348`: la unificación (mismo paciente+fecha exacta) reescribe `notes` completas descartando texto libre; si el regex del bloque `[Procedimientos:]` falla, el catch vacío produce pérdida silenciosa de TODO el historial mientras billing suma importes (inconsistencia triple notes/reason/billing).
- `api/appointments/update/route.ts:370`: `if(notes) updates.notes = notes` sobrescribe directo (sin pasar por enrich).
- `update/route.ts:433`: dedup por serviceName hace skip silencioso devolviendo success:true (éxito falso para Musly).
- **Hallazgo clave**: `enrichNotesWithProcedure()` (update L386-464) YA hace append correcto conservando texto libre — el backlog se resuelve formalizándolo, no creando de cero.

### Diseño MVP propuesto (11–15 h)
1. Extraer utils compartidos: `procedure-matcher.ts` + `notes-parser.ts` (hoy hay 2 parsers ad-hoc en 5 sitios: regex greedy vs bracket-depth).
2. Nuevo contrato en `/api/appointments/update`: `action:"add_procedures"` + treatments[] + appointment_id (el helper n8n `MlrysSNd3N8tDjVh` hace forward JSON puro → solo ampliar schema/prompt, sin tocar topología n8n).
3. Sync billing_records con gating: mutar solo si status=Pendiente; si Aprobado/Facturado Odoo → devolver blocked_reason (hoy create/L358 muta sin filtrar status = bug de corrupción de facturas).
4. Respuesta honesta `{added[], skipped[], billing}` (elimina éxito-falso del dedup).
5. Regla para Musly: "append usa SIEMPRE action=add_procedures con appointment_id; PROHIBIDO enviar notes".

### Riesgos documentados
- Race condition read→merge→PATCH no atómico (mitigar con concurrencia optimista por updated_at; solución limpia RPC FOR UPDATE).
- Índices posicionales en billing_session_lines (`appointment_id_procedure_index`): append al FINAL es seguro; reordenar desplaza índices y corrompe ediciones manuales preservadas.
- Dedup serviceName+toothRef (permitir 2 empastes legítimos distinguiendo pieza).

## 4. Seguridad detectada durante la auditoría (CRÍTICO)

- 🔴 **Credenciales FTP hardcodeadas como fallbacks** en `frontend/src/app/api/documents/upload/route.ts` (~L45-48): host/user/password reales en el código fuente (van también al bundle de Vercel). ACCIÓN: rotar credenciales en el VPS, eliminar fallbacks, dejar solo process.env (delegación env-writer).
- 🟠 RLS de `documents` = ALLOW ALL + URLs legacy públicas de bucket Storage → fotos clínicas potencialmente accesibles sin auth (RGPD). Antes de publicar la galería: proxy autenticado `/api/documents/file/[id]` o signed URLs.
