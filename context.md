# Contexto Técnico y Guía del Proyecto — Melosmile

> ⚠️ **REGLA DE RAMAS**: Este archivo de contexto y documentación pertenece exclusivamente a la rama `develop` y NUNCA debe fusionarse a la rama `main`.

---

## 📌 Visión General del Proyecto

**Melosmile** es una plataforma integral de gestión de clínicas dentales y contabilidad odontológica multiclínica. Su objetivo principal es facilitar el agendamiento inteligente, el seguimiento clínico estilo Notion, la automatización de cobranzas, la facturación contable por clínica/mes y la facturación integrada con Odoo ERP, respaldado por agentes de Inteligencia Artificial que operan mediante **n8n** alojado en VPS IONOS.

---

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, `xlsx` (parsing nativo de archivos Excel).
- **Hosting & CI/CD**: Vercel (`melosmile-production`), rama `main` → Producción, rama `develop` → Preview/Staging.
- **Estilos y UI**: TailwindCSS 4, Shadcn UI, Lucide Icons, `@dnd-kit/core` (Drag & Drop).
- **Backend & Base de Datos**: Supabase Cloud (múltiples proyectos por entorno — ver sección Infraestructura).
- **Módulo Contable & Calculadora**: Motor `calculator.ts` con sugerencia inteligente de aparatología/laboratorio (`TREATMENT_LAB_SUGGESTIONS`), validaciones en 4 niveles (ERROR, ALERTA, NEGATIVO, INFO), 19 columnas de registro contable, auto-creación secuencial de pacientes (`PAC-001`, `PAC-002`...), vinculación de citas con asignación obligatoria a la **Dra. Osly Melo**, emparejamiento con el catálogo de tratamientos de la BD (`Pulpotomía`, `Control de Ortodoncia`, `Obturación Simple`, `Ortodoncia Invisible`), dropdowns interactivos para Pacientes, Tratamientos y Equipos de Laboratorio, cálculo automático de costes de laboratorio, columnas de porcentaje/monto médico (`% Dr.`, `€ Dr.`), tabla a ancho completo de pantalla y accesos directos a las fichas clínicas del paciente.
- **Automatización e IA**: Agente **Musly** (Dispatcher + 4 Sub-agentes especializados en n8n: Agendamiento, Clínico, Facturación y General/FAQs + Extractor Contable Multimodal 08 y Flujo de Aprobación 09), modelo `google/gemini-2.5-flash` vía OpenRouter con `temperature: 0` determinista, `retryOnFail` en herramientas HTTP, filtro de tokens estáticos en UI y n8n, memoria de sesión multiturno con reescritura contextual de peticiones anafóricas, desambiguación estricta de identidad de paciente y sistema de Aprendizaje Dinámico Autónomo (`/api/ai/memory/search` y `/api/ai/memory/learn`).
- **Integraciones externas**: Odoo API (Facturación y Contabilidad), WhatsApp/Email/SMS vía n8n.
- **VPS IONOS**: Servidor `94.143.139.120` (usuario: `u60945363`) para almacenamiento físico de documentos y fotos clínicas en `/opt/melosmile/`.

---

## 🌐 Infraestructura de Entornos (Consolidada 2026-09-10)

> **Arquitectura de 3 capas**: `localhost` (desarrollo) → `develop` → `staging` (Preview) → `main` → `producción`
>
> **Fuente única de verdad por proyecto**: Cada proyecto Vercel (`melosmile-staging` y `melosmile-production`) tiene exactamente **23 variables únicas** con target unificado `["production", "preview", "development"]`. No hay fragmentación por entorno. Cuando se hace merge de `develop` → `main`, las variables se heredan automáticamente del proyecto destino sin necesidad de tocar nada.

### 🟣 ENTORNO LOCAL — Desarrollo (`localhost:3028`)

| Servicio | URL / Valor |
|---|---|
| **App Web** | `http://localhost:3028` |
| **Supabase Local** | `http://127.0.0.1:54321` |
| **Supabase Studio** | `http://127.0.0.1:54323` |
| **Supabase Anon Key** | JWT demo estándar de Supabase CLI |
| **Supabase Service Role** | JWT demo estándar de Supabase CLI |
| **n8n (dev)** | `https://n8n.mumaweb.com` |
| **Fichero env** | `frontend/.env.local` |
| **Iniciar** | `npm --prefix frontend run dev` |
| **Iniciar Supabase Local** | `supabase start` |
| **Sincronizar datos (Cloud → Local)** | `npm --prefix frontend run db:sync` (solo con `/actualiza-datos`) |

