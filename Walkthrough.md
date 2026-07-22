# Walkthrough de Implementación — Melosmile

> ⚠️ **REGLA DE RAMAS**: Este archivo pertenece exclusivamente a la rama `develop` y NUNCA debe fusionarse a la rama `main`.

Este documento detalla todas las funcionalidades desarrolladas, configuraciones de infraestructura y pruebas validadas en el proyecto **Melosmile**.

---

## 1. Unificación del Popup Modal de Nueva Cita (`NewAppointmentModalGlobal`)

- **Ubicación**: `frontend/src/components/calendar/new-appointment-modal.tsx`
- **Funcionalidad Unificada**:
  - **Popup Único**: Tanto el botón `+ Nueva Cita` en el header, los botones de agendamiento en la ficha del paciente, como el clic en cualquier celda de horario del calendario abren exactamente el **mismo popup modal**.
  - **Campos Esenciales Únicamente**: Se eliminaron los campos de cobro, comisiones y gastos de laboratorio del popup modal de creación. Toda la gestión financiera se maneja como información adicional dentro de la página dedicada de cada cita (`/appointments/[id]`).

---

## 2. Rediseño de la Agenda y Navegación Interactiva

- **Ubicación**: `frontend/src/app/(dashboard)/page.tsx`
- **Cambios en Widgets**:
  - **Eliminación de la Insignia**: Se eliminó la etiqueta `Vista Semanal / 15-min` junto a "Agenda Principal".
  - **Eliminación del 4to Widget**: Se retiró la tarjeta `Procesado por n8n IA / 38 Registros`.
  - **Rediseño Compacto de Widgets**: Las 3 tarjetas restantes (*Citas para Hoy*, *Facturado Este Mes*, *Pacientes Atendidos*) se diseñaron con un estilo más compacto y estilizado.
  - **Interacción "Citas para Hoy"**: Al hacer clic en la tarjeta **Citas para Hoy**, la agenda cambia automáticamente a la fecha de **Hoy** y conmuta el calendario a la **Vista de Día** (`day view`).

---

## 3. Ficha de Cita Dedicada (`/appointments/[id]`)

- **Ubicación**: `frontend/src/app/(dashboard)/appointments/[id]/page.tsx`
- **Funcionalidades**:
  - **Gestión Financiera**: Concentra los campos de precio total, comisión %, descuento de laboratorio y cálculo del neto.
  - **Evolución Médica**: Anotaciones clínicas para seguimiento continuado estilo Notion.
  - **Sección Contable Odoo**: Sincronización de facturación borrador (`account.move`).

---

## 4. Directorio, Fichas de Pacientes y Sistema de Etiquetas (`/patients`, `/patients/[id]`, `/patients/[id]/edit`)

- **Ubicaciones**: 
  - `frontend/src/app/(dashboard)/patients/page.tsx`
  - `frontend/src/app/(dashboard)/patients/[id]/page.tsx`
  - `frontend/src/app/(dashboard)/patients/[id]/edit/page.tsx`
  - `frontend/src/components/patients/tag-input.tsx`
- **Funcionalidades Avanzadas**:
  - **Sistema de Etiquetas (WordPress Style)**: Autocompletado AJAX/JSON en tiempo real, creación *on-the-fly* y barra de filtros interactiva.
  - **Asignación Dinámica de Sedes**: Habilitadas políticas RLS en Supabase Cloud.

---

## 5. Integración Supabase y Vercel (Staging)

- **Referencia Supabase**: `amhfdzfcmpastmlsosou`
- **URL Staging Activa**: [https://melosmile-staging-7m6bblzux-proyectosmuma-stacks-projects.vercel.app](https://melosmile-staging-7m6bblzux-proyectosmuma-stacks-projects.vercel.app)
