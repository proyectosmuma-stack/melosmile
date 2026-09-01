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

---

## 🗄️ Migración BD Aplicada
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
- Ejecutado via `supabase db reset` ✅
- Columnas verificadas en Supabase Local ✅

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
2. Test E2E completo de los 5 flujos (incluyendo auto-factura Odoo)
3. Aplicar migración en Supabase Cloud (staging/prod)
4. Verificar sync Odoo con credenciales reales
5. **Opcional**: Botón "Generar Factura Odoo" en tabla de facturación para cobros status "Pendiente" (actualmente solo desde modal)