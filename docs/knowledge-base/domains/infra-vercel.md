# Infraestructura Vercel — Melosmile

> Página de dominio: arquitectura de despliegue, incidente del 2026-08-22 (staging desactualizado/404) y procedimiento correcto.

## Arquitectura real (verificada 2026-08-22)

| Entorno | Proyecto Vercel | Rama | URL estable | Dominios asignados |
|---|---|---|---|---|
| Staging | `melosmile-staging` | `develop` | `https://staging.melosmile.com` | `staging.melosmile.com`, `frontend-eight-dusky-42.vercel.app` |
| Producción | `melosmile-production` | `main` | `https://agenda.melosmile.com` | `agenda.melosmile.com`, `frontend-kohl-ten-59.vercel.app` |

**Claves:**
- NO existe integración GitHub → Vercel automática en ninguno de los dos proyectos. Todos los deploys son manuales vía CLI (`meta: null` en los deployments).
- Existen DOS enlaces `.vercel` en el repo:
  - `.vercel/project.json` (raíz) → `melosmile-production`
  - `frontend/.vercel/project.json` → `melosmile-staging`
- Ambos proyectos tienen *Root Directory* "." pero el `package.json` raíz no tiene script `build` (solo delega `dev`). El código Next.js vive en `frontend/`.

## Incidente 2026-08-22 — "Staging con 404s y sin cambios de local"

**Síntomas**: local OK; staging mostraba rutas 404 y no reflejaba cambios recientes.

**Causas raíz encontradas (en orden de impacto):**
1. **Deploys al proyecto equivocado**: los deploys CLI hechos desde la raíz del repo iban a `melosmile-production`, no a `melosmile-staging`.
2. **Producción obsoleta**: `agenda.melosmile.com` llevaba 24 días sin desplegar; las rutas nuevas no existían en ese build (404 real de Next.js).
3. **DNS roto**: `develop.mumaweb.com` resolvía a la IP del VPS IONOS (94.143.139.120), no a Vercel → esa URL nunca sirvió la app.
4. **Race condition**: el último deploy se inició 3 s después del commit final; el build no llegó a incluirlo.
5. **Falso positivo de verificación**: los deploys Preview tienen *Deployment Protection* activa (página "Login – Vercel" sin sesión); verificar contenido por curl anónimo contra previews da resultados inválidos.

**Resolución aplicada:**
1. Redespliegue manual desde `frontend/` al proyecto `melosmile-staging` (`cd frontend && vercel --prod=false --yes`) → Ready en ~52 s.
2. Alias reasignado: `melosmile-staging-git-develop-proyectosmuma-stacks-projects.vercel.app` → deployment fresco.
3. Verificación de frescura por marcador: el script anti-FOUC introduce `localStorage.getItem('melosmile_theme')` en el layout raíz; su presencia en el HTML servido confirma build ≥ commit `fc541b2`. Presente en staging ✓, ausente en producción vieja ✓.

## Procedimiento correcto de despliegue a staging

```bash
# 1. Asegurar todo commiteado y pusheado
git status && git push origin develop

# 2. Desplegar DESDE frontend/ (enlace .vercel apunta a melosmile-staging)
cd frontend && vercel --prod=false --yes
```

> Nota: el flag `--prod=false` produjo igualmente `target: production` dentro del proyecto `melosmile-staging`; funcionalmente es correcto porque el target "production" de ese proyecto es su URL estable de staging. Verificar siempre el contenido tras el deploy.

## Marcadores de verificación de frescura

- `melosmile_theme` (script anti-FOUC, layout raíz) → presente desde `fc541b2` (2026-08-22).
- Probe de ruta válida: `/settings` (hub de Ajustes). OJO: `/ajustes` no es una ruta de la app.

## PENDING

- [ ] Decidir si se conecta integración Git→Vercel para automatizar deploys por rama (evitaría race conditions manuales).
- [ ] Actualizar producción (`agenda.melosmile.com`) fusionando `develop` a `main` cuando el usuario lo apruebe explícitamente.

## UPDATE (2026-08-23)
- Se ha registrado exitosamente el dominio `staging.melosmile.com` en el proyecto `melosmile-production` y atado directamente a la rama `develop` usando la API de Vercel. Ionos gestiona el CNAME apuntando a `cname.vercel-dns.com`. A partir de ahora, staging se puede acceder y probar en una URL predecible.
