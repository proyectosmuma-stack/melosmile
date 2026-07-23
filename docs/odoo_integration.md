# Documentación de Integración con Odoo ERP — Melosmile

Este documento explica la integración bidireccional entre la plataforma **Melosmile** (Next.js / Supabase) y **Odoo ERP**.

---

## 1. Configuración de Variables de Entorno

En el archivo `frontend/.env.local` se deben definir los siguientes valores:

```env
ODOO_URL=https://melosmile.odoo.com
ODOO_DB=melosmile
ODOO_USER=gestion@melosmile.com
ODOO_PASSWORD=@oslyMelo1983
ODOO_API_KEY=6807cede082f06fc522f840c71040c0a30d68d40
```

---

## 2. Cliente de Conexión (`src/lib/odoo/client.ts`)

La plataforma utiliza el protocolo **JSON-RPC** nativo de Odoo para comunicarse con los endpoints `/web/session/authenticate` y `/web/dataset/call_kw`.

### Funciones Principales

1. `getOdooProducts()`
   - Consulta el modelo `product.template`.
   - Filtra productos donde `type = 'service'` y `active = true`.
   - Devuelve la lista de tratamientos/servicios configurados en Odoo.

2. `upsertOdooPartner(patient)`
   - Consulta el modelo `res.partner`.
   - Busca por NIF/CIF (`vat`) para evitar duplicados.
   - Si existe, actualiza los datos fiscales (`write`). Si no existe, crea un nuevo contacto (`create`).
   - Retorna el ID del contacto en Odoo (`res.partner.id`).

3. `createOdooInvoice(params)`
   - Crea un registro en el modelo `account.move` de tipo `out_invoice` (factura de cliente).
   - Asocia el `partner_id` del paciente.
   - Agrega las líneas de factura (`invoice_line_ids`) con el nombre del tratamiento, cantidad y precio.
   - Retorna el ID de la factura borrador generada.

4. `searchProductByNameOrCode(name, code)`
   - Busca en el modelo `product.template` un servicio existente por su nombre o su referencia interna (`default_code`).

5. `createProductTemplate(data)`
   - Crea un nuevo servicio (`type = 'service'`) en `product.template` con nombre, precio base y código.

6. `getOdooPricelists()`
   - Consulta las tarifas activas (`product.pricelist`) registradas en Odoo para permitir asociarlas a las clínicas.

7. `updatePricelistItem(pricelistId, productTmplId, fixedPrice)`
   - Busca si ya existe una regla fija (`product.pricelist.item`) para esa tarifa y producto.
   - Si existe, la actualiza (`write`). Si no existe, la crea (`create`).

---

## 3. Endpoints API en Next.js

### `GET /api/odoo/products`
Retorna el catálogo actualizado de tratamientos desde Odoo.

**Respuesta de ejemplo:**
```json
{
  "success": true,
  "data": [
    { "id": 12, "name": "Ortodoncia Invisible - Alineador", "list_price": 1500, "default_code": "ORT-01" }
  ]
}
```

### `POST /api/odoo/invoice`
Recibe los datos del paciente y el registro de pago, ejecuta el `upsert` en Odoo y vincula los IDs en Supabase (`odoo_partner_id`, `odoo_invoice_id`).

**Body de petición:**
```json
{
  "patientId": "uuid-del-paciente",
  "billingRecordId": "uuid-del-registro-de-pago",
  "patientDetails": {
    "firstName": "Munir",
    "lastName": "Callaos",
    "historiaId": "PAC-001",
    "nifCif": "12345678A",
    "billingName": "Munir Callaos",
    "billingAddress": "Calle Mayor 1",
    "billingCity": "Madrid",
    "billingPostalCode": "28001",
    "email": "paciente@email.com",
    "phone": "+34600000000"
  },
  "treatmentName": "Tratamiento de Alineadores",
  "price": 1500.00
}
```

### `GET /api/odoo/pricelists`
Retorna las tarifas (pricelists) configuradas en Odoo para seleccionarlas en las clínicas.