**Variables `.env.local`:**
```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...demo-anon
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...demo-service
N8N_WEBHOOK_BASE_URL=https://n8n.mumaweb.com
N8N_WEBHOOK_URL=https://n8n.mumaweb.com/webhook/document-cleaner
NEXT_PUBLIC_APP_URL=http://localhost:3028
ODOO_URL=https://melosmile.odoo.com
ODOO_DB=melosmile
ODOO_USER=gestion@melosmile.com
```

---

### 🟡 ENTORNO STAGING — Proyecto Vercel `melosmile-staging` (rama `develop`)

| Servicio | URL / Valor |
|---|---|
| **Rama Git** | `develop` |
| **Proyecto Vercel** | `melosmile-staging` (PRJ: `prj_qP5or4gNukJS9w8PTXeiL5vHI02t`) |
| **Root Directory** | `frontend` (configurado vía API para resolver el monorepo) |
| **App Web** | `https://staging.melosmile.com` |
| **Supabase Staging** | `https://amhfdzfcmpastmlsosou.supabase.co` |
| **n8n (prod)** | `https://n8nv2.mumaweb.com` |
| **Fichero env** | `frontend/.env.remote` |
| **Sincronizar datos** | `npm --prefix frontend run db:sync` |
| **Despliegue** | `cd frontend && vercel --prod=false --yes` (desde `frontend/` que tiene `.vercel` linkeado a `melosmile-staging`) |

> ⚠️ **Política de despliegue**: por defecto SIEMPRE se despliega a staging (`develop`). Producción (`main`) solo cuando el usuario lo pida explícitamente tras aprobar el desarrollo.
>
> ⚠️ **Gotcha de enlace `.vercel`**: La raíz del repo tiene `.vercel/project.json` → `melosmile-production`. `frontend/.vercel/project.json` → `melosmile-staging`. Para desplegar staging hay que ejecutar `vercel` DESDE `frontend/`. Desde la raíz iría al proyecto equivocado.
>
> 📝 PENDING: DNS de `develop.mumaweb.com` apunta al VPS IONOS (94.143.139.120) en vez de a Vercel; corregir CNAME → `cname.vercel-dns.com`.

---

### 🟢 ENTORNO PRODUCCIÓN — Proyecto Vercel `melosmile-production` (rama `main`)

| Servicio | URL / Valor |
|---|---|
| **Rama Git** | `main` |
| **Proyecto Vercel** | `melosmile-production` (PRJ: `prj_sqADVALHygkmgEaTqKdwc8evOtvh`) |
| **App Web** | `https://agenda.melosmile.com` |
| **Supabase Producción** | `https://xylqytpudbdcsbuuwqpi.supabase.co` |
| **Org Supabase** | `melosmile org` → Proyecto `melosmile-production` (Única y exclusiva BD de producción real) |
| **n8n (prod)** | `https://n8nv2.mumaweb.com` |
| **API Key n8n prod** | `Antigravity-melosmile` (JWT en `mcp_config.json`) |
| **Fichero env** | Variables en Vercel `Production` (encriptadas, 23 únicas) |
| **Despliegue** | `vercel --prod` desde la raíz (`.vercel` apunta a `melosmile-production`) |

---

### 📋 Variables Unificadas por Proyecto (SSOT — 2026-09-10)

> Cada proyecto Vercel tiene **exactamente las mismas 23 variables** para los 3 targets (`production`, `preview`, `development`). Los valores varían solo entre proyectos (staging vs producción). Esto garantiza que un merge de `develop` → `main` no requiere tocar variables.

**Proyecto `melosmile-staging` (23 vars):** Apunta a `amhfdzfcmpastmlsosou` (solo Munir PAC-001).
**Proyecto `melosmile-production` (23 vars):** Apunta a `xylqytpudbdcsbuuwqpi` (67 pacientes reales).

Variables comunes a ambos proyectos (diferentes valores):
- `NEXT_PUBLIC_SUPABASE_URL` → URL de Supabase (staging o prod)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Anon key del proyecto Supabase correspondiente
- `SUPABASE_SERVICE_ROLE_KEY` → Service role del proyecto Supabase correspondiente
- `NEXT_PUBLIC_APP_URL` → `https://staging.melosmile.com` (staging) / `https://agenda.melosmile.com` (prod)
- `N8N_WEBHOOK_BASE_URL` → `https://n8nv2.mumaweb.com` (ambos)
- `N8N_WEBHOOK_URL` → `https://n8nv2.mumaweb.com/webhook/document-cleaner`
- `N8N_VECTORIZER_WEBHOOK_URL` → `https://n8nv2.mumaweb.com/webhook/melosmile-knowledge-processor`
- `N8N_API_KEY` → API key de n8n
- `ODOO_URL` → `https://melosmile.odoo.com`
- `ODOO_DB` → `melosmile`
- `ODOO_USER` → `gestion@melosmile.com`
- `ODOO_PASSWORD` → (sensible)
- `VPS_SSH_HOST` → `94.143.139.120`
- `VPS_SSH_USER` → `u60945363`
- `VPS_SSH_PASSWORD` → (sensible)
- `VPS_FTP_PORT` → `21`
- `VPS_DOMAIN_FOLDER` → `melosmile.com`
- `VPS_DOCS_BASE_PATH` → ruta base en VPS
- `AUTH_USERNAME` → usuario de autenticación de la app
- `AUTH_PASSWORD` → contraseña de la app
- `NEXT_PUBLIC_VPS_FILES_BASE` → URL base para fotos/documentos

