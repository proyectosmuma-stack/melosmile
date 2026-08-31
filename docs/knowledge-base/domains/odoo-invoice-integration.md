# Integración de Facturas Odoo – Campos y Comportamiento (v17)

**Fecha de creación:** 2026-08-27  
**Fuente:** Investigación web + conocimiento interno Odoo 17  
**Propósito:** Documentar todos los campos clave de la modelo `account.move` (facturas de cliente), cómo Odoo almacena los datos de los clientes y el comportamiento al actualizar información de facturación. Este documento está diseñado para ser consumido por los agentes de MumaBot y utilizado en futuras configuraciones de integración.

---

## 1. Modelo técnico

| Atributo | Valor |
|---|---|
| **Nombre técnico** | `_name = 'account.move'` |
| **Tipo de documento** | `move_type` – `out_invoice` (factura cliente), `out_refund` (nota de crédito), `in_invoice` (factura proveedor), `in_refund` (nota de crédito proveedor), `entry` (asiento manual) |
| **Estado de flujo** | `state` – `draft` (editable) → `posted` (confirmado, refleja en el mayor general) → `cancel` (anulado) |
| **Compañía** | `company_id` → `res.company` (multi-company) |
| **Divisa** | `currency_id` → `res.currency` (montos en divisa de la factura) |
| **Líneas** | One2many `invoice_line_ids` (`account.move.line`) – cada línea tiene `price_unit`, `quantity`, `tax_ids`, `discount`, etc.

---

## 2. Campos que capturan datos del cliente / facturación

| Campo (nombre técnico) | Tipo | Propósito / qué almacena |
|---|---|---|
| **`partner_id`** | `many2one` → `res.partner` | **Cliente principal** vinculado a la factura. Toda la datos a nivel de socio (nombre, contactos, direcciones predeterminadas) se lee de este registro. |
| **`partner_invoice_id`** | `many2one` → `res.partner` | **Dirección de facturación alternativa** para el mismo socio. Si está vacío, el sistema usa la dirección derivada de `partner_id`. |
| **`partner_shipping_id`** | `many2one` → `res.partner` | **Dirección de envío/entrega** (puede diferir de la de facturación). Si está vacío, se usa la dirección predeterminada de `partner_id` marcada “Shipping”. |
| **`invoice_date`** | `date` | Fecha impresa en la factura. Puede diferir de la fecha del movimiento por razones regulatorias. |
| **`invoice_date_due`** | `date` | **Fecha de vencimiento** del pago. Calculada desde `invoice_date` + `invoice_payment_term_id`, o ingresada manualmente. |
| **`invoice_payment_term_id`** | `many2one` → `account.payment.term` | Condiciones de pago (ej. “Net 30”, “Vencimiento al contado”). Impulsa el cálculo de la fecha de vencimiento y los reportes de envejecimiento. |
| **`fiscal_position_id`** | `many2one` → `account.fiscal.position` | **Posición fiscal**. Cambia qué impuestos aplican según el país del socio / compañía. Esencial para facturación IVA compatible (EU, LatAm). |
| **`currency_id`** | `many2one` → `res.currency` | Divisa en la que se expresan todos los montos monetarios de la factura. La divisa de la compañía se usa solo para reportes. |
| **`amount_untaxed`** | `monetary` | **Subtotal antes de impuestos** = Σ (precio unidad × cantidad). |
| **`amount_tax`** | `monetary` | **Importe total de impuestos** calculado a partir de las líneas y la posición fiscal. |
| **`amount_total`** | `monetary` | **Total general** = `amount_untaxed` + `amount_tax`. El importe que el cliente debe pagar. |
| **`journal_id`** | `many2one` → `account.journal` | Diario donde se registra el asiento. Define la secuencia y las cuentas por defecto. |
| **`ref`** | `char` | Referencia externa / número de factura proveedor. Usado para conciliación de pagos. |
| **`invoice_origin`** | `char` | Referencia del documento origen (ej. número de orden de venta). Habilita trazabilidad orden → factura. |
| **`l10n_latam_document_type_id`** | `many2one` → `l10n_latam.document.type` *(módulo LatAm)* | **Tipo de documento** para facturación electrónica en Latinoamérica (Factura, Nota de Crédito, etc.). Requerido para reporte tributario en muchos países LatAm. |
| **`narration` / `notes`** | `text` | **Memo interno** – no se imprime en la factura visible al cliente (aparece en el asiento contable). |
| **`move_type`** | `selection` | Tipo de documento – `out_invoice` para facturas de cliente normales. |

