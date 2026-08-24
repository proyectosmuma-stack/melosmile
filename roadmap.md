# Roadmap de Desarrollo — Melosmile

> ⚠️ **REGLA DE RAMAS**: Este archivo pertenece exclusivamente a la rama `develop` y NUNCA debe fusionarse a la rama `main`.
> **Nota Histórica**: Las fases 1 a 10 (completadas) han sido archivadas en `docs/archive/changelog.md`.

Este documento establece el plan de desarrollo y próximas tareas activas para la plataforma **Melosmile**.

---

## 📍 Estado Actual: Rama `develop` (Entorno `melosmile-staging`) / `main` (`agenda.melosmile.com`)

- ✅ **Fusión a Producción y Migración de Datos Reales (2026-08-23):** Fusión de `develop` a `main` con despliegue en Vercel Producción (`https://agenda.melosmile.com`). Migración completa de Notion a Supabase Cloud de 66 pacientes reales (`PAC-001` a `PAC-066`), 81 citas históricas, 28 registros de facturación y 88 fotografías clínicas almacenadas en Supabase Storage (`patient-documents`).
- ✅ **Sincronización Supabase Local ← Cloud:** Local y Cloud 100% sincronizados con esquema y datos reales.
- ✅ **Infraestructura Staging:** Dominio `https://staging.melosmile.com` asignado a `melosmile-staging` en rama `develop`.
- ✅ **Revival de Musly en Producción n8nv2 (2026-08-24):** Causa raíz del apagón = credencial OpenRouter inexistente en el dispatcher. Reparada y migrados los 4 subagentes + Bridge API al patrón toolWorkflow (eliminando el bug estructural `toolHttpRequest`+$fromAI). Lectura Y escritura certificadas E2E contra BD. Detalle: `docs/knowledge-base/log.md`.
- ✅ **Endurecimiento RGPD de Fotografías Clínicas (2026-08-24):** Bucket `patient-documents` en PRIVADO, RLS `documents` sin políticas públicas (local+cloud), signed URLs TTL 3600s servidas por `/api/documents`. Despliegue cero-ventana-rota: staging → verificación → producción (`agenda.melosmile.com`) → verificación → flip del bucket. Verificación final: URL pública→400 · firmadas prod/staging→200.

---

## 🚀 Fase 11: Gestión Visual de Fotografías Clínicas y Trazabilidad de Citas

- [x] **Galería Cronológica de Fotografías por Paciente:** *(Implementada 2026-08-23: `photo-gallery.tsx` + `photo-lightbox.tsx` + tab "Fotografías" en ficha + GET `/api/documents`)*
  - Crear una vista general / pestaña de fotografías clínicas en la ficha de cada paciente (`/patients/[id]`).
  - Organizar las fotos cronológicamente por la fecha de la consulta/cita a la que pertenecen.
  - Soporte para previsualización en alta resolución (Lightbox / modal de zoom), descarga y metadatos de evolución.
- [x] **Indicador Visual de Adjuntos e Información en Citas (Agenda):** *(Implementado 2026-08-23: `attachment-badges.tsx` en `calendar-view.tsx` + sección Adjuntos con Lightbox en `appointment-detail-drawer.tsx`, estado real de cita incluido)*
  - Añadir un badge o icono distintivo (ej. 📎 / 📷) en las tarjetas de citas del Calendario y vista diaria/semanal cuando la cita contenga fotografías, documentos o notas clínicas adjuntas.
  - Permitir al profesional identificar al instante qué citas disponen de registro fotográfico o documentación previa sin abrir cada cita manualmente.
  - Previsualización rápida de adjuntos desde el drawer de detalle de cita (`AppointmentDetailDrawer`).

---

## 🔧 Pendiente (Backlog)

- [ ] Añadir soporte para que el agente pueda añadir procedimientos adicionales a una cita ya existente sin sobrescribir los procedimientos anteriores (Mejora pendiente detectada previamente).
- [ ] **E2E Document Cleaner**: certificar el flujo reparado (`IrLOC3fSQZCxvvBz` prod) con foto de agenda manuscrita o Excel real del usuario. Al hacerlo, consumir signed URLs o base64 (nunca URLs públicas).
- [ ] **Timezone UX**: `/api/appointments/list` devuelve horas en UTC crudo; normalizar a hora España en endpoint o enriquecer contexto del agente.
- [ ] **Odoo end-to-end**: configurar `ODOO_*` en Vercel y probar facturación (la ruta `odoinvoice` ya existe en el Bridge).
- [ ] **Paridad storage dev-local** (opcional): sincronizar objetos/buckets al Supabase local o apuntar env dev a cloud para que la galería local no muestre rotas.