**Respaldo pre-saneamiento:** `scratch/vercel_envs_backup_before_consolidation.json`
**Informe técnico CTO:** `cto_env_vars_consolidation.md`

---

### 🤖 n8n — Flujos por Entorno

> IDs verificados contra las APIs REST de ambas instancias el 2026-08-23. Detalle completo y patrones certificados: `docs/knowledge-base/domains/n8n-workflows.md`.

| Flujo | ID Dev (`n8n.mumaweb.com`) | ID Prod (`n8nv2.mumaweb.com`) |
|---|---|---|
| `[MELOSMILE] AI Dispatcher` | `Yv9X1EGUvQg8qErW` | `QgNoVFr9TBXGbdOl` |
| `[MELOSMILE] Sub-Agent: Agendamiento` | `vg2HrtIQpvDrcUOC` | `E59OoSRNJ4skt43W` |
| `[MELOSMILE] Sub-Agent: Clinico` | `Q7oxrbUuohca81Gn` | `cQQGecziVfareNtI` |
| `[MELOSMILE] Sub-Agent: Contabilidad` | `XSLNwq6ihH1SHPRl` | `4Z7PdsGK2wAIi2iE` |
| `[MELOSMILE] Sub-Agent: General` | `MIok0ruU7JhpTxWv` | `9scMTKJwP7TKFSJV` |
| `[MELOSMILE] Agent Document Cleaner` | `OG4Yy4N7qALXojTa` | `IrLOC3fSQZCxvvBz` |
| Helper - Appointment Write | `BTJZSpohjoxeY5Ru` | — |
| Helper - Appointment Modify | `MlrysSNd3N8tDjVh` | — |
| Helper - Patient Create | `AwZXnNEdTjVaPXsE` | — |
| Helper - Patient Search | `ungEfZO2qzDQvuVC` | — |
| Helper - Billing Query | `AzGmCQ5rd7gvEQ3w` | — |

⚠️ **Divergencia activa dev↔prod (2026-08-23)**: la arquitectura de helpers deterministas, memoria multiturno del dispatcher y fixes de fechas/cancelación soft existen SOLO en dev. Los flujos Melosmile de producción llevan sin actualizarse desde 2026-07-29 y su OpenRouter usa `google/gemini-2.5-flash`. Unificar cuando se apruebe.

> Todos los flujos de producción tienen tag `Melosmile` y apuntan a `https://agenda.melosmile.com`.

---

### 🖥️ VPS IONOS — Almacenamiento de Documentos y Fotos por FTP

| Parámetro | Valor |
|---|---|
| **Host FTP/SSH** | `94.143.139.120` (`melosmile.com`) |
| **Usuario FTP** | `u60945363` |
| **Puerto FTP** | `21` (FTP pasivo con librería `basic-ftp`) |
| **Contraseña** | Configurada en variable `VPS_SSH_PASSWORD` (`.env.remote`) |
| **Directorio Raíz Domain** | `melosmile.com/` |

**Estructura de directorios en VPS:**
```
melosmile.com/
└── pacientes/
    └── {patient_uuid}/
        ├── registros/
        │   └── {YYYY-MM-DD}/     ← Fotos clínicas (imágenes)
        │       └── {timestamp}_{filename}.jpg
        └── docs/                  ← Documentos PDF/informes
            └── {timestamp}_{filename}.pdf
```

**Lógica de subida por FTP** (`/api/documents/upload/route.ts`):
- **Transferencia por FTP**: Los archivos (fotos clínicas, documentos, PDFs, etc.) se transmiten mediante conexión FTP directa a `94.143.139.120` usando `basic-ftp`. No se utiliza `fs` local ni Supabase Storage.
- **Creación de Directorios**: `client.ensureDir` crea automáticamente las carpetas remotas necesarias si no existen.
- **Imágenes** (`jpg`, `jpeg`, `png`, `webp`, `gif`, `bmp`) → `melosmile.com/pacientes/{id}/registros/{fecha}/`
- **Documentos** (`pdf`, otros) → `melosmile.com/pacientes/{id}/docs/`
- Tras completar la subida FTP, registra la metadata en la tabla `documents` de Supabase.
- Para PDFs/documentos: dispara el webhook de vectorización en n8n (`N8N_VECTORIZER_WEBHOOK_URL`).

