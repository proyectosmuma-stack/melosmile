# Walkthrough de Implementación — Melosmile

Este documento detalla todas las funcionalidades desarrolladas y validadas en el proyecto Melosmile.

---

## 1. Calendario Interactivo con Drag & Drop y Vista Previa

- **Ubicación**: `frontend/src/components/calendar/calendar-view.tsx`
- **Funcionalidades**:
  - **Drag & Drop**: Implementado mediante `@dnd-kit/core`. Permite arrastrar cualquier cita dentro de la cuadrícula semanal/diaria y soltarla en un nuevo intervalo de hora o fecha, actualizando el estado de la aplicación dinámicamente.
  - **Vista Previa al Pasar el Ratón (Hover Card/Tooltip)**: Al posicionar el cursor sobre una tarjeta de cita, se despliega una ventana flotante oscura mostrando:
    - Nombre del paciente e ID de historia (`PAC-xxx`).
    - Teléfono directo de contacto.
    - Correo electrónico.
  - **Selector de Clínica y Comisión**: Permite alternar la sede (Albacete, Goya, Las Rozas) y ajustar porcentajes base.

---

## 2. Ficha de Cita Dedicada (`/appointments/[id]`)

- **Ubicación**: `frontend/src/app/(dashboard)/appointments/[id]/page.tsx`
- **Funcionalidades**:
  - **Tratamiento en Texto Libre**: Permitido para redactar múltiples intervenciones en una misma sesión.
  - **Evolución Médica (Estilo Notion)**: Área de texto de anotaciones clínicas para seguimiento continuado de cada sesión.
  - **Gestor Documental y Fotografías**: Zona interactiva para subir fotografías intraorales, radiografías o consentimientos.
  - **Sección Contable y Sincronización Odoo**:
    - Selección de estado del pago: `Pendiente`, `Pago Parcial / Entrega`, `Pagado Total`.
    - Sobrescritura a nivel de cita del `% Comisión Dra.` y `% Descuento Laboratorio`.
    - Cálculo automático en tiempo real del Neto resultante.
    - Botón de envío/sincronización con la API de Odoo.

---

## 3. Ficha Histórica del Paciente (`/patients/[id]`)

- **Ubicación**: `frontend/src/app/(dashboard)/patients/[id]/page.tsx`
- **Funcionalidades**:
  - **Perfil General**: Datos personales, teléfono, email, DNI y alertas médicas de riesgo (alergias y enfermedades importantes).
  - **Historial de Citas**: Pestaña dedicada con el listado completo de citas pasadas y futuras.
  - **Documentación y Consentimientos**: Visualizador y gestor de archivos subidos del paciente.
  - **Historial Financiero**: Registro consolidado de abonos, entregas parciales y pagos completados.

---

## 4. Agente de IA y Enrutador n8n (Dispatcher)

- **Ubicación**: `n8n-workflows/melosmile/03-melosmile-ai-dispatcher.json`
- **Funcionalidades**:
  - Flujo n8n etiquetado como `Melosmile`.
  - Recibe peticiones en lenguaje natural vía Webhook (desde la barra de IA en el Dashboard o canales externos como WhatsApp/Telegram).
  - Enruta la petición según la intención detectada:
    - `schedule_appointment`: Agendar o mover citas.
    - `patient_info`: Consultas o creación de pacientes.
    - `billing`: Registro de pagos y facturación.
    - `clinical_note`: Anotaciones clínicas.

---

## 5. Integración Supabase

- **Ubicaciones**: `frontend/src/lib/supabase/client.ts` y `supabase_schema.sql`
- **Configuración**:
  - Cliente de Supabase inicializado con `@supabase/supabase-js`.
  - Esquema SQL PostgreSQL preparado con tablas para clínicas, profesionales, pacientes, citas y registros de facturación.
