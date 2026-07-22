# Roadmap de Desarrollo — Melosmile

> ⚠️ **REGLA DE RAMAS**: Este archivo pertenece exclusivamente a la rama `develop` y NUNCA debe fusionarse a la rama `main`.

Este documento establece el plan de desarrollo, hitos alcanzados y próximas fases para la plataforma **Melosmile**.

---

## 📍 Estado Actual: Rama `develop` (Entorno `melosmile-staging`)

---

## 🎯 Fase 1: Arquitectura Base y UI/UX de Agenda (COMPLETADO)
- [x] Maquetación de la interfaz principal con Next.js App Router, TailwindCSS y Lucide Icons.
- [x] Vista de calendario semanal/diaria dividida en intervalos de 15 minutos con Supabase en tiempo real.
- [x] Funcionalidad de Drag & Drop para mover citas de hora/día dinámicamente y guardar en Supabase.
- [x] Tooltip de vista previa rápida al pasar el cursor sobre las citas (teléfono, email, ID `PAC-###`).
- [x] Rediseño de Ficha de Cita (`/appointments/[id]`) con texto libre de tratamiento, evolución clínica estilo Notion y subida de archivos.
- [x] Directorio de Fichas de Pacientes (`/patients`) con selector de vista en Tarjetas / Listado, filtros y formulario completo de alta.
- [x] Ficha Histórica del Paciente (`/patients/[id]`) con historial unificado, edad calculada automáticamente y documentos estilo Notion a ancho completo.
- [x] Formulario de Edición de Paciente (`/patients/[id]/edit`) con soporte para menores de edad, representantes legales, vinculación multiclínica y datos de facturación Odoo.
- [x] **Sistema de Etiquetas estilo WordPress**:
  - [x] Tablas PostgreSQL `tags` y `patient_tags`.
  - [x] Autocompletado `TagInput` con sugerencias dinámicas y creación sobre la marcha (`+ Crear etiqueta "[query]"`).
  - [x] Barra de Filtros por Etiquetas en el directorio `/patients` y badges en las fichas del paciente.
- [x] Lógica de cálculos financieros con sobrescritura por cita de `% Comisión` y `% Descuento Laboratorio`.

---

