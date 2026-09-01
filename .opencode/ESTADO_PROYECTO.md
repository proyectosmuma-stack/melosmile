# Estado del Proyecto Melosmile - Sesión 2026-09-01

## 🎯 Objetivo Actual
Implementar 4 mejoras en el sistema de facturación y datos de paciente + **Auto-generación de factura Odoo al registrar pago**:

1. **Guardar observaciones en pagos** (bug fix) ✅
2. **Modo "Modificar Pago"** con bloqueo si ya hay factura Odoo ✅
3. **Unificar Contacto + Facturación** con checkbox "Datos diferentes" ✅
4. **Sync Odoo automático** al cambiar datos de facturación ✅
5. **✅ NUEVO: Auto-generar factura Odoo** al registrar pago con status "Pagado"/"Aconto"

---

## ✅ Completado

### Tarea 1: Observaciones en pagos
- **Archivo**: `frontend/src/components/billing/payment-registration-modal.tsx` (línea 115)
- **Cambio**: `notes: notes || null` añadido al payload INSERT/UPDATE

### Tarea 2: Modo edición de pago
- **Archivos**: 
  - `frontend/src/components/billing/payment-registration-modal.tsx` (+35 líneas)
  - `frontend/src/app/(dashboard)/patients/[id]/page.tsx` (+15 líneas)
- **Implementado**:
  - Prop `editingRecord?: BillingRecord` en modal
  - Título "Modificar Registro de Pago", botón "Modificar Pago"
  - **Bloqueo total** si `odoo_invoice_id` existe O `status === "Facturado Odoo"`
  - Botón "Modificar" en tabla facturación (solo si no facturado)
  - UPDATE en BD en vez de INSERT

### Tarea 3: Unificación Contacto + Facturación
- **Archivo**: `frontend/src/app/(dashboard)/patients/[id]/edit/page.tsx` (refactor completo)
- **Implementado**:
  - **Nuevos campos contacto**: `address_2`, `postal_code`, `city`, `province`, `country`
  - **Checkbox** "Los datos de facturación son diferentes a los de contacto"
  - **Desmarcado (default)**: Sección facturación oculta, autollenado desde contacto:
    - `billing_name` = nombre + apellidos
    - `nif_cif` = DNI/NIE
    - `billing_address` = dirección contacto
    - `billing_address_2`, `billing_city`, `billing_postal_code`, `billing_province`, `billing_country` = campos contacto
  - **Marcado**: Sección facturación visible (animación slide), campos editables
  - Al guardar: si checkbox desmarcado → sincroniza facturación = contacto

### Tarea 4: Sync Odoo automático
- **Archivos**: `frontend/src/app/(dashboard)/patients/[id]/edit/page.tsx` + `frontend/src/lib/odoo/client.ts`
- **Implementado**:
  - Captura valores facturación ANTES de update
  - Compara DESPUÉS de update exitoso en Supabase
  - Si cambió algún campo facturación → llama `upsertOdooPartner()` automático
  - Error Odoo no rompe guardado: `alert` de aviso

### Tarea 5: **Auto-generación de factura Odoo al registrar pago** ✅ NUEVO
- **Archivos**:
  - `frontend/src/components/billing/payment-registration-modal.tsx` (refactor: +90 líneas, lógica completa)
  - `frontend/src/app/(dashboard)/patients/[id]/page.tsx` (pasa `patientDetails` al modal)
- **Implementado**:
  - Tras guardar pago (INSERT/UPDATE en `billing_records`), si `status === "Pagado" || status === "Aconto"` Y no tiene `odoo_invoice_id` → llama `POST /api/odoo/invoice`
  - Payload incluye: `patientId`, `items[]` (id, name, price), `patientDetails` (NIF/CIF, dirección facturación, historiaId, billingName separado), `billingRecordId`
  - Endpoint `/api/odoo/invoice` (ya existía) hace: upsert partner → crea factura → confirma → registra pago → actualiza Supabase con `odoo_invoice_id`, `odoo_invoice_number`, status "Facturado Odoo"
  - **Modo nuevo**: usa `savedRecord.id` (recién insertado via `.select().single()`)
  - **Modo edición**: usa `currentBillingRecord.id` (existente)
  - **Bloqueo**: `isBlocked` impide modificar/facturar si ya tiene factura Odoo
  - **Error handling**: Fallo Odoo no rompe guardado en Supabase, solo `alert` de aviso
  - **Compatible**: `patientDetails` opcional → modal funciona en página de citas sin datos fiscales
  - **Tipos**: `PatientDetails` incluye `billing_name` opcional para nombre fiscal distinto al de contacto

