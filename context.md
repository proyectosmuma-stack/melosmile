# Contexto Técnico y Guía del Proyecto — Melosmile

> ⚠️ **REGLA DE RAMAS**: Este archivo de contexto y documentación pertenece exclusivamente a la rama `develop` y NUNCA debe fusionarse a la rama `main`.

---

## 📌 Visión General del Proyecto

**Melosmile** es una plataforma integral de gestión de clínicas dentales y contabilidad odontológica multiclínica. Su objetivo principal es facilitar el agendamiento inteligente, el seguimiento clínico estilo Notion, la automatización de cobranzas y facturación integrada con Odoo, respaldado por agentes de Inteligencia Artificial que operan mediante **n8n** alojado en VPS IONOS.

---

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript.
- **Hosting & CI/CD**: Vercel (`melosmile-staging`, configurado solo para compilar desde la rama `develop`).
- **Estilos y UI**: TailwindCSS 4, Shadcn UI, Lucide Icons, `@dnd-kit/core` (Drag & Drop).
- **Backend & Base de Datos**: Supabase Cloud (`amhfdzfcmpastmlsosou`, PostgreSQL relacional, CLI `supabase`).
- **Automatización e IA**: Agente **Musly** (Dispatcher + 3 Sub-agentes especializados en n8n alojado en VPS IONOS), modelo `google/gemini-2.5-flash` vía OpenRouter.
- **Integraciones externas**: Odoo API (Facturación y Contabilidad), WhatsApp/Email/SMS vía n8n.

---

## ⚙️ Reglas de Negocio Clave

1. **Gestión Multiclínica & Descuentos de Laboratorio**:
   - Cada clínica/sede (ej. Albacete, Goya, Las Rozas) posee configuraciones base de descuento de laboratorio y comisiones.
   - **Regla de Sobrescritura**: Los porcentajes de laboratorio y comisiones pueden variar según el tratamiento o gasto específico en una misma sesión. Por tanto, la vista de la cita (`/appointments/[id]`) permite ajustar estos valores individualmente.

2. **Cálculo Neto de Sesión**:
   $$\text{Neto} = \max\left(0, (\text{Precio Total} \times \% \text{Comisión Dra.}) - (\text{Gasto Lab} \times \% \text{Descuento Lab})\right)$$

3. **Sistema de Etiquetas (WordPress Style)**:
   - Permite organizar y categorizar pacientes bajo etiquetas dinámicas (*Familiar*, *Henryschein*, *Referido*, *VIP*, etc.).
   - Autocompletado AJAX/JSON en tiempo real con opción para crear nuevas etiquetas al vuelo.
   - Barra de filtros interactiva en el directorio de pacientes (`/patients`).

4. **Tratamiento y Notas Clínicas**:
   - El campo **Tratamiento** se maneja como texto libre para permitir el registro de múltiples procedimientos por sesión.
   - Cada cita posee un apartado estilo Notion para evolución clínica, anotaciones y registro fotográfico/documental.

5. **Ficha Única del Paciente**:
   - Centraliza el historial completo: citas anteriores/futuras, consentimientos firmados, archivos adjuntos, alertas médicas, etiquetas y estado financiero.

---

## 📁 Estructura del Código

```
melosmile/
├── Walkthrough.md                   # Registro de cambios y pruebas (solo develop)
├── roadmap.md                       # Estado de fases y próximos desarrollos (solo develop)
├── context.md                       # Contexto técnico para desarrolladores e IA (solo develop)
├── docs/
│   ├── odoo_integration.md          # Documentación integración Odoo ERP
│   ├── patient_records.md           # Documentación ficha e historial pacientes
│   └── tags_system.md               # Documentación técnica sistema de etiquetas
├── supabase/
│   ├── config.toml                  # Configuración Supabase CLI
│   └── migrations/
│       ├── 20260722000000_initial_schema.sql  # Migración inicial
│       ├── 20260722000001_enable_rls_policies.sql
│       ├── 20260722000002_extended_schema.sql # Esquema extendido (Multiclínica, Odoo, Docs, Reps)
│       └── 20260722000003_tags_schema.sql     # Esquema etiquetas pacientes
├── n8n-workflows/
│   └── melosmile/
│       ├── 01-melosmile-ai-conversational-agent.json
│       ├── 02-melosmile-imap-email-watcher.json
│       └── 03-melosmile-ai-dispatcher.json
└── frontend/
    ├── package.json
    ├── .env.local                   # Credenciales Supabase, Odoo, VPS, n8n
    └── src/
        ├── app/
        │   ├── api/
        │   │   └── odoo/
        │   │       ├── products/route.ts        # GET catálogo productos Odoo
        │   │       └── invoice/route.ts         # POST upsert partner + crear factura Odoo
        │   └── (dashboard)/
        │       ├── page.tsx                     # Agenda principal con Calendario Drag & Drop
        │       ├── appointments/[id]/page.tsx   # Ficha dedicada de cita (Notion-style, Odoo, Fotos)
        │       ├── patients/page.tsx            # Directorio con filtro de etiquetas y toggle Lista/Tarjetas
        │       └── patients/[id]/
        │           ├── page.tsx                 # Ficha integral del paciente (Historial, Pagos, Docs, Tags)
        │           └── edit/page.tsx            # Formulario de edición (Menores, Representantes, Odoo, Tags)
        ├── components/
        │   ├── calendar/
        │   │   ├── calendar-view.tsx            # Componente de calendario con @dnd-kit y Tooltips
        │   │   └── appointment-detail-drawer.tsx
        │   ├── patients/
        │   │   ├── patient-select.tsx           # Buscador Ajax autocompletado de pacientes
        │   │   └── tag-input.tsx                # Autocompletado AJAX/JSON de etiquetas (WordPress style)
        │   └── dashboard/
        │       └── ai-agent-bar.tsx             # Barra conversacional para el Agente IA
        └── lib/
            ├── odoo/
            │   └── client.ts                    # Cliente JSON-RPC Odoo (Autenticación, Partners, Invoices)
            └── supabase/
                ├── client.ts                    # Cliente de Supabase inicializado con tipos
                └── types.ts                     # Tipos estáticos autogenerados desde Supabase
```
