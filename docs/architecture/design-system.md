# Design System — Melosmile UI

> Especificación de tokens para unificar los estilos del frontend. Migración a **tema shadcn completo** manteniendo la identidad **dark sidebar + light content** con acento rosa.

## 1. Contexto del problema

El frontend (Next.js 16 + React 19 + TailwindCSS 4 + shadcn/ui `base-nova` + `@base-ui/react`) sufre una fragmentación severa de estilos:

| Fuente | Clases hardcodeadas | Uso de variables de tema |
|---|---|---|
| slate-* | **1,230** | — |
| rose-* | 372 | — |
| emerald-* | 270 | — |
| blue-* | 119 | — |
| amber-* | 94 | — |
| violet-* / indigo-* / purple-* | 65 / 50 / 35 | — |
| `bg-primary` / `bg-card` / `text-muted` | — | **9 / 2 / 25** |

Solo existe `:root` en `globals.css` (sin `.dark`); las clases `dark:` de los componentes base nunca se activan. Los componentes UI base (`button`, `card`, `badge`, `input`, `dialog`, etc.) ya consumen variables shadcn; el 99% de las páginas y componentes de negocio los ignoran.

## 2. Tokens de color

### 2.1 Tokens base (tema claro)

```css
:root {
  --background: 210 40% 98%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 346.8 77.2% 49.8%;          /* rosa Melosmile */
  --primary-foreground: 355.7 100% 97.3%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 346.8 77.2% 49.8%;
  --radius: 0.75rem;
}
```

### 2.2 Tokens de sidebar oscura (identidad actual)

Mapean la paleta `slate-950/900/800` actual:

```css
:root {
  --sidebar: 222.2 84% 4.9%;            /* slate-950 */
  --sidebar-foreground: 210 40% 98%;    /* slate-100 */
  --sidebar-border: 217 33% 17%;        /* slate-800 */
  --sidebar-accent: 217 33% 12%;        /* slate-900 */
  --sidebar-accent-foreground: 210 40% 98%;
  --sidebar-muted: 215 25% 27%;         /* slate-700 */
  --sidebar-muted-foreground: 215 20% 55%; /* slate-400 */
}
```

### 2.3 Tokens semánticos (estados)

```css
:root {
  --success: 160 84% 39%;               /* emerald-600 */
  --success-foreground: 0 0% 100%;
  --warning: 38 92% 50%;                /* amber-500 */
  --warning-foreground: 0 0% 100%;
  --info: 217 91% 60%;                  /* blue-500 */
  --info-foreground: 0 0% 100%;
}
```

### 2.4 Token de marca IA (Musly)

```css
:root {
  --brand-ai-from: 262 83% 58%;         /* violet-600 */
  --brand-ai-to: 243 75% 59%;           /* indigo-600 */
}
```

### 2.5 Tema oscuro (opcional, activable vía `.dark`)

Mantener las definiciones base para que las clases `dark:` existentes cobren sentido:

```css
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 7%;
  --card-foreground: 210 40% 98%;
  --primary: 346.8 77.2% 49.8%;
  --primary-foreground: 355.7 100% 97.3%;
  --secondary: 217 33% 12%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217 33% 12%;
  --muted-foreground: 215 20% 65%;
  --accent: 217 33% 17%;
  --accent-foreground: 210 40% 98%;
  --border: 217 33% 17%;
  --input: 217 33% 17%;
  --ring: 346.8 77.2% 49.8%;
  --sidebar: 222.2 84% 4.9%;
  --sidebar-foreground: 210 40% 98%;
  --sidebar-border: 217 33% 17%;
  --sidebar-accent: 217 33% 17%;
  --sidebar-accent-foreground: 210 40% 98%;
}
```

## 3. Tabla de conversión de clases

| Clase actual (hardcodeada) | Reemplazo con token |
|---|---|
| `bg-slate-950` | `bg-sidebar` |
| `bg-slate-900` | `bg-sidebar-accent` |
| `bg-slate-900/60`, `bg-slate-900/80` | `bg-sidebar-accent/60`, `/80` |
| `bg-slate-800`, `bg-slate-800/80` | `bg-sidebar-accent` (o `bg-sidebar-border/40`) |
| `bg-slate-100` | `bg-muted` |
| `bg-slate-100/70` | `bg-muted/70` |
| `bg-slate-50`, `bg-slate-50/30` | `bg-muted/40` |
| `bg-slate-200/60` | `bg-muted` |
| `text-slate-900` | `text-foreground` |
| `text-slate-800` | `text-foreground` |
| `text-slate-700` | `text-foreground` (o `text-muted-foreground` si es secundario) |
| `text-slate-600` | `text-muted-foreground` |
| `text-slate-500` | `text-muted-foreground` |
| `text-slate-400` | `text-muted-foreground` |
| `text-slate-100` | `text-sidebar-foreground` (en sidebar) |
| `bg-white` | `bg-card` (contenedores) o `bg-background` (fondo) |
| `border-slate-200` | `border-border` |
| `border-slate-100` | `border-border/60` |
| `border-slate-800`, `border-slate-800/80` | `border-sidebar-border` |
| `hover:border-slate-200` | `hover:border-border` |
| `bg-rose-500` | `bg-primary` |
| `bg-rose-600` | `bg-primary` (estado hover usa `bg-primary/90`) |
| `text-rose-500`, `text-rose-600` | `text-primary` |
| `text-rose-400` | `text-primary/80` |
| `bg-rose-50` | `bg-primary/10` |
| `bg-rose-100/60` | `bg-primary/15` |
| `border-rose-200` | `border-primary/30` |
| `hover:border-rose-300` | `hover:border-primary/40` |
| `ring-rose-400`, `ring-rose-500` | `ring-primary/60` |
| `shadow-rose-500/20` | `shadow-primary/20` |
| `bg-gradient-to-r from-rose-600 to-rose-500` | `bg-gradient-to-r from-primary to-primary/80` |
| `bg-gradient-to-tr from-rose-600 via-rose-500 to-pink-500` | `bg-gradient-to-tr from-primary via-primary to-primary/70` |
| `from-violet-600 to-indigo-600` | `from-(--brand-ai-from) to-(--brand-ai-to)` o `bg-gradient-to-r from-violet-600 to-indigo-600` mantenido como utilidad |
| `bg-emerald-50` | `bg-success/10` |
| `bg-emerald-500`, `bg-emerald-600` | `bg-success` |
| `text-emerald-600` | `text-success` |
| `bg-blue-50` | `bg-info/10` |
| `bg-blue-600` | `bg-info` |
| `text-blue-600` | `text-info` |
| `bg-amber-500` | `bg-warning` |
| `text-amber-600` | `text-warning` |
| `bg-purple-500` | `bg-primary/80` o token dedicado |

