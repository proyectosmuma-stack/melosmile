# 🏥 MeloSmile — Sistema de Gestión Clínica y Agenda Inteligente

> Plataforma de agendamiento médico, ficha clínica interactiva, facturación odontológica y conciliación contable integrada con Odoo ERP y respaldada por el asistente de IA **Musly**.

---

## ⚡ Arquitectura del Proyecto

```
melosmile/ (AGENDA-melosmile)
├── 🚀 src/                    # Aplicación Next.js 16 (React 19, Tailwind v4, shadcn)
│   ├── app/                   # App Router: (dashboard), confirmar, c, login, api
│   ├── components/            # UI Components (Calendario, Odontograma, Modales)
│   ├── context/               # Contextos (ClinicContext)
│   ├── lib/                   # Clientes Supabase, Odoo ERP, WhatsApp Evolution
│   └── types/                 # Tipos TypeScript y contratos
├── 🗄️ supabase/               # Base de datos Supabase (PostgreSQL, 42 migraciones, seeds)
├── ⚡ n8n/                    # Workflows del asistente IA Musly y subagentes
├── 🛠️ scripts/                # Scripts operativos clasificados por área
│   ├── db/                    # Sincronización, seeds y limpieza de base de datos
│   ├── n8n/                   # Herramientas de respaldo y repunteo de flujos n8n
│   ├── odoo/                  # Pruebas y sincronización con Odoo ERP
│   ├── auth/                  # Vinculación MTProto de Telegram
│   ├── reports/               # Sincronización de reportes de errores de agentes
│   └── testing/               # Suites de pruebas automáticas (Musly Doctor Test)
├── 📊 data/                   # Datos clínicos históricos y de migración
│   ├── excel/                 # Libros contables y de citas (Albacete, Goya, Rozas)
│   └── samples/               # Fotos de prueba y capturas clínicas
├── 📚 docs/                   # Documentación técnica completa (ver docs/README.md)
└── 📋 logs/                   # Historial centralizado de reportes de IA
```

> 🌐 **¿Buscas la Página Web Comercial?**  
> La web corporativa de MeloSmile (`melosmile.com`) es un proyecto independiente desarrollado en WordPress CMS, ubicado en [`../WEB-melosmile`](file:///Users/munircallaos/Antigravity%20Projects/WEB-melosmile).

---

## 🚀 Inicio Rápido en Local

### 1. Requisitos Previos
- Node.js `>= 20.x`
- Docker / Colima activo (para Supabase Local)
- Supabase CLI instalado (`supabase --version`)

### 2. Puesta en Marcha
```bash
# Arranca Supabase Local y el servidor Next.js en http://localhost:3028
npm run dev
```

### 3. Scripts Principales
```bash
# Sincronizar datos de Supabase Cloud a Local
npm run db:sync

# Consultar reportes de Musly pendientes
npm run reports

# Sincronizar log de reportes local con Supabase Cloud
npm run reports:sync

# Compilar para producción
npm run build
```

---

## 📖 Documentación Completa
Consulta el mapa de navegación detallado en **[docs/README.md](file:///Users/munircallaos/Antigravity Projects/melosmile/docs/README.md)**.
- **Contexto y Entornos**: [context.md](file:///Users/munircallaos/Antigravity Projects/melosmile/context.md)
- **Roadmap Activo**: [roadmap.md](file:///Users/munircallaos/Antigravity Projects/melosmile/roadmap.md)
- **Bitácora de Sesiones**: [Walkthrough.md](file:///Users/munircallaos/Antigravity Projects/melosmile/Walkthrough.md)
- **Reglas de Agentes IA**: [AGENTS.md](file:///Users/munircallaos/Antigravity Projects/melosmile/AGENTS.md)