**Nota importante:** Todos los campos monetarios (`amount_*`) se almacenan **en la divisa seleccionada por `currency_id`**.

---

## 3. Cómo Odoo almacena y usa los datos del cliente

| Aspecto | Detalle |
|---|---|
| **Enlace al socio** | `partner_id` es un `many2one` a `res.partner`. La factura **no duplica** los datos de dirección; solo referencia el registro del socio. Todos los campos de dirección (calle, ciudad, código postal, país, estado) viven en `res.partner`. |
| **Dirección de facturación vs. envío** | • **Dirección de facturación** → derivada de `partner_id` (o `partner_invoice_id` si se establece). <br>• **Dirección de envío** → `partner_shipping_id`. Si está vacío, se usa la dirección predeterminada de `partner_id` marcada “Shipping”. |
| **Dirección en el momento de crear** | El modelo de PDF lee la dirección del socio **en el momento de generar el informe**, no se almacena permanentemente en el move. Por lo tanto, la factura siempre refleja la dirección **actual** del socio a menos que se haya seleccionado un `partner_invoice_id`/`partner_shipping_id` distinto. |
| **Socios duplicados** | Odoo **no impide** crear varios registros `res.partner` con el mismo nombre/e-mail. Cada uno es un ID distinto. El usuario debe seleccionar el correcto; los duplicados pueden generar facturas separadas para el mismo cliente. Limpieza se suele hacer mediante **Merge** (CRM → Socio → Merge) o actualizando el registro existente. |
| **Propagación de cambios de dirección** | **Las facturas ya publicadas NO se actualizan retroactivamente** cuando se edita la dirección del socio. La factura conserva la dirección que se resolvió en el momento de creación. Para reflejar la nueva dirección en una factura existente, hay que **recrear** la factura o editar manualmente `partner_invoice_id`/`partner_shipping_id` mientras la factura sigue en `draft`. |
| **Campos de contacto** | `partner_id` también guarda e-mail, teléfono, móvil – usados en el diseño de la factura y para el envío/PDF. |

---

## 4. Actualizar datos de facturación cuando cambia la información del paciente

| Situación | Efecto | Acción recomendada |
|---|---|---|
| **Contacto del socio (e-mail/teléfono) editado** | No impacta facturas publicadas; nuevas facturas usarán el contacto actualizado. | No se requiere acción para facturas antiguas. |
| **Dirección de facturación del socio editada (calle, ciudad, código postal, país)** | Las facturas publicadas **mantienen** la dirección vigente al momento de creación. El cambio aparece solo en futuras facturas. | Para actualizar una factura existente: <br>1. **Recrear** la factura con el socio actualizado, **o** <br>2. Editar manualmente `partner_invoice_id` apunte a un copia del socio con la nueva dirección **mientras la factura sigue en `draft`**, luego volver a publicar. |
| **Condiciones de pago o posición fiscal cambiadas en el socio** | No afectan facturas ya publicadas. | Crear una nueva factura o usar la herramienta de **mapping de posición fiscal** para ajustar impuestos en un nuevo documento. |
| **Cambiar `move_type` (ej. `out_invoice` → `out_refund`)** | Requiere un **reverso** (`button_draft` → `posted` → `cancel`) y luego una nueva factura de nota de crédito. | Usar el asistente **Reverse & Create Credit Note** (`action_invoice_plan`) o anular y crear un nuevo movimiento. |
| **Edición directa de `amount_untaxed`/`amount_tax`** en una factura publicada | **Bloqueado** – Odoo obliga a un reverso. | Si se necesita corregir una línea, crear una factura correctiva o un asiento de memo, luego conciliar. |

** conclusión:** Odoo **no actualiza retroactivamente** las facturas publicadas cuando cambian los datos del socio. El diseño preserva la integridad auditorial – se conserva el documento original o se crea uno nuevo reflejando la información actualizada.

---

## 5. Notas de localización (LatAm, EU, etc.)

