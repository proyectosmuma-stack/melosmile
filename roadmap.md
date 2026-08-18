# Roadmap de Desarrollo — Melosmile

> ⚠️ **REGLA DE RAMAS**: Este archivo pertenece exclusivamente a la rama `develop` y NUNCA debe fusionarse a la rama `main`.
> **Nota Histórica**: Las fases 1 a 10 (completadas) han sido archivadas en `docs/archive/changelog.md`.

Este documento establece el plan de desarrollo y próximas tareas activas para la plataforma **Melosmile**.

---

## 📍 Estado Actual: Rama `develop` (Entorno `melosmile-staging`)

- ✅ **Sincronización Supabase Local ← Cloud (2026-08-18):** Local es espejo exacto de Cloud. Fix de migración `is_active` (down migration descomentado), TRUNCATE + seed de cloud. FKs íntegras, Munir PAC-001 presente en ambos entornos.
- ✅ **PLAN 1 n8n (2026-08-18):** Reemplazada URL obsoleta `frontend-eight-dusky-42.vercel.app` por `melosmile-staging-git-develop-proyectosmuma-stacks-projects.vercel.app` en los 4 sub-agentes n8n (Agendamiento 12, Clínico 4, Contabilidad 2, General 4). Deploy verificado vía API n8n: 0 refs obsoletas, todos los workflows activos. Dispatcher y Document Cleaner no usaban esa URL (toolWorkflow nativo).

---

## 🚀 Fase 11: (Siguiente Fase)

- [ ] Definir los siguientes requerimientos o historias de usuario.
- [ ] Tarea 1
- [ ] Tarea 2

---

## 🔧 Pendiente (Backlog)

- [ ] Añadir soporte para que el agente pueda añadir procedimientos adicionales a una cita ya existente sin sobrescribir los procedimientos anteriores (Mejora pendiente detectada previamente).