**Variables de Entorno VPS:**
```env
VPS_SSH_HOST=94.143.139.120
VPS_FTP_PORT=21
VPS_SSH_USER=u60945363
VPS_SSH_PASSWORD=<CONFIGURADO_EN_ENV_REMOTE>
VPS_DOMAIN_FOLDER=melosmile.com
```

✅ **Compatibilidad**: Funciona tanto en desarrollo local (`localhost:3028`) como en `develop` (staging) y `main` (producción Vercel Serverless), ya que la conexión FTP se establece de forma remota por red.

---

### 🔐 Fotografías y Documentos Clínicos en VPS IONOS (Completado 2026-09-08)

Las 88 fotografías clínicas reales han sido migradas al servidor VPS IONOS (`94.143.139.120`), quedando almacenadas bajo la estructura canónica `melosmile.com/pacientes/{patient_id}/registros/{YYYY-MM-DD}/{file_name}`. En Supabase Producción (`xylqytpudbdcsbuuwqpi`), `file_path` apunta a la ruta relativa del VPS y `file_url` se mantiene en `NULL`. La resolución y acceso se efectúa de forma transparente y segura a través de `NEXT_PUBLIC_VPS_FILES_BASE` y `/api/documents`.


---

## ⚙️ Reglas de Negocio Clave

1. **Gestión Multiclínica & Descuentos de Laboratorio**:
   - Cada clínica/sede (ej. Albacete, Goya, Las Rozas, Clínica Daniel Bustamante) posee configuraciones base de descuento de laboratorio y comisiones.
   - **Regla de Sobrescritura**: Los porcentajes de laboratorio y comisiones pueden variar según el tratamiento o gasto específico en una misma sesión. Por tanto, la vista de la cita (`/appointments/[id]`) y de contabilidad (`/billing/[id]`) permiten ajustar estos valores individualmente.

2. **Cálculo Neto de Sesión**:
   $$\text{Subtotal} = \max(\text{Precio}, \text{Otro Precio}) \times \text{Cant} - \text{Descuento}$$
   $$\text{Comisión} = \text{Subtotal} \times \% \text{Comisión Clínica}$$
   $$\text{Gasto Lab Dto} = \text{Cant Lab} \times \text{Coste Lab} \times (1 - \% \text{Dto Lab})$$
   $$\text{Neto} = \text{Comisión} - \text{Gasto Lab Dto}$$
   $$\text{Honorarios Médico} = \text{Neto} \times \% \text{Dr. Principal}$$

3. **Módulo Billing y Contabilidad**

El motor financiero ha pivotado a una arquitectura de **Single Source of Truth basada en Citas**.

**Flujo Contable:**
1. Las citas con estado `Realizada` (en `appointments`) son la base.
2. Si un paciente tiene N procedimientos en una sola cita, se parsea el JSON de `notes` y se genera una **línea contable independiente** por procedimiento (con su respectivo `appointment_id` y `procedure_index`).
3. El endpoint `/api/billing/sessions/generate` compila estas citas para el mes/año/clínica solicitados, calculando comisión (por defecto 60%), laboratorio (sugerido basado en catálogo, 50% de descuento estándar) y NETO.
4. Las líneas se pueden ajustar manualmente en `/billing/[id]`. Si se traen nuevas citas haciendo click en "Actualizar desde Citas", **los ajustes manuales previos se preservan**.

