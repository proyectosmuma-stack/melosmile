# Documentación Completa de Cambios y Optimizaciones — Melosmile

## 📌 Resumen Ejecutivo
Se ha completado una revisión exhaustiva, corrección y auditoría integral del flujo de **Ingesta de Citas, Tarifas Personalizadas por Clínica, Motor Financiero y UX de Fichas de Citas**.

---

## 1. 🤖 Ingesta Masiva y Limpieza con Agente IA ("Musly")
- **Fuente Única de Verdad (`appointments`)**: Las citas registradas en la agenda son la fuente primaria de datos para la generación contable.
- **Asignación Prioritaria de Profesional**: Se configuró la API de creación (`/api/appointments/create/route.ts`) para que toda cita creada por el agente o sin médico especificado se asigne automáticamente a la **Dra. Osly Melo** (`d7e5e2bb-a7c4-44f6-9ef8-ba453e7dc477`), profesional principal de la clínica (`[0]`).
- **Generación Secuencial de Historia Clínica (`historia_id`)**: Corregido el algoritmo para consultar el correlativo mayor en Supabase (`PAC-001`, `PAC-002`, `PAC-003`...) evitando números aleatorios.
- **Pipeline Probado y Auditado**: Se verificó la eliminación completa de datos de prueba, la ingesta del Excel mediante el agente Document Cleaner en n8n (`/api/billing/document-cleaner`), y la creación limpia de 31 citas y 32 líneas contables.

---

## 2. 💶 Tarifas Personalizadas por Sede (`treatment_clinic_prices`)
- **Acceso Server-Side sin Bloqueo RLS**: Se implementó el cliente `supabaseAdmin` en `src/lib/supabase/server.ts` con `SUPABASE_SERVICE_ROLE_KEY` en `/api/billing/sessions/generate/route.ts` para garantizar la lectura de precios específicos por clínica sin restricciones de políticas RLS.
- **Resolución Dinámica de Precios de Sede**:
  - Al generar sesiones contables (`appointments-to-lines.ts`), el sistema consulta `catalogMap` y aplica la tarifa de la sede (ej. **120€** para *Control de Ortodoncia* en *Clinica Daniel Bustamante* en lugar del precio base de **60€**).
  - Al crear citas (`/api/appointments/create/route.ts`), la API consulta `treatment_clinic_prices` e inserta la tarifa de la sede.
  - Al visualizar la ficha de la cita (`appointments/[id]/page.tsx`), la interfaz resuelve el precio de la sede incluso en citas previamente creadas con snapshots antiguos.
  - Se removieron los precios estáticos `(60 €)` del texto desplegable del catálogo de tratamientos para mantener una interfaz limpia y sin precios confusos.

---

## 3. ⚖️ Alineación del Modelo Financiero y Terminología
- **Aclaración de la Fórmula Contable (`calculator.ts`)**:
  $$\text{Comisión Bruta (Médico)} = \text{Subtotal} \times \% \text{Comisión Profesional}$$
  $$\text{Honorarios Netos (Médico)} = \text{Comisión Bruta} - \text{Laboratorio Ajustado}$$
  El porcentaje de comisión (ej. 60%) calcula los honorarios brutos del profesional, de los cuales se descuenta la porción de laboratorio para obtener los **Honorarios Netos a liquidar al Médico**.

- **Estandarización de Etiquetas y Enunciados**:
  - **Detalle de Liquidación (`/billing/[id]`)**: `% Comisión Profesional`, `Comisión Bruta Dr.`, `Honorarios Netos Dr.` y `NETO A LIQUIDAR (MÉDICO)`.
  - **Informe PDF (`/api/billing/report/[id]`)**: `Comisión Profesional: XX%`, `Comisión Dr. (XX%)` y `NETO A LIQUIDAR (MÉDICO)`.
  - **Configuración de Sedes (`/settings/clinics`)**: `% Comisión Base Dr.`.
  - **Hub de Contabilidad (`/billing`)**: `Comisión base Dr.: XX%`.
  - **Ficha de Cita (`/appointments/[id]`)**: `% COMISIÓN DRA.`.

