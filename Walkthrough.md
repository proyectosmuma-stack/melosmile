# Walkthrough de Implementación — Melosmile

> ⚠️ **REGLA DE RAMAS**: Este archivo pertenece exclusivamente a la rama `develop` y NUNCA debe fusionarse a la rama `main`.

Este documento detalla todas las funcionalidades desarrolladas, configuraciones de infraestructura y pruebas validadas en el proyecto **Melosmile**.

---

## 1. Calendario Interactivo con Drag & Drop y Vista Previa

- **Ubicación**: `frontend/src/components/calendar/calendar-view.tsx`
- **Funcionalidades**:
  - **Drag & Drop**: Implementado mediante `@dnd-kit/core`. Permite arrastrar cualquier cita dentro de la cuadrícula semanal/diaria y soltarla en un nuevo intervalo de hora o fecha, actualizando el estado de la aplicación dinámicamente.
  - **Vista Previa al Pasar el Ratón (Hover Card/Tooltip)**: Al posicionar el cursor sobre una tarjeta de cita, se despliega una ventana flotante mostrando:
    - Nombre del paciente e ID de historia (`PAC-xxx`).
    - Teléfono directo de contacto y Email.
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

---

## 3. Directorio de Fichas de Pacientes (`/patients`)

- **Ubicaciones**: `frontend/src/app/(dashboard)/patients/page.tsx` y `frontend/src/app/(dashboard)/patients/[id]/page.tsx`
- **Funcionalidades**:
  - **Selector de Vista**: Botón selector para cambiar en tiempo real entre **Vista en Tarjetas (Grid)** y **Vista en Listado (Tabla)**.
  - **Buscador & Filtro de Estado**: Permite buscar pacientes por Nombre, DNI/NIE, Número de Historia o Teléfono, así como filtrar por estado (En Tratamiento vs Alta).
  - **Campos de Ficha Completa**:
    - Identificadores: Historia (`PAC-xxx`), DNI/NIE, Nombre y Apellidos, Género, Fecha Nacimiento, Dirección.
    - Contacto: Teléfono y Correo Electrónico.
    - Anamnesis / Alertas Médicas: Alergias destacadas, Enfermedades/Antecedentes importantes, Medicación actual y Cirugías previas.
    - Plan de Tratamiento Inicial.
  - **Creación de Nuevo Paciente**: Modal completo con todos los campos médicos y personales conectable con Supabase.
  - **Ficha Histórica Individual (`/patients/[id]`)**: Vista en detalle del historial médico, consentimientos y estado financiero del paciente.

---

## 4. Agente de IA y Enrutador n8n (Dispatcher)

- **Ubicación**: `n8n-workflows/melosmile/03-melosmile-ai-dispatcher.json`
- **Funcionalidades**:
  - Flujo n8n alojado en VPS IONOS.
  - Recibe peticiones en lenguaje natural vía Webhook (desde la barra de IA en el Dashboard o canales externos como WhatsApp/Telegram).
  - Enruta la petición según la intención detectada: `schedule_appointment`, `patient_info`, `billing`, `clinical_note`.

---

## 5. Integración Supabase (Configuración Realizada)

- **Referencia del proyecto**: `amhfdzfcmpastmlsosou`
- **URL Supabase**: `https://amhfdzfcmpastmlsosou.supabase.co`
- **Componentes y Migraciones**:
  - **CLI y Enlace**: Inicializado con `supabase init` y vinculado con `supabase link --project-ref amhfdzfcmpastmlsosou`.
  - **Migración SQL**: Archivo inicial [supabase/migrations/20260722000000_initial_schema.sql](file:///Users/munircallaos/Antigravity%20Projects/melosmile/supabase/migrations/20260722000000_initial_schema.sql) aplicado a la nube mediante `supabase db push`.
  - **Tipado TypeScript**: Tipos autogenerados en [frontend/src/lib/supabase/types.ts](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/lib/supabase/types.ts).
  - **Cliente**: Instanciado y tipado en [frontend/src/lib/supabase/client.ts](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/lib/supabase/client.ts).

---

## 6. Configuración de Despliegue en Vercel (Staging)

- **Proyecto Vercel**: `melosmile-staging` (`proyectosmuma-stacks-projects/melosmile-staging`)
- **Regla Estricta de Rama (`develop`)**:
  - Configurada la regla de compilación en Vercel:
    `[ "$VERCEL_GIT_COMMIT_REF" != "develop" ] && exit 0 || exit 1`
  - Esto garantiza que Vercel solo compilará y desplegará cuando los commits se realicen en la rama **`develop`**. Commits en otras ramas son omitidos automáticamente.
- **Variables de Entorno**: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` configuradas en Vercel para todos los entornos.
- **URL Staging Activa**: [https://melosmile-staging-7m6bblzux-proyectosmuma-stacks-projects.vercel.app](https://melosmile-staging-7m6bblzux-proyectosmuma-stacks-projects.vercel.app)
