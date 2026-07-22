/**
 * Odoo XML-RPC / JSON-RPC client for Next.js
 * Uses ODOO_URL, ODOO_DB, ODOO_API_KEY from env
 */

const ODOO_URL = process.env.ODOO_URL!;
const ODOO_DB = process.env.ODOO_DB!;
const ODOO_USER = process.env.ODOO_USER!;
const ODOO_API_KEY = process.env.ODOO_API_KEY!; // API key acts as password

let _uid: number | null = null;

async function odooCall(path: string, method: string, args: unknown[]) {
  const res = await fetch(`${ODOO_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      id: Date.now(),
      params: { db: ODOO_DB, method, args },
    }),
    cache: 'no-store',
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.data?.message || data.error.message);
  return data.result;
}

const ODOO_PASSWORD = process.env.ODOO_PASSWORD || process.env.ODOO_API_KEY!;

async function getUID(): Promise<number> {
  if (_uid) return _uid;
  let passToTry = process.env.ODOO_PASSWORD || ODOO_API_KEY;
  let result = await fetch(`${ODOO_URL}/web/session/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      id: 1,
      params: { db: ODOO_DB, login: ODOO_USER, password: passToTry },
    }),
    cache: 'no-store',
  });
  let data = await result.json();

  if (!data.result?.uid && ODOO_API_KEY) {
    result = await fetch(`${ODOO_URL}/web/session/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        id: 1,
        params: { db: ODOO_DB, login: ODOO_USER, password: ODOO_API_KEY },
      }),
      cache: 'no-store',
    });
    data = await result.json();
  }

  if (!data.result?.uid) throw new Error('Odoo authentication failed');
  _uid = data.result.uid;
  return _uid!;
}

async function odooExecute(model: string, method: string, args: unknown[], kwargs: Record<string, unknown> = {}) {
  const uid = await getUID();
  const res = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      id: Date.now(),
      params: {
        model,
        method,
        args,
        kwargs: { context: { lang: 'es_ES', tz: 'Europe/Madrid' }, ...kwargs },
      },
    }),
    cache: 'no-store',
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.data?.message || data.error.message);
  return data.result;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Search Odoo products (treatments catalog)
 */
export async function getOdooProducts() {
  return odooExecute('product.template', 'search_read', [
    [['active', '=', true], ['type', '=', 'service']],
  ], {
    fields: ['id', 'name', 'list_price', 'categ_id', 'default_code'],
    limit: 200,
  });
}

/**
 * Search for a product by name or default_code
 */
export async function searchProductByNameOrCode(name: string, code?: string) {
  const domain: unknown[] = ['|', ['name', 'ilike', name]];
  if (code) {
    domain.push(['default_code', '=', code]);
  } else {
    // If no code, we just search by name (domain needs 3 elements minimum usually if not using |)
    // Actually simpler: just search by name if code is missing
  }
  
  const searchDomain = code ? ['|', ['name', 'ilike', name], ['default_code', '=', code]] : [['name', 'ilike', name]];
  
  const results = await odooExecute('product.template', 'search_read', [
    searchDomain
  ], {
    fields: ['id', 'name', 'list_price', 'default_code'],
    limit: 1,
  });
  
  return results.length > 0 ? results[0] : null;
}

/**
 * Create a new product.template (Service) in Odoo
 */
export async function createProductTemplate(data: { name: string; list_price: number; default_code?: string }) {
  const vals: Record<string, unknown> = {
    name: data.name,
    list_price: data.list_price,
    type: 'service',
    purchase_ok: false,
    sale_ok: true,
  };
  if (data.default_code) vals.default_code = data.default_code;
  
  const id = await odooExecute('product.template', 'create', [vals]);
  return id as number;
}

/**
 * Get available pricelists in Odoo
 */
export async function getOdooPricelists() {
  return odooExecute('product.pricelist', 'search_read', [
    [['active', '=', true]]
  ], {
    fields: ['id', 'name', 'currency_id'],
    limit: 100,
  });
}

/**
 * Create or update a pricelist item (rule) for a specific product and pricelist
 */
export async function updatePricelistItem(pricelistId: number, productTmplId: number, fixedPrice: number) {
  // First, check if an item already exists for this exact pricelist and product
  const existing = await odooExecute('product.pricelist.item', 'search_read', [
    [
      ['pricelist_id', '=', pricelistId],
      ['product_tmpl_id', '=', productTmplId],
      ['compute_price', '=', 'fixed']
    ]
  ], {
    fields: ['id'],
    limit: 1,
  });

  if (existing.length > 0) {
    // Update existing rule
    await odooExecute('product.pricelist.item', 'write', [
      [existing[0].id],
      { fixed_price: fixedPrice }
    ]);
    return existing[0].id as number;
  } else {
    // Create new rule
    const id = await odooExecute('product.pricelist.item', 'create', [{
      pricelist_id: pricelistId,
      product_tmpl_id: productTmplId,
      applied_on: '1_product', // 1_product means Product Template
      compute_price: 'fixed',
      fixed_price: fixedPrice,
      min_quantity: 1,
    }]);
    return id as number;
  }
}

/**
 * Search or create a customer (res.partner) in Odoo from a patient record
 */
export async function upsertOdooPartner(patient: {
  full_name: string;
  nif_cif?: string;
  billing_name?: string;
  billing_address?: string;
  billing_city?: string;
  billing_postal_code?: string;
  email?: string;
  phone?: string;
}) {
  const name = patient.billing_name || patient.full_name;

  // Search by VAT/NIF first
  let existingIds: number[] = [];
  if (patient.nif_cif) {
    existingIds = await odooExecute('res.partner', 'search', [
      [['vat', '=', patient.nif_cif]],
    ]);
  }

  const vals: Record<string, unknown> = {
    name,
    vat: patient.nif_cif || false,
    street: patient.billing_address || false,
    city: patient.billing_city || false,
    zip: patient.billing_postal_code || false,
    country_id: 67, // Spain in Odoo
    email: patient.email || false,
    phone: patient.phone || false,
    customer_rank: 1,
    is_company: false,
    lang: 'es_ES',
  };

  if (existingIds.length > 0) {
    await odooExecute('res.partner', 'write', [existingIds, vals]);
    return existingIds[0];
  } else {
    return odooExecute('res.partner', 'create', [vals]);
  }
}

/**
 * Create a draft invoice in Odoo
 */
export async function createOdooInvoice(params: {
  partner_id: number;
  invoice_lines: Array<{
    name: string;
    quantity: number;
    price_unit: number;
    product_id?: number;
  }>;
  invoice_date?: string;
  ref?: string; // Melosmile historia_id or appointment ref
}) {
  const lines = params.invoice_lines.map((l) => ({
    name: l.name,
    quantity: l.quantity,
    price_unit: l.price_unit,
    ...(l.product_id ? { product_id: l.product_id } : {}),
  }));

  const invoiceId = await odooExecute('account.move', 'create', [{
    move_type: 'out_invoice',
    partner_id: params.partner_id,
    invoice_date: params.invoice_date || new Date().toISOString().split('T')[0],
    ref: params.ref || '',
    invoice_line_ids: lines.map((l) => [0, 0, l]),
  }]);

  return invoiceId as number;
}

/**
 * Get invoice details from Odoo
 */
export async function getOdooInvoice(invoiceId: number) {
  const results = await odooExecute('account.move', 'read', [[invoiceId]], {
    fields: ['id', 'name', 'state', 'amount_total', 'invoice_date', 'partner_id'],
  });
  return results[0];
}

/**
 * Confirm (validate) a draft invoice in Odoo
 */
export async function confirmOdooInvoice(invoiceId: number) {
  return odooExecute('account.move', 'action_post', [[invoiceId]]);
}
