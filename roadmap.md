# Roadmap de Desarrollo — Melosmile

> ⚠️ **REGLA DE RAMAS**: Este archivo pertenece exclusivamente a la rama `develop` y NUNCA debe fusionarse a la rama `main`.

Este documento establece el plan de desarrollo, hitos alcanzados y próximas fases para la plataforma **Melosmile**.

---

## 📍 Estado Actual: Rama `develop` (Entorno `melosmile-staging`)

---

## 🎯 Fase 1: Arquitectura Base y UI/UX de Agenda (COMPLETADO)
- [x] Maquetación de la interfaz principal con Next.js App Router, TailwindCSS y Lucide Icons.
- [x] Vista de calendario semanal/diaria dividida en intervalos de 15 minutos.
- [x] Funcionalidad de Drag & Drop para mover citas de hora/día dinámicamente.
- [x] Tooltip de vista previa rápida al pasar el cursor sobre las citas (teléfono, email, ID).
- [x] Rediseño de Ficha de Cita (`/appointments/[id]`) con texto libre de tratamiento, evolución clínica estilo Notion y subida de archivos.
- [x] Creación de Ficha Histórica del Paciente (`/patients/[id]`) reuniendo citas, documentos y pagos.
- [x] Lógica de cálculos financieros con sobrescritura por cita de `% Comisión` y `% Descuento Laboratorio`.

---

## 🚀 Fase 2: Conexión con Supabase y Autenticación (COMPLETADO / EN PROGRESO)
- [x] Instalación de `@supabase/supabase-js` y creación del cliente ([src/lib/supabase/client.ts](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/lib/supabase/client.ts)).
- [x] Diseño e inicialización de la CLI de Supabase con `supabase init` y vinculación del proyecto `amhfdzfcmpastmlsosou`.
- [x] Despliegue de migraciones iniciales a Supabase Cloud con `supabase db push` ([20260722000000_initial_schema.sql](file:///Users/munircallaos/Antigravity%20Projects/melosmile/supabase/migrations/20260722000000_initial_schema.sql)).
- [x] Generación de tipos estáticos TypeScript desde Supabase Cloud ([src/lib/supabase/types.ts](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/lib/supabase/types.ts)).
- [x] Configuración de variables de entorno de producción/desarrollo (`.env.local` y Vercel).
- [ ] Conexión del buscador autocompletado de pacientes (`PatientSelect`) mediante peticiones Ajax en tiempo real a Supabase.
- [ ] Implementación de CRUD dinámico de citas y registros médicos en PostgreSQL.

---

## 🤖 Fase 3: Integración de IA y Workflows n8n (VPS IONOS)
- [x] Creación del flujo enrutador `Melosmile - AI Dispatcher` ([03-melosmile-ai-dispatcher.json](file:///Users/munircallaos/Antigravity%20Projects/melosmile/n8n-workflows/melosmile/03-melosmile-ai-dispatcher.json)).
- [ ] Importar workflows en la instancia n8n del VPS de IONOS.
- [ ] Conectar la barra de IA conversacional (`AIAgentBar`) al Webhook del Dispatcher de n8n en IONOS.
- [ ] Construcción de sub-agentes en n8n:
  - Sub-agente de Agendamiento.
  - Sub-agente de Consultas Clínicas e Historiales.
  - Sub-agente de Registro Contable.
- [ ] Pruebas de interacción en lenguaje natural desde canales como Telegram / WhatsApp.

---

## 💼 Fase 4: Integración con Odoo y Administración Avanzada (FUTURO)
- [ ] Conexión con la API REST/XML-RPC de Odoo para emisión de facturas borrador y finales.
- [ ] Gestión de pagos recurrentes y cobros parciales automatizados.
- [ ] Panel de control administrativo con reportes mensuales de facturación por sede (Albacete, Goya, Las Rozas) y comisiones de doctoras.
- [ ] Sistema de alertas automáticas para cobros pendientes.
