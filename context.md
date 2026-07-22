# Contexto Técnico y Guía del Proyecto — Melosmile

> ⚠️ **IMPORTANTE**: Este archivo de contexto y documentación solo debe residir en la rama `develop`. Nunca debe fusionarse a la rama `main`.

---

## 📌 Visión General del Proyecto

**Melosmile** es una plataforma integral de gestión de clínicas dentales y contabilidad odontológica multiclínica. Su objetivo principal es facilitar el agendamiento inteligente, el seguimiento clínico estilo Notion, la automatización de cobranzas y facturación integrada con Odoo, respaldado por agentes de Inteligencia Artificial que operan mediante **n8n**.

---

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript.
- **Estilos y UI**: TailwindCSS 4, Shadcn UI, Lucide Icons, `@dnd-kit/core` (Drag & Drop).
- **Backend & Base de Datos**: Supabase (PostgreSQL).
- **Automatización e IA**: Workflows de **n8n** (Agente Dispatcher y Sub-agentes temáticos), OpenAI GPT-4o.
- **Integraciones externas**: Odoo API (Facturación y Contabilidad), WhatsApp/Telegram.

---

## ⚙️ Reglas de Negocio Clave

1. **Gestión Multiclínica & Descuentos de Laboratorio**:
   - Cada clínica/sede (ej. Albacete, Goya, Las Rozas) posee configuraciones base de descuento de laboratorio y comisiones.
   - **Regla de Sobrescritura**: Los porcentajes de laboratorio y comisiones pueden variar según el tratamiento o gasto específico en una misma sesión. Por tanto, la vista de la cita (`/appointments/[id]`) permite ajustar estos valores individualmente.

2. **Cálculo Neto de Sesión**:
   $$\text{Neto} = \max\left(0, (\text{Precio Total} \times \% \text{Comisión Dra.}) - (\text{Gasto Lab} \times \% \text{Descuento Lab})\right)$$

3. **Tratamiento y Notas Clínicas**:
   - El campo **Tratamiento** se maneja como texto libre para permitir el registro de múltiples procedimientos por sesión.
   - Cada cita posee un apartado estilo Notion para evolución clínica, anotaciones y registro fotográfico/documental.

4. **Ficha Única del Paciente**:
   - Centraliza el historial completo: citas anteriores/futuras, consentimientos firmados, archivos adjuntos, alertas médicas y estado financiero (pagos parciales/recurrentes).

5. **Agente IA en Lenguaje Natural**:
   - La barra conversacional envía mensajes en lenguaje natural al **Dispatcher de n8n** (`03-melosmile-ai-dispatcher.json`), el cual analiza la intención (agendar, buscar datos, registrar pago, nota) y redirige a los agentes especializados.

---

## 📁 Estructura del Código

```
melosmile/
├── Walkthrough.md                   # Registro de cambios y pruebas
├── roadmap.md                       # Estado de fases y próximos desarrollos
├── context.md                       # Contexto técnico para desarrolladores e IA (solo develop)
├── supabase_schema.sql              # Esquema de tablas relacionales en Supabase
├── n8n-workflows/
│   └── melosmile/
│       ├── 01-melosmile-ai-conversational-agent.json
│       ├── 02-melosmile-imap-email-watcher.json
│       └── 03-melosmile-ai-dispatcher.json
└── frontend/
    ├── package.json
    └── src/
        ├── app/
        │   └── (dashboard)/
        │       ├── page.tsx                     # Agenda principal con Calendario Drag & Drop
        │       ├── appointments/[id]/page.tsx   # Ficha dedicada de cita (Notion-style, Odoo, Fotos)
        │       └── patients/[id]/page.tsx       # Ficha integral del paciente (Historial, Pagos, Docs)
        ├── components/
        │   ├── calendar/
        │   │   ├── calendar-view.tsx            # Componente de calendario con @dnd-kit y Tooltips
        │   │   └── appointment-detail-drawer.tsx
        │   ├── patients/
        │   │   └── patient-select.tsx           # Buscador Ajax autocompletado de pacientes
        │   └── dashboard/
        │       └── ai-agent-bar.tsx             # Barra conversacional para el Agente IA
        └── lib/
            └── supabase/
                └── client.ts                    # Cliente de Supabase inicializado
```

---

## 🚀 Guía de Inicio Rápido para Desarrolladores

1. Instalar dependencias en el frontend:
   ```bash
   cd frontend
   npm install
   ```
2. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```
3. Configurar variables de entorno local (`frontend/.env.local`):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
   ```
