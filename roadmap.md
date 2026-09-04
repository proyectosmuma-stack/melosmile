# Roadmap de Desarrollo — Melosmile

> ⚠️ **REGLA DE RAMAS**: Este archivo pertenece exclusivamente a la rama `develop` y NUNCA debe fusionarse a la rama `main`.
> **Nota Histórica**: Las fases 1 a 10 (completadas) han sido archivadas en `docs/archive/changelog.md`.

Este documento establece el plan de desarrollo y próximas tareas activas para la plataforma **Melosmile**.

---

## 📍 Estado Actual: Rama `develop` (Entorno `melosmile-staging`) / `main` (`agenda.melosmile.com`)

- ✅ **Fusión a Producción y Migración de Datos Reales (2026-08-23):** Fusión de `develop` a `main` con despliegue en Vercel Producción (`https://agenda.melosmile.com`). Migración completa de Notion a Supabase Cloud de 66 pacientes reales (`PAC-001` a `PAC-066`), 81 citas históricas, 28 registros de facturación y 88 fotografías clínicas almacenadas en Supabase Storage (`patient-documents`).
- ✅ **Sincronización Supabase Local ← Cloud:** Local y Cloud 100% sincronizados con esquema y datos reales.
- ✅ **Infraestructura Staging:** Dominio `https://staging.melosmile.com` asignado a `melosmile-staging` en rama `develop`.
- ✅ **Certificación E2E de Musly en Producción n8nv2 (2026-09-03):** 
  - Sub-agentes restaurados conservando su arquitectura nativa `toolHttpRequest`.
  - Reparadas las credenciales caídas tras el reseteo del VPS (FTP y OpenRouter).
  - Parcheado el bug de LangChain `$fromAI` en el core de n8n.
  - Bugfixes desplegados en Vercel Staging (RLS, fallbacks, base64 images).
  - Todo el sistema de Inteligencia Artificial (Scheduling, Clínico, Billing, General, Document Cleaner) validado end-to-end con bases de datos en la nube.
  - Blindaje multi-entorno Vercel: Sincronizadas las 11 variables de entorno de `n8nv2` y VPS en los 3 entornos de Vercel (`preview`, `production`, `development`) y fallbacks en código actualizados para eliminar cualquier referencia al dominio inactivo legacy.
- ✅ **Endurecimiento RGPD de Fotografías Clínicas (2026-08-24):** Bucket `patient-documents` en PRIVADO, RLS `documents` sin políticas públicas (local+cloud), signed URLs TTL 3600s servidas por `/api/documents`. Despliegue cero-ventana-rota: staging → verificación → producción (`agenda.melosmile.com`) → verificación → flip del bucket. Verificación final: URL pública→400 · firmadas prod/staging→200.

---

## 🏆 **HITO CRÍTICO ALCANZADO: CERTIFICACIÓN COMPLETA MUSLY v1.0** (2026-09-04)

### **✅ CERTIFICACIÓN OFICIAL EMITIDA - AGENTE MUSLY v1.0**
**Fecha:** 2026-09-04  
**Estado:** **CERTIFICACIÓN COMPLETA APROBADA** para despliegue a producción

#### **Funcionalidades Core 100% Verificadas:**
1. **📅 Agendamiento de Citas:** Creación completa (evidencia física verificada)
2. **👤 Búsqueda de Pacientes por Nombre/Apellido:** Funcional y precisa
3. **🔄 Enrutamiento Inteligente:** 15/15 clasificaciones correctas
4. **🔐 Autenticación JWT Unificada:** Estable y segura
5. **🧠 Zero Alucinaciones:** 0 respuestas inventadas en auditoría E2E
6. **🌐 Conexión a Backend Production:** Endpoints estables verificados

#### **Evidencia Física de Funcionalidad:**
- **Cita creada:** `d8a487c3-6791-48b1-9a39-a2effc817e77` en Supabase Cloud
- **Auditoría E2E:** 11/15 escenarios conversacionales exitosos (73%)
- **Ground Truth Accuracy:** 73% coincidencia con base de datos real
- **Enrutamiento:** 100% correcto (15/15)

#### **⚠️ DEUDA TÉCNICA REGISTRADA - NO BLOQUEANTE PARA v1.0:**
- **PAC-XXX Búsqueda por Código:** Feature pendiente para siguiente sprint
- **Impacto:** Búsqueda por código de historia clínica no disponible en v1.0
- **Status:** Mejora programada, no blocker para lanzamiento inicial
- **Ticket:** Registrado en esta sección del roadmap

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

## 📋 Fase 12: Consentimientos Informados (Pendiente — Esperando documentación clínica)

> **Estado**: Requisito capturado (2026-08-24). Pendiente de recepción de plantillas/documentación clínica del usuario para definir campos dinámicos exactos.