## 4. Estructura de globals.css (Tailwind v4)

Con Tailwind v4, las variables definidas en `@layer base` son detectadas y consumidas por utilidades como `bg-primary`, `text-foreground`, etc. Solo es necesario definirlas; no hace falta `@theme` salvo que se quieran exponer como utilidades directas (ej. `bg-sidebar`). Organización recomendada:

```css
@import "tailwindcss";

@layer base {
  :root { /* tokens sección 2.1–2.4 */ }
  .dark { /* tokens sección 2.5 */ }
}

/* Utilidades custom (glass-panel, dark-glass) — mantener, adaptadas a tokens */
/* Overrides FullCalendar (.fc) — mantener, usar var(--primary) donde aplique */
```

Nota: las clases `bg-sidebar`, `bg-sidebar-accent`, `bg-sidebar-foreground`, `bg-sidebar-border`, `bg-success`, `bg-warning`, `bg-info`, `text-success`, etc. funcionan automáticamente porque Tailwind v4 genera utilidades desde cualquier `--nombre` definido en el árbol CSS.

## 5. Colores de clínicas / calendario

Los eventos de calendario y dots de clínicas usan presets dinámicos (`bg-blue-600`, `bg-emerald-600`, `bg-violet-600`, `bg-amber-600`, `bg-rose-600`). Son **identificadores visuales de datos** (no diseño de marca), por lo que **NO se migran a tokens semánticos**. Recomendación:

- Definir constantes en `frontend/src/lib/colors.ts` (o mantener `COLOR_PRESETS` actual) con las clases utilitarias.
- Añadir comentario en `calendar-view.tsx` indicando que estos colores son por-clínica y no deben tocarse.
- Opcional: tokens `--clinic-1..5` si se quiere centralizar, pero no es necesario para la unificación.

## 6. Orden de ejecución de migración

1. `frontend/src/app/globals.css` — añadir tokens nuevos (sidebar, success, warning, info, brand-ai).
2. `frontend/src/components/layout/sidebar.tsx` — migrar slate → sidebar tokens (mayor impacto visual).
3. `frontend/src/app/(dashboard)/layout.tsx` — header y fondo → tokens.
4. `frontend/src/components/layout/notification-center.tsx` — dialog/panel → tokens.
5. `frontend/src/components/dashboard/*` (ai-agent-bar, global-ai-agent-modal) — rose/violet → tokens.
6. `frontend/src/app/(dashboard)/page.tsx` — KPIs → tokens.
7. `frontend/src/components/calendar/*` — calendar-view, modales, drawer → tokens.
8. `frontend/src/components/ui/dialog.tsx` + `sheet.tsx` — `bg-white text-slate-900` → `bg-card text-card-foreground`.
9. `frontend/src/app/(dashboard)/patients/*`, `billing/*`, `settings/*` → tokens.
10. `frontend/src/app/login/page.tsx` → tokens.
11. `frontend/src/components/patients/*`, `reminders/*`, `appointments/*` → tokens.

## 7. Resumen ejecutivo

Tokens clave a definir en `globals.css`:

- **Base**: `--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--primary` (`346.8 77.2% 49.8%`), `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--destructive`, `--destructive-foreground`, `--border`, `--input`, `--ring`, `--radius`
- **Sidebar**: `--sidebar`, `--sidebar-foreground`, `--sidebar-border`, `--sidebar-accent`, `--sidebar-accent-foreground`, `--sidebar-muted`, `--sidebar-muted-foreground`
- **Semánticos**: `--success`, `--success-foreground`, `--warning`, `--warning-foreground`, `--info`, `--info-foreground`
- **Marca IA**: `--brand-ai-from`, `--brand-ai-to`
- **Dark**: bloque `.dark` con las mismas variables redefinidas

Reglas de oro:
1. Nunca usar clases `slate-*`/`rose-*`/`emerald-*`/`blue-*`/`violet-*` en componentes de UI — siempre tokens.
2. En sidebar usar SIEMPRE tokens `sidebar-*`.
3. Colores por clínica (calendario) quedan como utilidades dinámicas (NO tokens).
4. El botón Musly mantiene su identidad violet→indigo vía `--brand-ai-*`.