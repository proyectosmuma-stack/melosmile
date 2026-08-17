
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

---

## 📅 Novedades: Planes de Tratamiento, Notificaciones Permanentes y Correcciones de Agenda
Se ha ampliado la plataforma con las siguientes capacidades y mejoras:
- **API Backend de Planes de Tratamiento (`/api/treatment-plans`)**: Solucionado el bloqueo de Row Level Security (RLS) en la tabla `treatment_plans` sustituyendo las consultas directas del navegador por un endpoint server-side con `SERVICE_ROLE_KEY` para lectura (`GET`), guardado/edición (`POST`) y eliminación (`DELETE`).
- **Eliminar Planes de Tratamiento**: Opción de borrado disponible tanto desde la tarjeta del plan como dentro del modal de edición de la ficha del paciente.
- **Sincronización en Tiempo Real de la Campana de Notificaciones**: Las alertas de revisión de cuotas ($\le 1$ cuota pendiente) se emiten dinámicamente mediante el evento `melosmile_notifications_updated`, reflejándose de forma permanente en la campana de la cabecera y en el banner de la ficha mientras el plan se mantenga `activo`.
- **Limpieza de Notificaciones de Demostración**: Eliminación del dato ficticio pre-configurado en el centro de notificaciones (`Ingesta Completada...`).
- **Seguimiento Híbrido y Multi-Plan Activo**: Soporte para planes independientes de Ortodoncia y Miofuncional en un mismo paciente, contabilizando citas no canceladas + cuotas pagadas manualmente.
- **Fix KPI "Citas para Hoy" en Agenda**: Corrección del cálculo de la fecha local (`YYYY-MM-DD`) y exclusión de citas canceladas en la pantalla principal (`/`), mostrando la cifra real (2 citas) en lugar de recuentos erróneos de 31.
- **Fix Enlace "Ver Paciente" en Drawer del Calendario**: Inclusión explícita de `id` y `historia_id` en las consultas de `calendar-view.tsx` y resolución de rutas en `appointment-detail-drawer.tsx`, habilitando la navegación directa a la ficha clínica del paciente.
- **Auditoría Completa de Producción & Seguridad**:
  - Eliminadas todas las credenciales hardcodeadas (JWTs fallback de Supabase) en las API routes.
  - Credenciales de inicio de sesión migradas a `process.env.AUTH_USERNAME` y `process.env.AUTH_PASSWORD`.
  - Reemplazadas llamadas internas estáticas `http://localhost:3028` en `document-cleaner` y `logout` por `INTERNAL_BASE_URL` dinámico compatible con Vercel serverless.
  - Corregido bug de hoisting de `toTitleCase` en `create/route.ts`.
  - Servidores server-side actualizados a `supabaseAdmin` para evitar bloqueos RLS.
  - Build de Next.js verificado y compilado al 100% sin errores de TypeScript.
- **Configuración de OpenCode a 22K Tokens & Habilitación de MCPs**:
  - Fijado el presupuesto de contexto a **22.528 Tokens (22K)** en Ollama y `~/.config/opencode/opencode.jsonc` para eliminar cuellos de botella y congelamientos.
  - Corregida la activación de herramientas (`"tools": true`) y la clave de límite de salida (`"output": 4096`) para `deepseek-coder-v2:lite`, `qwen2.5-coder:14b`, `gemma4:latest` y `gemma2:27b`.
  - Enlazados los 4 servidores MCP en OpenCode (`supabase`, `n8n`, `notion`, `github`).
  - Creada suite de benchmarking y el manual oficial global de equipos `MANUAL_EQUIPOS_OPENCODE.md` para probar los agentes Mumabot y SecBot en OpenCode IDE.


---

## 10. ⚡ Optimización Backend y Limpieza de Deuda Técnica
- **Centralización de Utils**: Creación de `lib/utils/date-parser.ts` y `lib/utils/patient-id.ts` para agrupar funciones redundantes presentes en `appointments`, `patients` y `billing`.
- **Generación de ID Robusta (PAC-XXX)**: Cambio del escaneo masivo de filas en JS por una consulta eficiente `.order("id", { ascending: false }).limit(1)` en base de datos.
- **Transacciones Atómicas de Facturación**: Implementado `.upsert()` con restricción de conflicto compuesta (`session_id, appointment_id, procedure_index`) al sobreescribir sesiones contables, asegurando 0% riesgo de pérdida de datos.
- **Búsqueda Filtrada Nativa (Appointments)**: El buscador de citas por nombre de paciente ahora delega la carga computacional a Supabase usando `.or()` con `.ilike()`, mejorando drásticamente el rendimiento del API al no traer todas las citas del día para filtrarlas post-fetch.
- **Retroalimentación del Agente**: Se documentaron los principios arquitectónicos adquiridos sobre atomicidad y filtros Supabase directamente en `agent_learnings` (memoria vectorial del agente).