### Tarea 6: **Aislamiento de Contexto AI (MCP Local)** ✅ NUEVO
- **Archivos**:
  - `~/.config/opencode/mcp/mcp-ollama-local/src/index.ts` (Nuevo Servidor Node.js)
  - `~/.config/opencode/opencode.json` (Inyección de MCP)
- **Implementado**:
  - Detectado bug "*Context Bleeding*" en OpenCode 1.18.25 (los subagentes nativos heredan `AGENTS.md` inyectado por el orquestador global).
  - Diseñado y deplegado un **Servidor MCP dedicado** localmente para encapsular el acceso a Ollama.
  - Expuesta herramienta `resumir_log` que fragmenta logs largos (chunking) y responde sin tokens basura de contexto global.
  - Validación empírica: el timeout en Ollama expuso cómo el orquestador global tiene a `AGENTS.md` inyectado, probando definitivamente el beneficio de la arquitectura MCP.

---

## 🗄️ Migración BD Aplicada (Local + Staging + Producción)

```sql
-- Archivo: supabase/migrations/20260901000000_add_patient_billing_contact_fields.sql
ALTER TABLE patients ADD COLUMN IF NOT EXISTS address_2 TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS province TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'España';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS billing_same_as_contact BOOLEAN DEFAULT true;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS billing_address_2 TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS billing_province TEXT;
```

| Entorno | Proyecto | Estado |
|---------|----------|--------|
| **Local** | melosmile | ✅ `supabase db reset` |
| **Staging** | melosmile_db (`amhfdzfcmpastmlsosou`) | ✅ `supabase db push` |
| **Producción** | melosmile-production (`xylqytpudbdcsbuuwqpi`) | ✅ `supabase db push` |

- 25 migraciones sincronizadas (local = remote) ✅

---

## 🔧 Pendiente / Issues Conocidos

### TypeScript (no bloqueante para runtime)
- `scratch/odoo_invoice_methods.ts` - error de import (archivo temporal, ignorar)
- `page.tsx` línea 1800: `editingBillingRecord` puede ser `null` vs `undefined` - ajustar tipo en modal prop

### Build
```bash
cd frontend && npm run build
```
- **Compila OK** ✅ (salvo warnings de archivo scratch)

### Testing necesario
1. **Flujo pago**: Crear → Modificar → Verificar bloqueo si facturado
2. **Editar paciente**: Checkbox desmarcado → autollenado correcto
3. **Sync Odoo**: Cambiar datos facturación → verificar llamada a Odoo (requiere credenciales Odoo en `.env.local`)
4. **✅ NUEVO: Auto-factura**: Registrar pago "Pagado"/"Aconto" → verificar factura generada en Odoo y `odoo_invoice_id` guardado en Supabase

---

## 📁 Archivos Modificados en Esta Sesión

| Archivo | Tipo | Cambios |
|---------|------|---------|
| `frontend/src/components/billing/payment-registration-modal.tsx` | Feature | Modo edición, notes, bloqueo facturado, **auto-factura Odoo** |
| `frontend/src/app/(dashboard)/patients/[id]/page.tsx` | Feature | Botón Modificar en tabla, state editing, **pasa patientDetails al modal** |
| `frontend/src/app/(dashboard)/patients/[id]/edit/page.tsx` | Refactor | Campos nuevos, checkbox, UI unificada, sync Odoo |
| `supabase/migrations/20260901000000_add_patient_billing_contact_fields.sql` | Migration | 8 nuevas columnas en `patients` |

---

## ✅ Sync Notion (Ejecutivo) — Sesión 2026-09-01