**Agente Limpiador de Documentos y OCR Manuscrito (`/billing/new`):**
El ingreso manual/importación de Excel o fotos manuscritas se realiza desde el **Document Cleaner Portal** (`/billing/new`). El usuario sube una foto manuscrita o documento Excel/CSV, el cual se envía al flujo N8N `[MELOSMILE] Agent Document Cleaner` (`OG4Yy4N7qALXojTa`).
- **Enrutador N8N (`If Node`)**: Separa de forma estable imágenes manuscritas (`source_type: 'image'`) dirigidas a OpenRouter `google/gemini-2.5-flash` de Visión, y documentos Excel/CSV dirigidos al procesador de texto.
- **Diccionario de Clínica (Albi / Albacete)**: Abreviatura `RC` o `R.C.` $\rightarrow$ `Reconstrucción Simple`, `Rev` o `Rev.` $\rightarrow$ `Control`.
- **Separación de Notas y Observaciones Clínicas (`notes`)**: Toda indicación clínica no facturable (ej: *Ataches / Poner varios ataches*, *Quitar Brackets*, *Poner Brackets Superior*, *Hará un poco de IPR*, *Coloc Myobrace*, etc.) es extraída estrictamente hacia el campo `notes` de la cita (destinado al bloque de Evolución Clínica & Observaciones del Doctor) y NUNCA como un procedimiento facturable independiente.
- **Sincronización en la N8N API**: Los Prompts del flujo `[MELOSMILE] Agent Document Cleaner` (`OG4Yy4N7qALXojTa`) fueron actualizados mediante la API REST de n8n (`n8n.mumaweb.com`) para garantizar determinismo en el motor de visión y texto.
- **Inserción Automática en Supabase con Propagación de Cookie**: La ruta `/api/billing/document-cleaner/route.ts`
- **Entornos & Redundancia**: Dual MCP (Supabase Cloud + Supabase Local en `127.0.0.1:54321`), Aislamiento de Entornos (Local 100% aislado con `seed.sql`, sincronización manual bajo `/actualiza-datos`), Guard de Conexión IA en local (`ai-offline-guard.ts`), y Configuración Centralizada de Entorno (`src/config/env.ts`, estilo `wp-config.php`).
- **Unificación de Citas & Protocolo de Limpieza**: La API de citas (`/api/appointments/create`) unifica automáticamente tratamientos y precios para un mismo paciente a la misma hora según `AGENTS.md`. Protocolo de borrado de base de datos (`Borra datos`) en orden estricto de FK dejando la ficha limpia de Munir Mauel Callaos Cardama (`PAC-001`).
, garantizando que toda ingesta procedente de n8n quede inmediatamente insertada en Supabase y visible en el Hub de Facturación.
- **Agrupamiento por Paciente + Hora**: Mismo paciente a la misma hora (ej: 09:30 Lucas cementar 60€ y 09:30 Lucas líneas 50€) se unifica en **una sola cita** con array de tratamientos `["cementar", "líneas"]` e importe sumado (110 €).
- **Sobrescritura Estricta de Precios Escritos**: Si en la hoja/documento figura un importe numérico en euros, ese monto prevalece sobre los precios por defecto del catálogo.
- **Resolución Inteligente de Pacientes**: Si solo figura el nombre de pila, busca en la clínica: si existe 1 solo paciente con ese nombre (ej: "Lucas Callaos"), se vincula directamente; si existen varios pacientes homónimos, crea la cita con estado `Pendiente de Revisión` para selección manual sin eliminar la entrada.
- **Manejo de Cancelados**: Citas tachadas (`cancelled: true`) se crean con estado `Cancelada` en Supabase y son automáticamente excluidas de las sesiones contables de facturación.

   - **Dropdowns Interactivos con Catálogo de la BD**:
     - *Paciente*: Selección desde la base de datos o creación secuencial con enlace directo a la ficha del paciente.
     - *Tratamiento*: Select interactivo con todo el catálogo de tratamientos de la BD que auto-rellena el precio oficial al seleccionar.
     - *Equipo / Trabajo de Laboratorio*: Select interactivo filtrado por aparatología y tratamientos con coste de laboratorio.
   - **Sugerencia Inteligente de Aparatología y Células Resaltadas (`is_lab_suggested`)**: El sistema analiza el tratamiento principal y sugiere automáticamente el trabajo de laboratorio y su coste típico (ej. `Ortodoncia Invisible` → `Alineadores Transparentes (Set Completo)` [700€], `Ortodoncia Brackets` → `Set de Brackets y Arcos Metálicos` [350€]). Las celdas sugeridas se destacan visualmente con un fondo amarillo/ámbar y la etiqueta `💡 Sugerido`.
   - **Asignación de Profesional Tratante por Defecto**: Todas las citas generadas o vinculadas se asignan obligatoriamente a la **Dra. Osly Melo** (`d7e5e2bb-a7c4-44f6-9ef8-ba453e7dc477`).
   - **Desglose de Porcentajes y Totales en el Footer**: El pie de página pegajoso muestra el desglose completo en porcentaje y montos monetarios: Total Subtotal (100%), Comisión Clínica (60%), Gastos de Laboratorio (% Dto), Honorarios Médico y Neto Total del Mes.
   - **Acceso Directo a Ficha Clínica**: En la tabla contable (`/billing/[id]`), cada nombre de paciente incluye un botón con icono que abre su ficha clínica histórica en `/patients/[id]`.
   - **Sincronización de Citas e Historial Clínico**: Registra/vincula automáticamente las visitas en `appointments` (`status: 'Realizada'`, guardando el `treatment_id` e intervenciones en `notes`).
   - **Diseño a Ancho Completo (Full-Bleed Viewport)**: El área de trabajo `/billing/[id]` utiliza todo el ancho horizontal disponible de la pantalla para máxima legibilidad de las columnas contables.
   - **Visualización en 3 Pestañas**:
     - *Tabla Detallada*: Registro cronológico con dropdowns e inputs inline.
     - *Resumen de Servicios*: Agregado por tratamiento clínico y proveedor de laboratorio (hoja "Resumen" del Excel).
     - *Pivot por Paciente*: Totales acumulados por paciente (hoja "Pivot" del Excel).