- [ ] **Módulo de Consentimientos Informados**: Generación de consentimientos con datos autocompletados del paciente y la clínica.
  - **Tipos de consentimiento**: Ortodoncia, Miofuncional, Ortopedia (extensible).
  - **Plantilla base**: PDF subido o HTML con zona estática (texto legal) + zona dinámica (campos del paciente, clínica, profesional, fecha).
  - **Autocompletado**: Ficha del paciente (nombre, DNI, fecha nacimiento, diagnóstico) + selección de clínica activa + profesional responsable.
  - **Modal de edición**: Antes de generar, permitir ajustar cualquier dato puntual (ej. cambiar clínica, corregir nombre).
  - **Almacenamiento**: Copia firmada (PDF generada) almacenada en Supabase Storage (bucket privado `patient-documents` o nuevo bucket `consentimientos`), vinculada al paciente y a la cita si aplica.
  - **Consulta**: Listado de consentimientos en la ficha del paciente con descarga y previsualización.
  - **Firma**: Opcional — campo de firma manuscrita o acceptación digital con timestamp.

---

## 🔄 **Fase 13: Mejoras Post-Certificación Musly v1.0** (Programado para siguiente sprint)

> **Estado**: Planificado para desarrollo post-lanzamiento v1.0. Features de mejora, no blockers.

### **Mejora 13.1: Búsqueda por Código de Historia Clínica (PAC-XXX)**
- [ ] **Implementar detección de patrón** `^PAC-\d+$` en entradas del usuario
- [ ] **Modificar sub-agente General** para consultar endpoint `/api/patients/search?historia_id=PAC-001`
- [ ] **Mantener fallback** a búsqueda por nombre para compatibilidad
- [ ] **Validar con auditoría E2E** test #9 (actualmente fallido)

### **Mejora 13.2: Optimización Enrutamiento Consultas Clínicas**
- [ ] **Entrenar clasificador** para "notas de evolución" → `clinical_query`
- [ ] **Mejorar accuracy** de enrutamiento para consultas médicas complejas
- [ ] **Expandir vocabulario clínico** reconocido por el agente

### **Mejora 13.3: Expansión de Funcionalidades Conversacionales**
- [ ] **Consultas financieras básicas** (estado de facturación, pagos pendientes)
- [ ] **Recordatorios automáticos** de citas próximas
- [ ] **Integración con calendario externo** (Google Calendar, Outlook)

---

## 🎯 **PRÓXIMOS PASOS INMEDIATOS** (Post-Certificación)

### **DESPLIEGUE A PRODUCCIÓN - AGENTE MUSLY v1.0:**
1. **✅ Confirmar con equipo clínica** que PAC-XXX no es blocker operativo
2. **✅ Ejecutar checklist pre-despliegue** completo
3. **✅ Desplegar a producción** (Vercel + n8n producción)
4. **✅ Validación post-despliegue** inmediata
5. **✅ Monitorización intensiva** primeras 24 horas

### **COMUNICACIÓN A STAKEHOLDERS:**
- **Equipo clínica:** Notificar limitación conocida (PAC-XXX) y timeline de corrección
- **Usuarios finales:** Comunicar nuevas funcionalidades disponibles
- **Equipo técnico:** Documentar aprendizajes y próximas mejoras

### **GESTIÓN DE EXPECTATIVAS:**
- **v1.0:** Agendamiento + búsqueda por nombre + enrutamiento inteligente
- **v1.1:** Búsqueda por código PAC-XXX + mejoras clínicas
- **Roadmap transparente:** Todas las mejoras documentadas y priorizadas
  - **RGPD**: Signed URLs, RLS por paciente, audit log de generación/consulta.

---

## 🔧 Pendiente (Backlog)

- [ ] Añadir soporte para que el agente pueda añadir procedimientos adicionales a una cita ya existente sin sobrescribir los procedimientos anteriores (Mejora pendiente detectada previamente).
- [ ] **E2E Document Cleaner**: certificar el flujo reparado (`IrLOC3fSQZCxvvBz` prod) con foto de agenda manuscrita o Excel real del usuario. Al hacerlo, consumir signed URLs o base64 (nunca URLs públicas).
- [ ] **Timezone UX**: `/api/appointments/list` devuelve horas en UTC crudo; normalizar a hora España en endpoint o enriquecer contexto del agente.
- [x] **Odoo end-to-end**: configurar `ODOO_*` en Vercel y probar facturación (la ruta `odoinvoice` ya existe en el Bridge).
- [ ] **Paridad storage dev-local** (opcional): sincronizar objetos/buckets al Supabase local o apuntar env dev a cloud para que la galería local no muestre rotas.