---

## 4. 🎨 Corrección de UX en Modales de la Cita
- **Desplegables Nativa HTML en Edición de Cita**: Se reemplazaron los componentes Radix UI `<Select>` del modal *"Modificar Datos de la Cita"* por selectores `<select>` nativos de HTML estilizados.
- Esto resolvió el problema visual donde se mostraban los identificadores UUID crudos (`59d7b4f4-ed8f...` / `d7e5e2bb-a7c4...`) dentro del campo cerrado, mostrando ahora de forma inmediata y 100% confiable:
  - **Clínica / Sede**: `Clinica Daniel Bustamante`
  - **Doctor / Profesional Principal**: `Dr. Osly Melo`

---

## 💻 Archivos Clave Modificados
- [`appointments-to-lines.ts`](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/lib/billing/appointments-to-lines.ts)
- [`calculator.ts`](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/lib/billing/calculator.ts)
- [`generate/route.ts`](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/app/api/billing/sessions/generate/route.ts)
- [`appointments/create/route.ts`](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/app/api/appointments/create/route.ts)
- [`appointments/[id]/page.tsx`](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/app/(dashboard)/appointments/[id]/page.tsx)
- [`billing/[id]/page.tsx`](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/app/(dashboard)/billing/[id]/page.tsx)
- [`billing/page.tsx`](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/app/(dashboard)/billing/page.tsx)
- [`settings/clinics/page.tsx`](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/app/(dashboard)/settings/clinics/page.tsx)
- [`report/[id]/route.ts`](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/app/api/billing/report/[id]/route.ts)
- [`server.ts`](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/lib/supabase/server.ts)

---

## 5. 🏥 Planes de Tratamiento y Volcado de Históricos
- **Selección de Tipo de Tratamiento**: El modal de planes de tratamiento ahora permite seleccionar dinámicamente si el plan es de `Ortodoncia`, `Miofuncional` u `Otro`, y la cabecera verde de la ficha se actualiza automáticamente con esta información (ej. *Plan de Miofuncional Pautado*).
- **Ingesta de Históricos (Volcado)**: Se implementó el soporte manual en el formulario para registrar el histórico de `Mensualidades Ya Pagadas` y el `Monto Ya Pagado` total previo al uso de Melosmile.
- **Motor Inteligente de Cuotas**: El cálculo de cuotas completadas ahora suma transparentemente los controles registrados históricamente con los controles marcados como "Realizada" en el nuevo sistema, activando las alertas de "Revisión de Plan" al acercarse o completar el total de cuotas estipuladas.

---

## 6. 🚀 Notificaciones Permanentes, Bypass RLS y Correcciones de la Agenda
- **API Server-Side `/api/treatment-plans`**: Creado el endpoint backend con `SERVICE_ROLE_KEY` para lectura (`GET`), escritura (`POST`) y borrado (`DELETE`), resolviendo el bloqueo silencioso de Row Level Security (RLS) en Supabase para usuarios no autenticados en el navegador.
- **Eliminación de Planes de Tratamiento**: Opción de borrado añadida a la tarjeta del plan y al modal de edición.
- **Notificaciones Dinámicas Permanentes**: Sincronización en tiempo real con la campana de la cabecera mediante el evento `melosmile_notifications_updated`. Las alertas de revisión de cuotas ($\le 1$ cuota restante) permanecen visibles de forma dinámica en la campana (`Plan Activo`) y en la tarjeta del paciente.
- **Fix KPI "Citas para Hoy"**: Recuento preciso utilizando la fecha local (`YYYY-MM-DD`) y descartando citas canceladas, reflejando el número exacto de citas diarias.
- **Fix Navegación "Ver Paciente"**: Selección explícita de `id` y `historia_id` en la consulta del calendario (`calendar-view.tsx`), habilitando la redirección inmediata a `/patients/[id]` al pulsar en el modal de la cita.

