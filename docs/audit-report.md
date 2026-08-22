# Auditoría de Migración de Estilos — Melosmile Frontend

**Fecha:** 2026-08-18
**Alcance:** Migración de clases de color hardcodeadas (slate/rose/emerald/blue...) a tokens de tema CSS en Next.js 16 + Tailwind v4 + shadcn/ui.
**Referencias:** `docs/design-system.md` (especificación), `frontend/src/app/globals.css` (tokens).
**Método:** análisis estático con grep, revisión manual de contexto y build de producción.

---

## 1. Resumen ejecutivo

La migración a tokens de tema está **completa y correcta**. Las 3 observaciones menores detectadas en la primera pasada (O1: estados del agente, O2: blob decorativo del login, O3: tokens semánticos en `.dark`) fueron **resueltas y verificadas**. El build de producción compila sin errores. No se detectaron fugas de credenciales.

**Veredicto: APROBADO**

---

## 2. Estado por archivo auditado

| Archivo | Hardcodeadas | Excepción justificada | Detalle |
|---|---|---|---|
| `components/layout/sidebar.tsx` | 7 | ✅ Sí | `COLOR_PALETTE` + dot de "Todas las Clínicas": presets de datos de clínicas (`design-system.md:184`) |
| `app/(dashboard)/layout.tsx` | 5 | ✅ Sí | Gradiente marca IA Musly (`from-violet-600 to-indigo-600`, `shadow-indigo-500/20`) |
| `app/(dashboard)/page.tsx` | 0 | — | 100% tokenizado |
| `components/calendar/calendar-view.tsx` | 14 | ✅ Sí | Mapas `bg/border-*` de tipos de cita (violet/rose/emerald/blue/amber-600): presets de datos |
| `components/calendar/appointment-detail-drawer.tsx` | 0 | — | 100% tokenizado |
| `components/dashboard/ai-agent-bar.tsx` | 35 | ✅ Sí | Solo marca IA Musly (violet/indigo); estados de agente ahora usan tokens semánticos/destructive/muted (O1 resuelta) |
| `components/layout/notification-center.tsx` | 0 | — | 100% tokenizado |
| `components/ui/dialog.tsx` | 0 | — | 100% tokenizado |
| `app/(dashboard)/billing/page.tsx` | 0 | — | 100% tokenizado |
| `app/(dashboard)/patients/page.tsx` | 0 | — | 100% tokenizado |
| `app/login/page.tsx` | 0 | — | 100% tokenizado (O2 resuelta: blob → `bg-(--brand-ai-to)/20`) |
| **TOTAL** | **61** | | Todas justificadas (marca Musly + presets de datos) |

---

## 3. Verificación de tokens en `globals.css`

| Token | :root | .dark | Estado |
|---|---|---|---|
| `--primary` (346.8 77.2% 49.8% → rosa) | ✅ L14 | ✅ L67 | Correcto |
| `--sidebar` | ✅ L36 | ✅ L86 | Correcto |
| `--sidebar-foreground` | ✅ L37 | ✅ L87 | Correcto |
| `--sidebar-border` | ✅ L38 | ✅ L88 | Correcto |
| `--sidebar-accent` | ✅ L39 | ✅ L89 | Correcto |
| `--sidebar-muted-foreground` | ✅ L42 | ✅ L92 | Correcto |
| `--success` | ✅ L45 | ✅ redefinido (O3) | Correcto |
| `--warning` | ✅ L47 | ✅ redefinido (O3) | Correcto |
| `--info` | ✅ L49 | ✅ redefinido (O3) | Correcto |
| `--brand-ai-from` (262 83% 58%) | ✅ L53 | — | Correcto |
| `--brand-ai-to` (243 75% 59%) | ✅ L54 | — | Correcto |
| Bloque `.dark` | — | ✅ L57 | Presente |

Los tokens semánticos comparten valores entre temas, por lo que no redefinirlos en `.dark` no es un defecto funcional.

---

## 4. Clasificación de clases restantes

**Excepciones documentadas (61 usos) — todas justificadas:**
- **Marca IA Musly (40):** gradientes `from-violet-600 to-indigo-600`, `text-violet-400`, `shadow-indigo-500/20`, `bg-violet-500/15`, etc. — `design-system.md:153`.
- **Presets de datos clínicas (7):** `sidebar.tsx` `COLOR_PALETTE` (rose/blue/purple/emerald/amber/cyan-500).
- **Presets de tipos de cita (14):** `calendar-view.tsx` mapas `bg/border-{violet,rose,emerald,blue,amber}-600` — `design-system.md:184`.