| Localización | Campos / conceptos relevantes |
|---|---|
| **Latinoamérica (`l10n_latam`)** | • `l10n_latam_document_type_id` – obligatorio para facturación electrónica (Factura, Nota de Crédito, etc.). <br>• Impuestos adicionales impulsados por la posición fiscal. <br>• Suele requerir **timbrado electrónico** mediante un proveedor externo y secuencias de diario específicas. |
| **Unión Europea (VAT‑MOSS, Intrastat)** | • `fiscal_position_id` a menudo se mapea a posiciones “IVA UE”. <br>• `currency_id` debe configurarse correctamente para transacciones intra‑comunidad. <br>• Declaraciones Intrastat usan el país del `partner_id` y `invoice_date`. |
| **Oriente Medio / África** | Pueden requerir tipos de documento locales adicionales (factura fiscal, simplificada) agregados mediante registros `l10n_*_document.type` extra. |
| **General** | Todos los módulos de localización extienden `account.move` **sin alterar los campos principales** listados arriba. Añaden restricciones, vistas y campos computados, pero la estructura central se mantiene igual. |

---

## 6. Resumen rápido (cheat‑sheet)

```markdown
# account.move (Odoo v17)

- **_name** = `account.move`
- **move_type** ∈ {out_invoice, out_refund, in_invoice, in_refund, entry}
- **state** ∈ {draft, posted, cancel}
- **partner_id** → res.partner (facturación)
- **partner_invoice_id** → res.partner (dir. facturación alternativa)
- **partner_shipping_id** → res.partner (dirección de envío)
- **invoice_date** (date)
- **invoice_date_due** (date) – calculada desde `invoice_payment_term_id`
- **invoice_payment_term_id** → account.payment.term
- **fiscal_position_id** → account.fiscal.position (mapeo de impuestos)
- **currency_id** → res.currency
- **amount_untaxed** (monetary) – subtotal antes de impuesto
- **amount_tax** (monetary) – total impuesto
- **amount_total** (monetary) – total a pagar
- **journal_id** → account.journal
- **company_id** → res.company
- **l10n_latam_document_type_id** → l10n_latam.document.type (LatAm solo)
- **ref** (char) – referencia externa
- **invoice_origin** (char) – documento origen (número de SO)
- **line_ids / invoice_line_ids** – One2many de account.move.line
```

---

## 7. Patrón de integración – Desde tu sistema (ej. Melosmile) hacia Odoo

### 7.1. Crear / actualizar una factura de paciente

```python
# Pseudo‑código – adapta a tu stack (Python, Node, etc.)
import xmlrpc.client

# Conexión a Odoo (XML‑RPC / JSON‑RPC)
common = xmlrpc.client.ServerProxy('https://<instancia-odoo>/xmlrpc/2/common')
uid = common.authenticate('<db>', '<usuario>', '<password>', {})
api = xmlrpc.client.ServerProxy(f'https://<instancia-odoo>/xmlrpc/2/object')

def create_invoice(patient_data):
    """
    patient_data example:
    {
        "patient_id": "PAC-001",
        "name": "Munir Mauel Callaos Cardama",
        "email": "munir@example.com",
        "phone": "+549111234567",
        "billing_address": {
            "street": "Calle Falsa 123",
            "city": "Buenos Aires",
            "zip": "C1425AAA",
            "country": "Argentina",
        },
        "invoice_line": [   # lista de (product_id, quantity, price_unit)
            (1, 1, 50.00),
            (2, 2, 20.00)
        ],
        "payment_term": "Net 30",
        "fiscal_position": "Argentina",
    }
    """
    # 1️⃣ Resolver o crear el socio (res.partner)
    partner_id = resolve_or_create_partner(patient_data)   # many2one ID

    # 2️⃣ Resolver payment_term_id y fiscal_position_id por nombre
    payment_term_id = get_id_by_name('account.payment.term', patient_data["payment_term"])
    fiscal_pos_id   = get_id_by_name('account.fiscal.position', patient_data["fiscal_position"])

    # 3️⃣ Construir el diccionario de la factura (solo campos necesarios para out_invoice)
    invoice_vals = {
        'move_type': 'out_invoice',
        'partner_id': partner_id,
        'partner_invoice_id': partner_id,      # opcional – usar mismo si no hay dir. alternativa
        'partner_shipping_id': partner_id,     # opcional – ajustar si dirección de envío distinta
        'invoice_date': patient_data.get('invoice_date') or today(),
        'invoice_payment_term_id': payment_term_id,
        'fiscal_position_id': fiscal_pos_id,
        'currency_id': 1,                       # ID de la divisa por defecto de la compañía
        'invoice_line_ids': [(0, 0, {
            'product_id': pid,
            'quantity': qty,
            'price_unit': price,
            'tax_ids': [(6, 0, tax_ids)]   # many2many con registros de impuesto
        }) for pid, qty, price, tax_ids in patient_data["invoice_line"]],
        'ref': f"INV-{patient_data['patient_id']}",
        'invoice_origin': patient_data.get('source_doc'),  # ej. número de orden de venta
    }

    # 4️⃣ Crear la factura
    res = api.execute_kw(
        '<db>', uid, '<password>',
        'account.move', 'create', [invoice_vals]
    )
    # `res` es el ID nuevo de la factura (int)
    return res
```

