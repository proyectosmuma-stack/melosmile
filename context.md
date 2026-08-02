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

## 🌐 Infraestructura de Entornos

> **Arquitectura de 3 capas**: `localhost` (desarrollo) → `develop` (staging) → `main` (producción)

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
| **Sincronizar datos** | `npm --prefix frontend run db:sync` |

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

### 🟡 ENTORNO STAGING — Rama `develop` (Preview Vercel)

| Servicio | URL / Valor |
|---|---|
| **Rama Git** | `develop` |
| **Vercel Entorno** | `Preview` |
| **App Web** | Deploy automático Vercel (URL dinámica por commit) |
| **Supabase Staging** | `https://amhfdzfcmpastmlsosou.supabase.co` |
| **n8n (dev)** | `https://n8n.mumaweb.com` |
| **Fichero env** | `frontend/.env.remote` |
| **Sincronizar datos** | `npm --prefix frontend run db:sync` |

**Variables Vercel Preview (`develop`):**
```env
NEXT_PUBLIC_SUPABASE_URL=https://amhfdzfcmpastmlsosou.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_kN-3hlqUxOni9onF1CDmhg_03EOCXG6
SUPABASE_SERVICE_ROLE_KEY=eyJ...ref:amhfdzfcmpastmlsosou...service_role
N8N_WEBHOOK_BASE_URL=https://n8n.mumaweb.com
N8N_WEBHOOK_URL=https://n8n.mumaweb.com/webhook/document-cleaner
NEXT_PUBLIC_APP_URL=https://melosmile-develop.vercel.app
ODOO_URL=https://melosmile.odoo.com / ODOO_DB=melosmile / ODOO_USER=gestion@melosmile.com
```

---

### 🟢 ENTORNO PRODUCCIÓN — Rama `main` → `agenda.melosmile.com`

| Servicio | URL / Valor |
|---|---|
| **Rama Git** | `main` |
| **Vercel Entorno** | `Production` |
| **App Web** | `https://agenda.melosmile.com` |
| **Supabase Producción** | `https://xylqytpudbdcsbuuwqpi.supabase.co` |
| **Org Supabase** | `melosmile` → Proyecto `melosmile-production` |
| **n8n (prod)** | `https://n8nv2.mumaweb.com` |
| **API Key n8n prod** | `Antigravity-melosmile` (JWT en `mcp_config.json`) |
| **Fichero env** | Variables en Vercel `Production` (encriptadas) |

**Variables Vercel Production (`main`):**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xylqytpudbdcsbuuwqpi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<key producción melosmile org>
SUPABASE_SERVICE_ROLE_KEY=<service role producción>
N8N_WEBHOOK_BASE_URL=https://n8nv2.mumaweb.com
N8N_WEBHOOK_URL=https://n8nv2.mumaweb.com/webhook/document-cleaner
NEXT_PUBLIC_APP_URL=https://agenda.melosmile.com
ODOO_URL=https://melosmile.odoo.com / ODOO_DB=melosmile / ODOO_USER=gestion@melosmile.com
AUTH_USERNAME=clinica / AUTH_PASSWORD=melosmile2024
```

---

### 🤖 n8n — Flujos por Entorno

| Flujo | ID Dev (`n8n.mumaweb.com`) | ID Prod (`n8nv2.mumaweb.com`) |
|---|---|---|
| `[MELOSMILE] AI Dispatcher` | `OG4Yy4N7qALXojTa` (aprox) | `QgNoVFr9TBXGbdOl` |
| `[MELOSMILE] Sub-Agent: Agendamiento` | dev | `E59OoSRNJ4skt43W` |
| `[MELOSMILE] Sub-Agent: Clinico` | dev | `cQQGecziVfareNtI` |
| `[MELOSMILE] Sub-Agent: Contabilidad` | dev | `4Z7PdsGK2wAIi2iE` |
| `[MELOSMILE] Sub-Agent: General` | dev | `9scMTKJwP7TKFSJV` |
| `[MELOSMILE] Agent Document Cleaner` | dev | `IrLOC3fSQZCxvvBz` |

> Todos los flujos de producción tienen tag `Melosmile` y apuntan a `https://agenda.melosmile.com`.

---

### 🖥️ VPS IONOS — Almacenamiento de Documentos y Fotos por FTP