- **Motor de Validaciones en 4 Niveles**:
      - 🔴 `ERROR`: Paciente `#N/A` o sin precio asignado (bloquea la aprobación).
      - 🟡 `ALERTA`: Desviación de precio >20% respecto al catálogo o tratamiento no encontrado.
      - 🔴 `NEGATIVO`: NETO negativo (gastos de lab superan comisión).
      - 🔵 `INFO`: Cantidad 0 (seguimiento) o notas destacadas ("FINALIZA CUOTA", "A SU FAVOR").

---

## 🤖 Equipo MumaBot Cloud Pro — Incidencia y Corrección (2026-08-18)

### Diagnóstico: subagentes devolvían vacío
Los subagentes `mumabot-architect`, `mumabot-coder-cloud` y `mumabot-designer` devolvían resultados vacíos al ser invocados desde el orquestador. **Causa raíz**: los modelos `google/gemini-2.5-pro` y `google/gemini-2.5-flash` ya no existen en la API de Google (agosto 2026). El error exacto quedó registrado en `~/.local/share/opencode/log/opencode.log`:
```
AI_APICallError: This model models/gemini-2.5-pro is no longer available to new users.
Please update your code to use models/gemini-3.1-pro-preview
AI_APICallError: This model models/gemini-2.5-flash is no longer available to new users.
Please update your code to use models/gemini-3.6-flash
```

### Corrección aplicada (en `~/.config/opencode/agents/*.md`)
| Agente | Antes | Después |
|--------|-------|---------|
| `mumabot-architect` | `google/gemini-2.5-pro` | `google/gemini-3.1-pro-preview` |
| `mumabot-coder-cloud` | `google/gemini-2.5-flash` | `google/gemini-3.6-flash` |
| `mumabot-designer` | `google/gemini-2.5-flash` | `google/gemini-3.6-flash` |
| `mumabot-local-flash` | `mlx/qwen3-4b-q8` | **sin cambio** (mlx verificado operativo, 0.89s) |

> **Nota mlx**: el diagnóstico inicial sugirió cambiar `mumabot-local-flash` a ollama, pero verificación posterior confirmó que el servicio mlx (llama-server + proxy vram-switch, puerto 18080) **está operativo** y es más rápido (0.89s vs 13s ollama). La primera llamada tras arranque tarda por la carga del modelo en VRAM.

### Lecciones aprendidas
1. **Las definiciones de agentes (`~/.config/opencode/agents/*.md`) se cachean al arrancar opencode**: los cambios de modelo requieren **reiniciar la sesión**; editar el archivo no basta en caliente.
2. **Síntoma de agente "vacío" = error de modelo/provider**, no de prompt. Diagnóstico rápido: `grep -E "stream error|AI_APICallError" ~/.local/share/opencode/log/opencode.log | tail -20`.
3. **Verificar modelos vigentes antes de asignar**: `opencode models | grep google/gemini-3`.
4. Modelos Gemini 3 vigentes (2026-08): `gemini-3.1-pro-preview` (razonamiento), `gemini-3.6-flash` (código/velocidad), `gemini-3.5-flash-lite` (ultra-ligero).
5. **Ollama local (puerto 11435) es el provider fiable**: `qwen3.7-agents:4b-q8`, `qwen3.5:9b`, `qwen2.5-coder:7b` disponibles. El provider `mlx` (puerto 18080) no estaba activo.

### ⚠️ SEGUNDO HALLAZGO (test 2026-08-18): gemini-3.1-pro NO tiene free tier
El test de verificación reveló que **`google/gemini-3.1-pro-preview` tiene quota 0 en el free tier de Google** (`Quota exceeded ... free_tier_input_token_count, limit: 0`). El modelo pro SOLO funciona con plan de pago de Google o vía **OpenRouter** (key ya configurada en `~/.local/share/opencode/auth.json` y modelo disponible).

**Corrección final aplicada:**
| Agente | Modelo definitivo |
|--------|-------------------|
| `mumabot-architect` | `openrouter/google/gemini-3.1-pro-preview` (NO `google/...`) |
| `mumabot-coder-cloud` | `google/gemini-3.6-flash` (free tier OK) |
| `mumabot-designer` | `google/gemini-3.6-flash` (free tier OK) |

**Test ejecutado**: coder-cloud ✅ TEST OK · designer ✅ TEST OK · architect ❌ con `google/` (quota) → ✅ verificado vía API directa de OpenRouter (respuesta OK). Falta reiniciar opencode para que el architect cargue la ruta `openrouter/...` y re-testear.