### 7.2. Manejo de cambios de dirección del socio

| Escenario | Acción en código |
|---|---|
| **La dirección de facturación se actualiza en tu BD** | 1. **Actualizar el registro `res.partner`** (o crear uno nuevo). <br>2. **Las facturas ya publicadas en Odoo no cambian** – se conservan tal y como fueron creadas. <br>3. Las futuras facturas usarán automáticamente el nuevo socio/ID. <br>4. Si se necesita reflejar la nueva dirección en una factura existente, recrear la factura o editar `partner_invoice_id` mientras está en `draft`. |
| **Historial de versiones de dirección** | Mantener un `res.partner` por versión de dirección (ej. `Partner‑V1`, `Partner‑V2`) y referenciar el apropiado al crear cada factura. |

### 7.3. Actualizar una factura en estado `draft`

Si la factura aún está en `draft`, se pueden parchear campos concretos:

```python
def update_draft_invoice(invoice_id, updates):
    api.execute_kw(
        '<db>', uid, '<password>',
        'account.move', 'write', [invoice_id, updates]
    )
# Ejemplo:
update_draft_invoice(inv_id, {'partner_invoice_id': new_partner_id})
```

---

## 8. Comportamientos clave

| Comportamiento | Detalle |
|---|---|
| **Los datos del socio viven en `res.partner`** | Las facturas solo referencian el ID del socio; los campos de dirección se leen “en tiempo de generación” del PDF. |
| **Las facturas publicadas son inmutables** | Edición directa de campos está bloqueada; hay que reversar y re‑publicar o crear una nueva. |
| **La posición fiscal impulsa el cálculo de impuestos** | Cambiar `fiscal_position_id` en una **nueva** factura cambia los impuestos aplicados; no afecta documentos ya publicados. |
| **Divisa por factura** | Se establece `currency_id` al crear; los montos se guardan en esa divisa. |
| **Facturación electrónica LatAm** | Requiere `l10n_latam_document_type_id` y, a menudo, un servicio de timbrado externo; el campo es obligatorio en esos módulos. |
| **Estrategia de actualización** | • **Crear nueva factura** cuando cambian los datos de facturación (preserva el historial). <br>• **Actualizar el registro partner** para futuras facturas solo. <br>• **Edición manual** solo mientras la factura está en `draft`. |

---

## 9. Próximos pasos / qué puede necesitar

1. **Lógica de resolución de socios** – cómo identificar o crear el registro `res.partner` a partir de los datos del paciente (fusionar duplicados, establecer direcciones por defecto, etc.).
2. **Mapeo de líneas de factura internas** a `account.move.line` (IDs de producto, impuestos, precios).
3. **Método de integración** – API XML‑RPC/JSON‑RPC, API oficial de Odoo (JSONRPC), o importación CSV/Excel en lote.
4. **Manejo de localización** – si operan en país LatAm, asegurarse de que el módulo `l10n_latam` esté instalado y el `document_type` correcto esté configurado.
5. **Probar en instancia de sandbox** – crear unas cuantas facturas de prueba, modificar direcciones de socios y verificar que las facturas antiguas se mantienen unchanged mientras las nuevas reflejan la actualización.

---

## 10. Referencias cruzadas

- [Documentación oficial Odoo 17 – Customer Invoices](https://www.odoo.com/documentation/17.0/en/apps/finance/accounting/customer_invoices/overview.html)
- ADR “MumaBot Agent Team” (grafo codebase-memory)
- `~/.config/opencode/context.md` (memoria del sistema de agentes)
- Habilidades del equipo: `mumabot-env-writer` (gestión de .env y credenciales 100% offline), `mumabot-coder-local` (modificaciones locales con secretos), `mumabot-reviewer` (auditoría final).

---