### `POST /api/treatments/sync`
Recibe los datos de un tratamiento y sus precios específicos por clínica.
- Busca o crea el producto equivalente en Odoo (`product.template`).
- Inserta/actualiza el tratamiento en Supabase.
- Sincroniza las reglas de tarifa (`product.pricelist.item`) en Odoo asociando el ID de tarifa de cada clínica.

---

## 4. Esquema de Base de Datos Relacionado (Supabase)

Campos agregados en la tabla `patients`:
- `odoo_partner_id` (integer): ID del contacto equivalente en Odoo.
- `nif_cif` (text): NIF/CIF fiscal.
- `billing_name`, `billing_address`, `billing_city`, `billing_postal_code`, `billing_country`: Datos de facturación.

Campos agregados en la tabla `billing_records`:
- `odoo_invoice_id` (integer): ID del comprobante en Odoo.
- `odoo_invoice_number` (text): Número de factura emitido (ej. `INV/2026/0001`).

Campos agregados en la tabla `clinics`:
- `odoo_pricelist_id` (integer): ID de la lista de precios / tarifa correspondiente en Odoo.

Campos agregados en la tabla `treatments`:
- `odoo_product_id` (integer): ID del variant en Odoo (`product.product`).
- `odoo_product_tmpl_id` (integer): ID de la plantilla en Odoo (`product.template`).

Campos agregados en la tabla `treatment_clinic_prices`:
- `odoo_pricelist_item_id` (integer): ID del elemento de tarifa (`product.pricelist.item`) en Odoo.


---

## 5. Facturación Multi-Cobro Seleccionable (Desde Ficha Paciente)

### Flujo de Facturación Agrupada

El endpoint `POST /api/odoo/invoice` fue extendido para soportar **múltiples cobros en una sola factura**. El body acepta tanto el formato de factura única (legacy) como el nuevo formato de ítems múltiples:

**Body para facturación multi-cobro (nuevo):**
```json
{
  "patientId": "uuid-del-paciente",
  "items": [
    { "id": "uuid-billing-record-1", "name": "Ortodoncia Control 1", "price": 120.00 },
    { "id": "uuid-billing-record-2", "name": "Ortodoncia Control 2", "price": 120.00 }
  ],
  "patientDetails": {
    "firstName": "Francisco",
    "lastName": "Leal Rey",
    "historiaId": "PAC-045",
    "nifCif": "12345678A",
    "billingName": "Francisco Leal Rey",
    "billingAddress": "Calle Mayor 1",
    "billingCity": "Madrid",
    "billingPostalCode": "28001",
    "email": "paciente@email.com",
    "phone": "+34600000000"
  }
}
```

**Respuesta:**
```json
{
  "success": true,
  "invoiceId": 214,
  "invoiceNumber": "INV/2026/0214"
}
```

### Post-Facturación: Actualización en Supabase

Tras recibir la respuesta de Odoo, el endpoint actualiza en `billing_records` todos los cobros incluidos en la factura:
- `odoo_invoice_id` → ID numérico de Odoo
- `odoo_invoice_number` → Número de factura (ej. `INV/2026/0214`)
- `status` → `Facturado Odoo`

Esto provoca que, en la próxima carga de la ficha del paciente, los cobros facturados muestren el badge `Facturada (INV/2026/0214)` y sus checkboxes aparezcan deshabilitados.

---

## 6. Visibilidad para el Agente IA (`/api/ai-context`)

El endpoint `/api/ai-context` incluye ahora el desglose de cobros agrupados por estado de facturación:

```json
{
  "facturacion": {
    "facturados_odoo": [
      {
        "id": "uuid",
        "motivo": "Ortodoncia Control 1",
        "importe": 120.00,
        "numero_factura": "INV/2026/0214",
        "fecha": "2026-01-20"
      }
    ],
    "por_facturar": [
      {
        "id": "uuid",
        "motivo": "Ortodoncia Control 3",
        "importe": 120.00,
        "fecha": "2026-03-17"
      }
    ]
  }
}
```

Esto permite al **Agente IA** (n8n + Gemini) responder preguntas del tipo:
- *"¿Qué cobros de Francisco están pendientes de facturar?"*
- *"¿Cuánto se ha facturado en Odoo este trimestre?"*
- *"¿Qué pagos hay que incluir en la próxima factura?"*
