# ESTADO DEL PROYECTO MELOSMILE — Sesión 2026-08-28

## 🎯 Objetivo actual
- **Planificación y creación de tareas en Notion** para el proyecto "Sistema Melosmile" basadas en el roadmap actual
- **Fase 12: Consentimientos Informados** (bloqueada esperando plantillas clínicas del usuario) → 7 tareas
- **Backlog pendiente** → 5 tareas (Timezone UX, Paridad Storage, E2E Document Cleaner, Añadir Procedimientos, Migraciones Locales)
- **Programación**: Inicio lunes 1 septiembre 2026, solo días laborables (L-V, sin fines de semana)
- **Bloqueo actual**: Base de datos "Tareas" en Notion no compartida con integración "N8N-Muma" → impide escritura vía API

## 📁 Archivos modificados / relevantes
- `context.md` — Contexto técnico completo (stack, infraestructura 3 entornos, variables de entorno)
- `roadmap.md` — Estado fases: Fase 11 ✅ completada, Fase 12 ⏳ pendiente, Backlog 5 items
- `Walkthrough.md` — Historial sesiones 18/08, 22/08, 24/08, 26/08 (Musly prod, RGPD fotos, Odoo E2O, separación BDs)
- `docs/architecture/notion_registry.ts` — SSOT de IDs Notion (TAREAS: `2bcb6518-1657-8143-b046-fb84399f9359`)
- `docs/knowledge-base/domains/n8n-workflows.md` — Topología flujos n8n (Dispatcher + 4 subagentes + Bridge)
- `supabase/migrations/` — 3 nuevas migraciones pendientes aplicar en local:
  - `20260826212336_add_patient_id_to_billing_records.sql`
  - `20260826214954_update_billing_status_enum.sql`
  - `20260826215605_add_memory_schemas.sql`
- `frontend/src/app/api/appointments/update/route.ts` — Modificado (no staged)
- `frontend/src/lib/odoo/client.ts` — Modificado (no staged)
- `supabase/seed.sql` — Modificado (no staged)

## ✅ Decisiones tomadas
1. **Separación de entornos Supabase** (sesión 26/08): Producción reactivada (`xylqytpudbdcsbuuwqpi`), Staging (`amhfdzfcmpastmlsosou`), Local sincronizado
2. **Endurecimiento RGPD fotos clínicas** (sesión 24/08): Bucket `patient-documents` privado, RLS sin políticas públicas, signed URLs TTL 3600s vía `/api/documents`
3. **Revival Musly en n8nv2 prod** (sesión 24/08): Migración completa a patrón `toolWorkflow` (eliminado bug `toolHttpRequest`+$fromAI), Bridge API con 11 rutas
4. **Odoo E2E certificado** (sesión 26/08): Facturación integrada funcionando en producción
5. **Despliegue Vercel**: Manual desde `frontend/` para staging (`develop`), desde raíz para producción (`main`)
6. **12 tareas planificadas** para Notion con fechas L-V desde 1 sep, documentación obligatoria en `docs/knowledge-base/domains/`

## 🚀 Próximos pasos pendientes
- **[BLOQUEADOR] Compartir BD "Tareas" con integración "N8N-Muma" en Notion** (⋮ → Conexiones → N8N-Muma)
- **Crear 12 tareas en Notion** vía `mumabot-notion-sync` con planificación detallada
- **Iniciar entorno local**: `supabase start && npm --prefix frontend run dev`
- **Aplicar 3 migraciones pendientes** en local: `supabase db reset`
- **Commit & push** cambios actuales a `origin/develop` (1 commit por delante)
- **Desplegar staging** en Vercel si hay cambios válidos
- **Fase 12**: Esperar plantillas clínicas del usuario para desbloquear
- **Backlog**: Ejecutar por prioridad (Timezone UX → Storage Parity → Document Cleaner → Procedimientos → Migraciones)

## 📅 Planificación de tareas (12 total, inicio 1 sep 2026)
| # | Tarea | Fase | Inicio | Fin | Días | Doc Requerida |
|---|-------|------|--------|-----|------|---------------|
| 1 | Diseño Módulo Consentimientos | 12 | 1 Sep | 2 Sep | 2 | consentimientos-informados.md |
| 2 | Autocompletado Datos Paciente | 12 | 3 Sep | 4 Sep | 2 | consentimientos-informados.md |
| 3 | Modal Edición Pre-generación | 12 | 5 Sep | 5 Sep | 1 | consentimientos-informados.md |
| 4 | Generación y Almacenamiento PDF | 12 | 8 Sep | 9 Sep | 2 | consentimientos-informados.md |
| 5 | Listado y Consulta Ficha Paciente | 12 | 10 Sep | 10 Sep | 1 | consentimientos-informados.md |
| 6 | Firma Digital/Manuscrita | 12 | 11 Sep | 11 Sep | 1 | consentimientos-informados.md |
| 7 | Cumplimiento RGPD | 12 | 12 Sep | 15 Sep | 2 | consentimientos-informados.md |
| 8 | Timezone UX Normalización | Backlog | 16 Sep | 16 Sep | 1 | api-appointments.md |
| 9 | Paridad Storage Dev-Local | Backlog | 17 Sep | 17 Sep | 1 | storage-parity.md |
| 10 | E2E Document Cleaner Certificación | Backlog | 18 Sep | 19 Sep | 2 | log.md + n8n-workflows.md |
| 11 | Añadir Procedimientos Cita Existente | Backlog | 22 Sep | 23 Sep | 2 | n8n-workflows.md |
| 12 | Aplicar Migraciones Locales (3 SQL) | Backlog | 24 Sep | 24 Sep | 1 | database-schema.md |

## 💡 Para reiniciar la conversación
Al comenzar una nueva sesión, el usuario (o agente) debe:
1. **Leer** `.opencode/ESTADO_PROYECTO.md` para recuperar el contexto.
2. **Decir** *"Lee .opencode/ESTADO_PROYECTO.md y sigamos desde ahí."* para que el asistente retome exactamente donde quedamos, manteniendo el rendimiento del servidor MLX local al 100%.

---
*Generado automáticamente por MumaBot Cloud Pro el 2026-08-28 para persistencia de estado.*