| Parámetro | Valor |
|---|---|
| **Host FTP/SSH** | `94.143.139.120` (`melosmile.com`) |
| **Usuario FTP** | `u60945363` |
| **Puerto FTP** | `21` (FTP pasivo con librería `basic-ftp`) |
| **Contraseña** | `Mum@sly1983` (usar `VPS_SSH_PASSWORD` en env) |
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
VPS_SSH_PASSWORD=Mum@sly1983
VPS_DOMAIN_FOLDER=melosmile.com
```

✅ **Compatibilidad**: Funciona tanto en desarrollo local (`localhost:3028`) como en `develop` (staging) y `main` (producción Vercel Serverless), ya que la conexión FTP se establece de forma remota por red.


---

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
- **Entornos & Redundancia**: Dual MCP (Supabase Cloud + Supabase Local en `127.0.0.1:54321`), Sincronización bidireccional automática `npm run db:sync`, Guard de Conexión IA en local (`ai-offline-guard.ts`), y Configuración Centralizada de Entorno (`src/config/env.ts`, estilo `wp-config.php`).
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

## 📁 Estructura del Código

```
melosmile/
├── Walkthrough.md                   # Registro de cambios y pruebas maestro (solo develop)
├── roadmap.md                       # Estado de fases y próximos desarrollos (solo develop)
├── datos-prueba/
│   └── datos prueba.xlsx            # Archivo Excel de prueba (Mayo 2026, Clínica Daniel Bustamante)
├── frontend/
    └── src/
        ├── app/
        │   ├── api/
        │   │   ├── billing/
        │   │   │   ├── sessions/route.ts        # GET/POST Sesiones contables por clínica/mes
        │   │   │   ├── sessions/[id]/route.ts   # GET/PATCH/DELETE Detalle, edición inline y recálculo
        │   │   │   ├── sessions/[id]/approve/route.ts # POST Aprobación contable con validación de errores
        │   │   │   ├── extract/route.ts         # POST Extracción IA y Excel con auto-alta secuencial (PAC-00X), asignación Dra. Osly Melo, treatment_id en appointments y sugerencia de lab
        │   │   │   └── report/[id]/route.ts     # GET Informe HTML imprimible/PDF en 6 secciones ALBACETE
        │   └── (dashboard)/
        │       ├── appointments/[id]/page.tsx   # Ficha de Cita con soporte para procedimientos en JSON y cadenas de texto
        │       └── billing/
        │           ├── page.tsx                 # Hub Contable: Grid multiclínica × 12 meses y KPIs
        │           ├── new/page.tsx             # Formulario de alta y extracción multimodal (IA y Excel)
        │           └── [id]/page.tsx            # Editor workspace a ancho completo con dropdowns para Paciente, Tratamiento, Equipo Lab (sugerencias destacadas), columnas % Dr y desglose total
        └── lib/
            └── billing/
                └── calculator.ts                # Motor de cálculo financiero, TREATMENT_LAB_SUGGESTIONS y razonamiento del catálogo de tratamientos de la BD

---

## 📅 Novedades: Planes de Tratamiento, Notificaciones Permanentes y Correcciones de Agenda
Se ha ampliado la plataforma con las siguientes capacidades y mejoras:
- **API Backend de Planes de Tratamiento (`/api/treatment-plans`)**: Solucionado el bloqueo de Row Level Security (RLS) en la tabla `treatment_plans` sustituyendo las consultas directas del navegador por un endpoint server-side con `SERVICE_ROLE_KEY` para lectura (`GET`), guardado/edición (`POST`) y eliminación (`DELETE`).
- **Eliminar Planes de Tratamiento**: Opción de borrado disponible tanto desde la tarjeta del plan como dentro del modal de edición de la ficha del paciente.
- **Sincronización en Tiempo Real de la Campana de Notificaciones**: Las alertas de revisión de cuotas ($\le 1$ cuota pendiente) se emiten dinámicamente mediante el evento `melosmile_notifications_updated`, reflejándose de forma permanente en la campana de la cabecera y en el banner de la ficha mientras el plan se mantenga `activo`.
- **Limpieza de Notificaciones de Demostración**: Eliminación del dato ficticio pre-configurado en el centro de notificaciones (`Ingesta Completada...`).
- **Seguimiento Híbrido y Multi-Plan Activo**: Soporte para planes independientes de Ortodoncia y Miofuncional en un mismo paciente, contabilizando citas no canceladas + cuotas pagadas manualmente.
- **Fix KPI "Citas para Hoy" en Agenda**: Corrección del cálculo de la fecha local (`YYYY-MM-DD`) y exclusión de citas canceladas en la pantalla principal (`/`), mostrando la cifra real (2 citas) en lugar de recuentos erróneos de 31.
- **Fix Enlace "Ver Paciente" en Drawer del Calendario**: Inclusión explícita de `id` y `historia_id` en las consultas de `calendar-view.tsx` y resolución de rutas en `appointment-detail-drawer.tsx`, habilitando la navegación directa a la ficha clínica del paciente.
- **Auditoría Completa de Producción & Seguridad**:
  - Eliminadas todas las credenciales hardcodeadas (JWTs fallback de Supabase) en las API routes.
  - Credenciales de inicio de sesión migradas a `process.env.AUTH_USERNAME` y `process.env.AUTH_PASSWORD`.
  - Reemplazadas llamadas internas estáticas `http://localhost:3028` en `document-cleaner` y `logout` por `INTERNAL_BASE_URL` dinámico compatible con Vercel serverless.
  - Corregido bug de hoisting de `toTitleCase` en `create/route.ts`.
  - Servidores server-side actualizados a `supabaseAdmin` para evitar bloqueos RLS.
  - Build de Next.js verificado y compilado al 100% sin errores de TypeScript.
- **Configuración de OpenCode a 22K Tokens & Habilitación de MCPs**:
  - Fijado el presupuesto de contexto a **22.528 Tokens (22K)** en Ollama y `~/.config/opencode/opencode.jsonc` para eliminar cuellos de botella y congelamientos.
  - Corregida la activación de herramientas (`"tools": true`) y la clave de límite de salida (`"output": 4096`) para `deepseek-coder-v2:lite`, `qwen2.5-coder:14b`, `gemma4:latest` y `gemma2:27b`.
  - Enlazados los 4 servidores MCP en OpenCode (`supabase`, `n8n`, `notion`, `github`).
  - Creada suite de benchmarking y el manual oficial global de equipos `MANUAL_EQUIPOS_OPENCODE.md` para probar los agentes Mumabot y SecBot en OpenCode IDE.