**Observaciones (3) — todas RESUELTAS:**
- **O1 (5):** estados de agente en `ai-agent-bar.tsx` → migrados a `text-sidebar-muted-foreground`, `text-destructive`, `bg-destructive/10`, `bg-sidebar-muted/10`. ✅
- **O2 (1):** blob decorativo `bg-indigo-600/20` en `login/page.tsx` → `bg-(--brand-ai-to)/20`. ✅
- **O3 (3):** tokens `--success/--warning/--info` añadidos al bloque `.dark` en `globals.css`. ✅

---

## 5. Fuga de credenciales

Se escanearon los 11 archivos migrados por patrones `sk-`, `service_role`, `SUPABASE_*`, `Bearer <token>`, `api_key`. **Resultado: sin fugas.**

---

## 6. Resultado del build

```
npx next build 2>&1 | tail -15
├ ○ /patients
├ ƒ /patients/[id]
├ ƒ /patients/[id]/edit
├ ○ /settings
├ ○ /settings/clinics
├ ○ /settings/professionals
├ ƒ /settings/professionals/[id]
└ ○ /settings/treatments
ƒ Proxy (Middleware)
○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

**Compila OK** — genera el mapa de rutas completo sin errores de compilación ni de tipos.

---

## 7. Veredicto

# ✅ APROBADO

La migración cumple la especificación `design-system.md`. Todos los componentes de UI están tokenizados y las clases residuales son excepciones documentadas (marca Musly y presets de datos). Las 3 observaciones menores fueron resueltas y verificadas con build exitoso. Sin fugas de credenciales.

---

## 8. Observaciones

Las 3 observaciones de la primera pasada (O1 estados del agente, O2 blob del login, O3 tokens en `.dark`) fueron **resueltas** en la segunda pasada y verificadas con `npx next build` correcto. No quedan observaciones pendientes.
---

# Auditoría Sesión 2026-08-22 — Fix canal reminders + reset BD

**Fecha:** 2026-08-22
**Alcance:** fix de canal en API reminders, migración enum `whatsapp`, limpieza de seed, docs KB.
**Método:** auditoría del reviewer local intentada (2 delegaciones fallidas: resultado truncado / respuesta alucinada sin ejecutar) → completada manualmente por el orquestador con verificación mecánica (precedente decisión #12).

## Veredictos por archivo

| Archivo | Cambio | Veredicto |
|---|---|---|
| `frontend/src/app/api/reminders/create/route.ts` | default `whatsapp`→`email` + `newReminder.channel` en descripción | **PASS** — tsc sin errores nuevos; eslint solo `any` pre-existentes; lógica coherente |
| `supabase/migrations/20260822000000_add_whatsapp_to_reminder_channel.sql` | NUEVO | **PASS** — contiene solo `ALTER TYPE ... ADD VALUE IF NOT EXISTS 'whatsapp'` |
| `supabase/migrations/20260722000005_treatments_and_clinic_rules.sql` | seeds §7-§10 eliminados | **PASS** — DDL puro (85 líneas), 0 INSERTs, conserva tablas/ALTERs/RLS |
| `supabase/seed.sql` | filas de prueba eliminadas | **PASS** — 0 ids de prueba (cf8006ac/bb5bac4c/7c053a9f); maestros íntegros (4 clínicas, Munir cff20455 presente) |
| Docs (log.md, agent-team.md, ESTADO_PROYECTO.md) | actualizados | **PASS** — coherentes entre sí, fecha 2026-08-22 |

## Checklist de seguridad

- [x] Sin API keys/tokens/passwords en archivos tocados (patrones eyJ/sk-/service_role/access_token: LIMPIO)
- [x] Sin rutas absolutas `/Users/` en código fuente (LIMPIO)
- [x] `.env.local` intacto (timestamp original 29-jul; el fallo del coder-local no tocó nada real)
- [x] Verificación funcional post-reset (coder-cloud): enum = email|telegram|web|sms|whatsapp; conteos 4/4/53/10/10; PAC-001 activo; 0 FKs rotas

## Incidencias del equipo durante la sesión (registradas en KB)

1. Proxy Ollama 11435 caído → puente TCP restaurado a 11434.
2. Reviewer (llama3.1:8b): resultado truncado sin veredicto → auditoría completada manualmente.
3. Coder-local (llama3.1:8b): respondió una tarea no solicitada (.env) sin tocar archivos reales → push a cloud NO realizado.

## Conclusión global: PASS (local) — PENDIENTE aplicar migración enum en CLOUD (requiere auth CLI o dashboard)

**Veredicto global: APROBADO** para los cambios locales. Acción pendiente escalada al humano: aplicar la migración del enum en Supabase cloud (dashboard SQL Editor o `supabase login` + `supabase db push`).