Se sincronizaron las tareas del trabajo realizado en la **DB TAREAS de Muma** con el proyecto **"Sistema Melosmile"** (`3c3b6518-1657-813a-a38e-df2bb5ef5961`). Se crearon **7 tareas** (6 completadas + 1 pendiente):

| Tarea | Estado | Progreso | Eq. Ejecución | Page ID |
|---|---|---|---|---|
| Guardar observaciones en pagos (bug fix) | ✅ Completada | 100% | 🤖 IA | `3ceb6518-1657-8127-b40c-cf7c101aa0c9` |
| Modo "Modificar Pago" con bloqueo Odoo | ✅ Completada | 100% | 🤖 IA | `3ceb6518-1657-81dc-a947-c0872bf14d94` |
| Unificar Contacto + Facturación (checkbox) | ✅ Completada | 100% | 🤖 IA | `3ceb6518-1657-815e-9f47-eec898eb2354` |
| Sync Odoo automático al cambiar facturación | ✅ Completada | 100% | 🤖 IA | `3ceb6518-1657-81ae-a579-ef16422c5472` |
| Auto-generar factura Odoo al registrar pago | ✅ Completada | 100% | 🤖 IA | `3ceb6518-1657-8177-8437-efeec94c6032` |
| Migraciones BD facturación/contacto | ✅ Completada | 100% | 🤖 IA | `3ceb6518-1657-81d4-bb7d-c197e5b0cbd2` |
| Testing E2E + Deploy Vercel (auto-factura Odoo) | ⏳ Pendiente | — | 🤝 Mixto | `3ceb6518-1657-81de-aa7d-f9244a647e20` |

- Las 6 tareas completadas se verificaron post-escritura (existen físicamente en Notion).
- Las 15 tareas existentes previas del proyecto (backlog/consentimientos/RGPD) NO se modificaron: ninguna correspondía a este trabajo.

### Proyectos Notion vinculados a Melosmile
- **Sistema Melosmile** (backend): `3c3b6518-1657-813a-a38e-df2bb5ef5961`
- **Redes Melosmile** (marketing/RRSS): `2ffb6518-1657-80f9-a821-d046d6497b63`

---

## 🧠 Lección CRÍTICA guardada en RAG (crear tareas Notion vía router)

Al operar Notion con `notion-lean-updater.ts` (router `https://n8nv2.mumaweb.com/webhook/notion-query`):
1. **Usar SIEMPRE nombres de propiedades en ESPAÑOL** según `docs/architecture/N8N_NOTION_ROUTER_CONTRACT.md`:
   - `"Nombre de la Tarea"` (title), `"Estado"` (status), `"Fecha límite"` (date), `"Proyectos"` (relation), `"Equipo de Ejecución"` (select), `"Progreso"` (number), `"Nota"` (rich_text).
   - Los nombres en inglés (`title`, `status`, `project`...) NO coinciden y el router crea la página vacía o la descarta.
2. **`Progreso: 0` (number 0) rompe silenciosamente**: el router devuelve HTTP 200 sin `page_id` y NO crea la página. Usar `Progreso: 1` u omitirlo en tareas pendientes; `100` en completadas.
3. El valor de `select` "Equipo de Ejecución" admite: `🤖 Equipo IA`, `🤝 Equipo Mixto`, `👤 Equipo Humano`.

---

## 🚀 Para Continuar

```bash
# 1. Verificar servidor local
cd /Users/munircallaos/Antigravity\ Projects/melosmile/frontend
npm run dev  # puerto 3028

# 2. Verificar Supabase Local
supabase status  # Studio: http://127.0.0.1:54323

# 3. Test manual en http://localhost:3028/patients/[id]
```

---

## 📋 Próximos Pasos (si se retoma)
1. Corregir tipos TypeScript menores (null vs undefined en `editingRecord`)
2. Test E2E completo de los 5 flujos (incluyendo auto-factura Odoo) — tarea registrada en Notion `3ceb6518-1657-81de-aa7d-f9244a647e20`
3. **Deploy Vercel Staging** → validar auto-factura Odoo con credenciales reales
4. **Deploy Vercel Production** → validación final
5. **Opcional**: Botón "Generar Factura Odoo" en tabla de facturación para cobros status "Pendiente" (actualmente solo desde modal)