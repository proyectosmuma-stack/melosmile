# 📚 MeloSmile Agenda — Mapa Maestro de Documentación (SSOT)

Bienvenido a la documentación técnica y funcional de **MeloSmile Agenda** (`agenda.melosmile.com`). Este índice sirve como Fuente Única de Verdad (SSOT) tanto para desarrolladores humanos como para agentes y modelos de Inteligencia Artificial.

---

## 🗺️ Mapa de Navegación Rápida

```
docs/
├── README.md                  # Este índice maestro
├── architecture/              # Arquitectura técnica, diseño y auditorías
│   ├── design-system.md       # Sistema de diseño, paleta y componentes UI
│   └── audit-report.md        # Auditoría técnica de rendimiento y seguridad
├── modules/                   # Especificaciones de los módulos funcionales
│   ├── appointments_module.md # Agendamiento de citas, calendario y slots
│   ├── patient_records.md     # Ficha clínica de paciente estilo Notion y anamnesis
│   ├── odoo_integration.md    # Facturación, catálogo y conciliación con Odoo ERP
│   ├── configuration_module.md# Ajustes de clínicas, doctores, tratamientos y comisiones
│   └── tags_system.md         # Sistema de etiquetas para clasificación de pacientes
├── ai/                        # Inteligencia Artificial y Agentes
│   ├── ia_multi_agent.md      # Arquitectura de Musly (Dispatcher + 4 subagentes en n8n)
│   └── protocolo_revision_reportes_ia.md # Procedimiento de resolución de fallos
├── archive/                   # Análisis técnicos antiguos y documentos históricos
└── knowledge-base/            # Registros históricos de decisiones arquitectónicas
```

---

## 📌 Documentos Clave de la Raíz (Trinidad Documental)
- **[context.md](file:///Users/munircallaos/Antigravity Projects/melosmile/context.md)**: Visión global de la plataforma, credenciales por entorno (Local, Staging, Producción), puertos y arquitectura de 3 capas.
- **[roadmap.md](file:///Users/munircallaos/Antigravity Projects/melosmile/roadmap.md)**: Hitos alcanzados, estado actual de ramas y tareas planificadas.
- **[Walkthrough.md](file:///Users/munircallaos/Antigravity Projects/melosmile/Walkthrough.md)**: Bitácora cronológica de sesiones de trabajo, soluciones a bugs y lecciones aprendidas.
- **[AGENTS.md](file:///Users/munircallaos/Antigravity Projects/melosmile/AGENTS.md)**: Constitución obligatoria de agentes IA (MumaBot, Karpathy, reglas de clínica de Albacete/Goya, Musly).
- **[CLAUDE.md](file:///Users/munircallaos/Antigravity Projects/melosmile/CLAUDE.md)**: Guía operativa específica para modelos Claude.

---

## 🛠️ Comandos Rápidos del Proyecto
| Comando | Propósito |
|---|---|
| `npm run dev` | Arranca el entorno de desarrollo local en `http://localhost:3028` junto con Supabase Local. |
| `npm run build` | Compila el proyecto Next.js 16 para producción. |
| `npm run db:sync` | Sincroniza y respalda Supabase Cloud hacia la base de datos local (PostgreSQL en Colima). |
| `npm run reports` | Consulta los reportes de errores de Musly pendientes en Supabase Cloud. |
| `npm run reports:sync` | Sincroniza y regenera el log de auditoría local (`logs/agent_reports.log`). |
| `npm run clean:cloud` | Limpia los datos de prueba en la nube dejando intacta la ficha `PAC-001`. |
| `npm run unify:appointments` | Unifica citas duplicadas en el mismo horario según las reglas de clínica. |
| `npm run telegram:auth` | Inicia el protocolo de vinculación MTProto de Telegram por código/QR. |