## 🚀 Fase 2: Conexión con Supabase y Autenticación (COMPLETADO)
- [x] Instalación de `@supabase/supabase-js` y creación del cliente ([src/lib/supabase/client.ts](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/lib/supabase/client.ts)).
- [x] Diseño e inicialización de la CLI de Supabase con `supabase init` y vinculación del proyecto `amhfdzfcmpastmlsosou`.
- [x] Despliegue de migración inicial ([20260722000000_initial_schema.sql](file:///Users/munircallaos/Antigravity%20Projects/melosmile/supabase/migrations/20260722000000_initial_schema.sql)).
- [x] Creación de migración de esquema extendido ([20260722000002_extended_schema.sql](file:///Users/munircallaos/Antigravity%20Projects/melosmile/supabase/migrations/20260722000002_extended_schema.sql)).
- [x] Creación de migración de esquema de etiquetas ([20260722000003_tags_schema.sql](file:///Users/munircallaos/Antigravity%20Projects/melosmile/supabase/migrations/20260722000003_tags_schema.sql)).
- [x] Generación de tipos estáticos TypeScript desde Supabase Cloud ([src/lib/supabase/types.ts](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/lib/supabase/types.ts)).
- [x] Configuración de variables de entorno de producción/desarrollo (`.env.local` y Vercel).
- [x] Conexión del buscador autocompletado de pacientes (`PatientSelect`) mediante peticiones Ajax en tiempo real a Supabase.
- [x] Compatibilidad completa con **Next.js 16 / React 19** mediante `React.use(params)` para desempaquetar parámetros dinámicos.

---

## 🏗️ Fase 3: Módulo de Configuración — Clínicas, Profesionales y Tratamientos (COMPLETADO)
- [x] **Documentación completa**: ([docs/configuration_module.md](file:///Users/munircallaos/Antigravity%20Projects/melosmile/docs/configuration_module.md)).
- [x] **Migración BD 005**: Nuevas tablas `treatment_families` y `clinic_commission_rules`, columnas `actual_lab_cost` + `profitability_status` en `billing_records`.
- [x] **Datos Semilla**: 10 familias de tratamientos (Ortodoncia, Implantología, Endodoncia, etc.) y 50+ tratamientos con precios y costes de laboratorio típicos.
- [x] **Sidebar expandible**: Sub-menú de Configuración con 3 sub-secciones (Clínicas, Profesionales, Tratamientos).
- [x] **Página Hub de Configuración** (`/settings`): Cards de navegación a las 3 sub-secciones.
- [x] **CRUD Clínicas** (`/settings/clinics`): Alta/edición con dirección, teléfono, email, color y % comisión base. Panel de reglas de comisión por familia expandible.
- [x] **CRUD Profesionales** (`/settings/professionals`): Alta/edición de colaboradores asociados a sedes (reglas financieras centralizadas en la clínica).
- [x] **Ficha del Profesional** (`/settings/professionals/[id]`): Vista de perfil estilo Notion con métricas (citas atendidas, citas mes, pacientes distintos), historial de citas y notas internas.
- [x] **CRUD Tratamientos** (`/settings/treatments`): Catálogo agrupado por familia con búsqueda, precios y costes de laboratorio típicos.
- [x] **Modales de Confirmación Custom**: Modales React `<Dialog>` para eliminación de entidades, eliminando cierres prematuros de ventana nativa.
- [x] **Rentabilidad por Tratamiento** (`/appointments/[id]`): Campo "Gasto Lab Real (€)", cálculo de neto en tiempo real, badge de alerta 🔴 EN PÉRDIDA / 🟡 MARGEN BAJO / 🟢 Rentable.
- [x] **Fix popup modal**: Clínica y Profesional cargando nombres reales desde Supabase (no UUIDs). Estado de carga visible.
- [x] **API `/api/ai-context`**: Endpoint JSON para el agente IA con todo el catálogo, reglas de comisión y fórmulas de cálculo.

---

## 📌 Fase Futura — Historial de Precios por Proveedor de Laboratorio
> **NO implementado en este sprint.** Anotar para futura priorización.
- Tabla `lab_providers`: proveedores de laboratorio dental.
- Tabla `lab_cost_history`: historial de costes reales por tratamiento + proveedor + clínica + fecha.
- Estadísticas de rentabilidad por proveedor de laboratorio.
- Sugerencias del agente IA basadas en historial real de costes.
- Alertas automáticas cuando un proveedor supera el coste esperado del tratamiento.

---

## 💼 Fase 4: Integración con Odoo y Facturación (COMPLETADO)
- [x] Creación del cliente JSON-RPC Odoo ([src/lib/odoo/client.ts](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/lib/odoo/client.ts)).
- [x] API Route `GET /api/odoo/products` para consultar el catálogo de servicios de Odoo.
- [x] API Route `POST /api/odoo/invoice` para búsqueda/creación de contactos (`res.partner`) y generación de facturas borrador en Odoo.
- [x] Vinculación de `odoo_partner_id` y `odoo_invoice_id` con Supabase.

---

## 🤖 Fase 5: Integración de IA y Workflows n8n (VPS IONOS)
- [x] Creación del flujo enrutador `Melosmile - AI Dispatcher` ([03-melosmile-ai-dispatcher.json](file:///Users/munircallaos/Antigravity%20Projects/melosmile/n8n-workflows/melosmile/03-melosmile-ai-dispatcher.json)).
- [ ] Importar workflows en la instancia n8n del VPS de IONOS.
- [ ] Conectar la barra de IA conversacional (`AIAgentBar`) al Webhook del Dispatcher de n8n en IONOS.
- [ ] Sub-agentes en n8n (Agendamiento, Consultas Clínicas, Registro Contable).
- [ ] Pruebas de interacción en lenguaje natural desde Telegram / WhatsApp.
