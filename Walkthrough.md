# Walkthrough Maestro — Melosmile

Este documento es el **Walkthrough Maestro del Proyecto**, donde se acumula la trazabilidad histórica de todas las versiones, componentes desarrollados, refactorizaciones y avances del sistema Melosmile.

---

## 🏛️ Estado Global de la Arquitectura

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript.
- **Estilos**: TailwindCSS v4 + Lucide Icons + Shadcn UI.
- **Backend & Base de Datos**: Supabase PostgreSQL + RLS + Triggers PL/pgSQL.
- **Integraciones Externas**:
  - **Odoo ERP**: Conexión JSON-RPC nativa para sincronización de contactos y facturación agrupada (`account.move`).
  - **VPS Storage**: Almacenamiento físico en servidor VPS (`/opt/melosmile/pacientes/{id}/...`) discriminando fotos clínicas (sin vectorizar) de documentos PDF.
  - **n8n Automation Engine**: 11 flujos activos — 6 flujos operativos previos + 1 Dispatcher IA + 4 Sub-Agentes especializados + 2 Flujos Contables.
  - **OpenRouter**: Modelo `google/gemini-2.5-flash` para todos los agentes IA conversacionales.

---

## 📅 Historial de Entregas & Sesiones

### Sesión Actual: Módulo Contable — Dropdowns del Catálogo BD, Sugerencia Inteligente de Aparatología, Gastos de Lab y Ficha de Cita

#### Fecha: 2026-07-27

#### 1. Corrección en Ficha de Cita (`/appointments/[id]`)
- **Visualización de Tratamiento**: Se corrigió el parser de notas en `appointments/[id]/page.tsx`. Anteriormente, cuando `[Procedimientos: ["Control de Ortodoncia"]]` contenía un array de cadenas de texto, `setProcedures` guardaba cadenas en lugar de objetos `ProcedureItem`, provocando que el dropdown apareciera vacío (`-- Seleccionar del catálogo --`).
- **Persistencia de `treatment_id`**: Se actualizó `extract/route.ts` para guardar explícitamente el `treatment_id` en la tabla `appointments` al crear citas desde la contabilidad.

#### 2. Mantenimiento y Dropdowns Interactivos en Tabla Contable (`/billing/[id]`)
- **Dropdown de Tratamiento del Catálogo**: Reemplazado el input de texto por un `<select>` que carga todos los tratamientos de la base de datos Supabase, ordenados alfabéticamente y mostrando su precio oficial.
- **Dropdown de Pacientes**: Selector interactivo vinculado a la tabla `patients` de Supabase, manteniendo el acceso directo a la ficha del paciente (`/patients/[id]`).
- **Dropdown de Equipo / Trabajo de Laboratorio**: Selector de aparatología y trabajos de laboratorio cargado desde el catálogo de la BD.

#### 3. Sugerencia Inteligente de Aparatología y Gastos de Laboratorio
- **Sugerencia Automática (`TREATMENT_LAB_SUGGESTIONS`)**: Implementado un mapa de sugerencias en `calculator.ts` que relaciona tratamientos con sus trabajos de laboratorio típicos (ej: `Ortodoncia Invisible` → `Alineadores Transparentes (Set Completo)` [700€], `Ortodoncia Brackets` → `Set de Brackets y Arcos Metálicos` [350€]).
- **Resaltado Visual (`is_lab_suggested`)**: Las celdas de laboratorio pre-rellenadas automáticamente por el sistema se muestran destacadas con fondo amarillo/ámbar y la insignia `💡 Sugerido`.
- **Cálculo Automático de Gastos de Lab**: La sesión actual calculó automáticamente **1.225,00 €** de gastos de laboratorio para los tratamientos de Ortodoncia Invisible y Brackets Metálicos.

#### 4. Columnas de Médico y Desglose Completo en el Pie de Página
- **Columnas `% Dr` y `€ Dr`**: Añadidas a la tabla detallada para visualizar y ajustar el porcentaje y monto del profesional tratante en cada línea.
- **Sticky Footer con Desglose en Porcentajes**: Muestra de forma transparente el desglose global:
  - `TOTAL SUBTOTAL`: **8.281,20 €** (100%)
  - `COMISIÓN CLÍNICA (60%)`: **4.968,72 €**
  - `GASTOS LAB (50% Dto)`: **1.225,00 €**
  - `HONORARIOS MÉDICO`: **3.743,72 €**
  - `NETO TOTAL MES`: **3.743,72 €**

#### 5. Resultados de Ejecución Ground Truth en Supabase (Sesión `9f651e80-cbd8-44e7-8849-cf05e6d337e6`)
- **Sede**: `Clinica Daniel Bustamante` (Mayo 2026).
- **Pacientes Creados en DB**: **25 pacientes** (`PAC-006` a `PAC-030`).
- **Citas Vinculadas con `treatment_id`**: **29 citas**, 100% asignadas a **`Osly Melo`**.
- **Gastos de Lab Auto-Calculados**: **1.225,00 €**
- **Errores Bloqueantes**: **0 errores**
- **Build Check**: `npm run build` → **0 errores de TypeScript**

---

## ✅ Verificación de Entorno

- **TypeScript**: `npm run build` → **0 errores** ✅
- **Compilación de Producción Next.js**: Exit code 0 (Generadas 32 páginas estáticas/dinámicas) ✅
- **Base de Datos Supabase**: Citas guardando `treatment_id` y líneas contables con sugerencia inteligente de laboratorio.