**Documentación persistente**: ADR "MumaBot Agent Team" en el grafo (codebase-memory), lección/decisión en RAG (Supabase local), wiki Karpathy en `docs/knowledge-base/` (index.md, log.md, domains/agent-team.md, decisions/incidente-2026-08-18-subagentes-vacios.md), referencia en `CLAUDE.md`.

---

## 📸 Gestión de Fotografías Clínicas y Planes de Tratamiento Notion (2026-09-08)

1. **Resolución de Fotografías Huérfanas (`appointment_id: NULL`)**:
   - Se vincularon 30 fotografías clínicas en Supabase Cloud (`xylqytpudbdcsbuuwqpi`) a sus citas clínicas específicas:
     - Begoña Fernández Martínez HS (`PAC-024`): 2 fotos vinculadas a la cita de instalación de Motion F1 + aling 1 (21/04/2026).
     - Kamila Alejandra Hultzsch Naim (`PAC-022`): 12 fotos vinculadas a su cita diagnóstica inicial (20/01/2026).
     - Candela Fernández HS (`PAC-019`): 14 fotos vinculadas a su instalación de alineadores (03/02/2026).
     - Erika Alvarado (`PAC-013`) y Rafael Requeijo (`PAC-012`): Fotos de estudio vinculadas a sus citas de inicio de ortodoncia.
   - Estado final en BD: **0 documentos sin cita vinculada**.
2. **Documentación Clínica en `treatment_plan`**:
   - Registro cronológico detallado de intervenciones, prescripción de aparatología, números de alineadores entregados, IPR ejecutado y cronogramas de citas en 26 pacientes activos.
3. **Frontend & Despliegue**:
   - Incorporado soporte `whitespace-pre-line` en la ficha de paciente ([page.tsx](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/app/(dashboard)/patients/[id]/page.tsx)) para visualización estructurada.
   - Desplegado en producción en **agenda.melosmile.com**.

---

## 🔔 Sistema de Alertas Persistentes de la Campanita (`system_notifications`) (2026-09-09)

1. **Estructura y Migración SQL**:
   - Creada tabla `public.system_notifications` (`supabase/migrations/20260909000000_create_system_notifications.sql`) con soporte para tipos (`warning`, `info`, `success`), enlaces interactivos directos (`link`) a fichas de revisión, y políticas RLS públicas.
2. **Estado por Entornos**:
   - **Producción (`xylqytpudbdcsbuuwqpi` / `agenda.melosmile.com`)**: Tabla creada y activa con 4 alertas de revisión iniciales + 4 anotaciones en los `treatment_plan` de los pacientes asociados.
   - **Staging (`amhfdzfcmpastmlsosou` / `staging.melosmile.com`)**: Migración ejecutada con éxito y tabla `system_notifications` plenamente operativa.
   - **Local (Supabase Local)**: Archivo de migración registrado en `supabase/migrations/`; se aplicará automáticamente al iniciar el stack local (Colima/Docker) mediante `supabase db push` o `supabase start`.
3. **Frontend**:
   - Endpoint `/api/notifications` (GET / PATCH) y componente [notification-center.tsx](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/components/layout/notification-center.tsx) preparados para consumir y persistir alertas con links clicables.

---

## 🌐 Configuración de Entornos Vercel y Bases de Datos (Consolidado 10/09/2026)

- **Producción (`agenda.melosmile.com` / Proyecto Vercel: `melosmile-production`)**:
  - Base de Datos Supabase: `xylqytpudbdcsbuuwqpi` (`melosmile-production`).
  - Contenido: 67 pacientes reales, 119 citas, 88 documentos/fotos, 53 tratamientos/facturación, 4 alertas de campanita.
  - Variables Vercel: 23 únicas con target `["production", "preview", "development"]` y `type: "encrypted"`.
  - URLs n8n migradas a v2 oficial (`https://n8nv2.mumaweb.com`), añadidas `N8N_API_KEY`, `N8N_VECTORIZER_WEBHOOK_URL` y `VPS_DOCS_BASE_PATH`.
- **Staging (`staging.melosmile.com` / Proyecto Vercel: `melosmile-staging`)**:
  - Base de Datos Supabase: `amhfdzfcmpastmlsosou` (`melosmile_db`).
  - Contenido: Sandbox de pruebas limpio (solo ficha `Munir Mauel Callaos Cardama PAC-001`).
  - Variables Vercel: 23 únicas con target unificado y `type: "encrypted"`.
  - Añadidas: `AUTH_USERNAME` y `AUTH_PASSWORD`.
  - Root Directory del proyecto corregido a `frontend` (monorepo) vía API (`prj_qP5or4gNukJS9w8PTXeiL5vHI02t`).

