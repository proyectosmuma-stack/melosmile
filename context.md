# Contexto Técnico y Guía del Proyecto — Melosmile

> ⚠️ **REGLA DE RAMAS**: Este archivo de contexto y documentación pertenece exclusivamente a la rama `develop` y NUNCA debe fusionarse a la rama `main`.

---

## 📌 Visión General del Proyecto

**Melosmile** es una plataforma integral de gestión de clínicas dentales y contabilidad odontológica multiclínica. Su objetivo principal es facilitar el agendamiento inteligente, el seguimiento clínico estilo Notion, la automatización de cobranzas, la facturación contable por clínica/mes basada en el modelo de referencia **ALBACETE DEFINITIVO** y la facturación integrada con Odoo ERP, respaldado por agentes de Inteligencia Artificial que operan mediante **n8n** alojado en VPS IONOS.

---

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, `xlsx` (parsing nativo de archivos Excel).
- **Hosting & CI/CD**: Vercel (`melosmile-staging`, configurado solo para compilar desde la rama `develop`).
- **Estilos y UI**: TailwindCSS 4, Shadcn UI, Lucide Icons, `@dnd-kit/core` (Drag & Drop).
- **Backend & Base de Datos**: Supabase Cloud (`amhfdzfcmpastmlsosou`, PostgreSQL relacional, CLI `supabase`, tabla `agent_learnings` para memoria dinámica).
- **Módulo Contable & Calculadora**: Motor `calculator.ts` con sugerencia inteligente de aparatología/laboratorio (`TREATMENT_LAB_SUGGESTIONS`), validaciones en 4 niveles (ERROR, ALERTA, NEGATIVO, INFO), 19 columnas de registro contable ALBACETE, auto-creación secuencial de pacientes (`PAC-001`, `PAC-002`...), vinculación de citas con asignación obligatoria a la **Dra. Osly Melo**, emparejamiento con el catálogo de tratamientos de la BD (`Pulpotomía`, `Control de Ortodoncia`, `Obturación Simple`, `Ortodoncia Invisible`), dropdowns interactivos para Pacientes, Tratamientos y Equipos de Laboratorio, cálculo automático de costes de laboratorio, columnas de porcentaje/monto médico (`% Dr.`, `€ Dr.`), tabla a ancho completo de pantalla y accesos directos a las fichas clínicas del paciente.
- **Automatización e IA**: Agente **Musly** (Dispatcher + 4 Sub-agentes especializados en n8n: Agendamiento, Clínico, Facturación y General/FAQs + Extractor Contable Multimodal 08 y Flujo de Aprobación 09), modelo `google/gemini-2.5-flash` vía OpenRouter con `temperature: 0` determinista, `retryOnFail` en herramientas HTTP, filtro de tokens estáticos en UI y n8n, memoria de sesión multiturno con reescritura contextual de peticiones anafóricas, desambiguación estricta de identidad de paciente y sistema de Aprendizaje Dinámico Autónomo (`/api/ai/memory/search` y `/api/ai/memory/learn`).
- **Integraciones externas**: Odoo API (Facturación y Contabilidad), WhatsApp/Email/SMS vía n8n.

---

## ⚙️ Reglas de Negocio Clave

1. **Gestión Multiclínica & Descuentos de Laboratorio**:
   - Cada clínica/sede (ej. Albacete, Goya, Las Rozas, Clínica Daniel Bustamante) posee configuraciones base de descuento de laboratorio y comisiones.
   - **Regla de Sobrescritura**: Los porcentajes de laboratorio y comisiones pueden variar según el tratamiento o gasto específico en una misma sesión. Por tanto, la vista de la cita (`/appointments/[id]`) y de contabilidad (`/billing/[id]`) permiten ajustar estos valores individualmente.

2. **Cálculo Neto de Sesión**:
   $$\text{Subtotal} = \max(\text{Precio}, \text{Otro Precio}) \times \text{Cant} - \text{Descuento}$$
   $$\text{Comisión} = \text{Subtotal} \times \% \text{Comisión Clínica}$$
   $$\text{Gasto Lab Dto} = \text{Cant Lab} \times \text{Coste Lab} \times (1 - \% \text{Dto Lab})$$
   $$\text{Neto} = \text{Comisión} - \text{Gasto Lab Dto}$$
   $$\text{Honorarios Médico} = \text{Neto} \times \% \text{Dr. Principal}$$

