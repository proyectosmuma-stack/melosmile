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

---

## 4. Esquema de Base de Datos Relacionado (Supabase)

Campos agregados en la tabla `patients`:
- `odoo_partner_id` (integer): ID del contacto equivalente en Odoo.
- `nif_cif` (text): NIF/CIF fiscal.
- `billing_name`, `billing_address`, `billing_city`, `billing_postal_code`, `billing_country`: Datos de facturación.

Campos agregados en la tabla `billing_records`:
- `odoo_invoice_id` (integer): ID del comprobante en Odoo.
- `odoo_invoice_number` (text): Número de factura emitido (ej. `INV/2026/0001`).