> ⚠️ **Comportamiento Vercel `type: sensitive`**: Las variables recreadas por CLI vía pipe no-interactivo se guardan como `sensitive` y `vercel env pull` devuelve `""` aunque el valor real esté presente. No usar `pull` como método de verificación para estas; usar `vercel env ls` (tipo) o comprobación en runtime.
>
> ✅ **Verificación en vivo (10/09/2026)**: `https://agenda.melosmile.com/` validada en navegador con panel interactivo y badge `Odoo API: Connected` en verde.

---

## 🏷️ Normalización 1 a 1 de Pacientes y Etiquetas Notion (`patient_tags`) (2026-09-09)

1. **Población y Normalización de Etiquetas (`patient_tags`)**:
   - Se crearon y asignaron 13 etiquetas en producción basadas en el contacto de Notion:
     - **`Henryschein` (8 pacientes)**: `PAC-027` (Laura Romero), `PAC-025` (Francisco Javier Leal Rey), `PAC-024` (Begoña Fernández HS), `PAC-019` (Candela Fernández HS), `PAC-018` (Diego Martínez HS), `PAC-011` (Raquel Calviches), `PAC-004` (Sara Rubio), `PAC-005` (Gabriel Cañizales Rubio).
     - **`Familiar` (4 pacientes)**: `PAC-001` (Munir Callaos), `PAC-035` (Oscar Melo), `PAC-028` (Claire Ulmer), `PAC-022` (Kamila Hultzsch).
     - **`Referido` (1 paciente)**: `PAC-020` (Ainur Kozhabek, referida de Claire).
2. **Sincronización de Teléfonos y Sanitización Unicode**:
   - 11 números de teléfono recuperados de Notion e insertados en producción (Carlos Pujol, Ángel Da Silva, Carlos Moreno, Emma Mora, Richard Enciso, Estefania Maccanin, Claire Ulmer, Javier Alberto Rosales, Francisco Javier Leal Rey, Ricardo De Freitas, Diego Martínez García).
   - Sanitizados caracteres invisibles UTF-8 (`\u202A`, `\u202C`).
3. **Estado de Tratamiento / Altas**:
   - Sincronizados 8 pacientes a `in_treatment = false` reflejando su estado de Alta médica en Notion.
4. **Corrección Frontend ([patients/page.tsx](file:///Users/munircallaos/Antigravity%20Projects/melosmile/frontend/src/app/(dashboard)/patients/page.tsx))**:
   - Sede/Clínica primaria ahora se consulta desde `patient_clinics` (relación `clinics(id, name)`), manteniendo citas como fallback secundario. Esto resuelve que pacientes dados de alta o sin citas (como Carlos Pujol) no mostrasen su sede asignada.
   - Corregido el orden invertido de columnas en vista tabla (`Clínica / Sede` vs `DNI / NIE`).
   - Añadidos textos de fallback claros (`Sin teléfono`, `Sin email`, `Sin DNI`).
   - Desplegado y verificado en producción `https://agenda.melosmile.com/patients`.

---

## 📲 Despacho de Recordatorios y Mensajería Directa a Pacientes (10/09/2026)

1. **Gestión Completa de Recordatorios en Ficha (`/patients/[id]`)**:
   - Soporte para edición completa (modal `edit-reminder-modal.tsx`), cambio de plataforma de envío (WhatsApp, Telegram, Email, SMS), actualización de fecha/hora programada y edición del mensaje.
   - Eliminación in-app con confirmación modal (`DELETE /api/reminders`).
   - Saneamiento de tokens CSS en modo oscuro (`globals.css`, `input.tsx`, `textarea.tsx`).
2. **Despachador n8n v2 (`[MELOSMILE] Reminders Dispatcher`)**:
   - Workflow `OqOwzzat6rh0R1Jr` en `https://n8nv2.mumaweb.com/webhook/melosmile-reminders-dispatcher`.
   - Conexión con Bot Telegram de Melosmile (`7539054739:AAH...`).
   - Saneado `send-now/route.ts` para capturar errores reales e insertar eventos en `reminder_events`.
3. **Arquitectura para Envío Directo al Teléfono del Paciente (Sin Bots)**:
   - Los bots de Telegram requieren `chat_id` numérico y que el paciente interactúe previamente (`/start`).
   - Para enviar mensajes directos como clínica sin exigir que el paciente use bots:
     - **Telegram MTProto (GramJS/Telethon)**: Conectar una sesión oficial con `api_id` y `api_hash` de la línea telefónica de la clínica para enviar directamente al número del paciente (+34...).
     - **WhatsApp Business API (Cloud API)**: Envío directo de plantillas de recordatorio al número de WhatsApp del paciente.
   - Tarea agendada en Notion para 2026-09-11 bajo el proyecto *Sistema Melosmile*.