3. **Módulo de Cálculo y Facturación Contable (Modelo ALBACETE)**:
   - **Organización**: Por `(clinic_id, year, month)` único. Cada sesión contable pertenece a una clínica y un mes/año específicos.
   - **Auto-Vinculación & Alta Secuencial de Pacientes (`PAC-XXX`)**: Para cada línea extraída, el sistema busca al paciente en `patients`. Si no existe, **lo crea automáticamente** asignando un `historia_id` secuencial con formato Melosmile (`PAC-001`, `PAC-002`, `PAC-003`...).
   - **Dropdowns Interactivos con Catálogo de la BD**:
     - *Paciente*: Selección desde la base de datos o creación secuencial con enlace directo a la ficha del paciente.
     - *Tratamiento*: Select interactivo con todo el catálogo de tratamientos de la BD que auto-rellena el precio oficial al seleccionar.
     - *Equipo / Trabajo de Laboratorio*: Select interactivo filtrado por aparatología y tratamientos con coste de laboratorio.
   - **Sugerencia Inteligente de Aparatología y Células Resaltadas (`is_lab_suggested`)**: El sistema analiza el tratamiento principal y sugiere automáticamente el trabajo de laboratorio y su coste típico (ej. `Ortodoncia Invisible` → `Alineadores Transparentes (Set Completo)` [700€], `Ortodoncia Brackets` → `Set de Brackets y Arcos Metálicos` [350€]). Las celdas sugeridas se destacan visualmente con un fondo amarillo/ámbar y la etiqueta `💡 Sugerido`.
   - **Asignación de Profesional Tratante por Defecto**: Todas las citas generadas o vinculadas se asignan obligatoriamente a la **Dra. Osly Melo** (`d7e5e2bb-a7c4-44f6-9ef8-ba453e7dc477`).
   - **Desglose de Porcentajes y Totales en el Footer**: El pie de página pegajoso muestra el desglose completo en porcentaje y montos monetarios: Total Subtotal (100%), Comisión Clínica (60%), Gastos de Laboratorio (% Dto), Honorarios Médico y Neto Total del Mes.
   - **Acceso Directo a Ficha Clínica**: En la tabla contable (`/billing/[id]`), cada nombre de paciente incluye un botón con icono que abre su ficha clínica histórica en `/patients/[id]`.
   - **Sincronización de Citas e Historial Clínico**: Registra/vincula automáticamente las visitas en `appointments` (`status: 'Realizada'`, guardando el `treatment_id` e intervenciones en `notes`).
   - **Diseño a Ancho Completo (Full-Bleed Viewport)**: El área de trabajo `/billing/[id]` utiliza todo el ancho horizontal disponible de la pantalla para máxima legibilidad de las columnas contables.
   - **Visualización en 3 Pestañas**:
     - *Tabla Detallada*: Registro cronológico con dropdowns e inputs inline.
     - *Resumen de Servicios*: Agregado por tratamiento clínico y proveedor de laboratorio (hoja "Resumen" del Excel).
     - *Pivot por Paciente*: Totales acumulados por paciente (hoja "Pivot" del Excel).
   - **Motor de Validaciones en 4 Niveles**:
     - 🔴 `ERROR`: Paciente `#N/A` o sin precio asignado (bloquea la aprobación).
     - 🟡 `ALERTA`: Desviación de precio >20% respecto al catálogo o tratamiento no encontrado.
     - 🔴 `NEGATIVO`: NETO negativo (gastos de lab superan comisión).
     - 🔵 `INFO`: Cantidad 0 (seguimiento) o notas destacadas ("FINALIZA CUOTA", "A SU FAVOR").

---

## 📁 Estructura del Código

```
melosmile/
├── Walkthrough.md                   # Registro de cambios y pruebas maestro (solo develop)
├── roadmap.md                       # Estado de fases y próximos desarrollos (solo develop)
├── datos-prueba/
│   └── datos prueba.xlsx            # Archivo Excel de prueba (Mayo 2026, Clínica Daniel Bustamante)
├── frontend/
    └── src/
        ├── app/
        │   ├── api/
        │   │   ├── billing/
        │   │   │   ├── sessions/route.ts        # GET/POST Sesiones contables por clínica/mes
        │   │   │   ├── sessions/[id]/route.ts   # GET/PATCH/DELETE Detalle, edición inline y recálculo
        │   │   │   ├── sessions/[id]/approve/route.ts # POST Aprobación contable con validación de errores
        │   │   │   ├── extract/route.ts         # POST Extracción IA y Excel con auto-alta secuencial (PAC-00X), asignación Dra. Osly Melo, treatment_id en appointments y sugerencia de lab
        │   │   │   └── report/[id]/route.ts     # GET Informe HTML imprimible/PDF en 6 secciones ALBACETE
        │   └── (dashboard)/
        │       ├── appointments/[id]/page.tsx   # Ficha de Cita con soporte para procedimientos en JSON y cadenas de texto
        │       └── billing/
        │           ├── page.tsx                 # Hub Contable: Grid multiclínica × 12 meses y KPIs
        │           ├── new/page.tsx             # Formulario de alta y extracción multimodal (IA y Excel)
        │           └── [id]/page.tsx            # Editor workspace a ancho completo con dropdowns para Paciente, Tratamiento, Equipo Lab (sugerencias destacadas), columnas % Dr y desglose total
        └── lib/
            └── billing/
                └── calculator.ts                # Motor de cálculo financiero, TREATMENT_LAB_SUGGESTIONS y razonamiento del catálogo de tratamientos de la BD
```
