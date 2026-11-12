/**
 * Odoo XML-RPC / JSON-RPC client for Next.js
 * Uses ODOO_URL, ODOO_DB, ODOO_API_KEY from env
 */

const ODOO_URL = process.env.ODOO_URL!;
const ODOO_DB = process.env.ODOO_DB!;
const ODOO_USER = process.env.ODOO_USER!;
const ODOO_API_KEY = process.env.ODOO_API_KEY!; // API key acts as password

let _uid: number | null = null;
let _sessionId: string | null = null;

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
  let cookie = result.headers.get('set-cookie');
  if (cookie) _sessionId = cookie.split(';')[0];

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
    cookie = result.headers.get('set-cookie');
    if (cookie) _sessionId = cookie.split(';')[0];
  }

  if (!data.result?.uid) throw new Error('Odoo authentication failed');
  _uid = data.result.uid;
  return _uid!;
}

export async function odooExecute(model: string, method: string, args: unknown[], kwargs: Record<string, unknown> = {}, retry = true): Promise<any> {
  try {
    const uid = await getUID();
    const res = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(_sessionId ? { 'Cookie': _sessionId } : {})
      },
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
    if (data.error) {
      const errMsg = data.error.data?.message || data.error.message || '';
      if (retry && (errMsg.includes('Session expired') || errMsg.includes('Session Invalid') || errMsg.includes('Odoo Session'))) {
        _uid = null; // reset cached session
        return odooExecute(model, method, args, kwargs, false);
      }
      throw new Error(errMsg);
    }
    return data.result;
  } catch (err: any) {
    if (retry && (err.message.includes('Session expired') || err.message.includes('Session Invalid'))) {
      _uid = null;
      return odooExecute(model, method, args, kwargs, false);
    }
    throw err;
  }
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
export class OdooPartnerNotFoundError extends Error {
  code = 'PARTNER_NOT_FOUND';
  odoo_partner_id?: number;
  constructor(odooId: number) {
    super(`No se encontró al paciente en el sistema de facturación (ID guardado: ${odooId}).`);
    this.odoo_partner_id = odooId;
  }
}

export async function upsertOdooPartner(patient: {
  full_name: string;
  nif_cif?: string;
  billing_name?: string;
  billing_address?: string;
  billing_address_2?: string;
  billing_city?: string;
  billing_postal_code?: string;
  billing_province?: string;
  billing_country?: string;
  email?: string;
  phone?: string;
  odoo_partner_id?: number;
  patient_id?: string; // Supabase patient UUID — used to self-heal the stale link
  force_create?: boolean; // When true, create a new partner even if odoo_partner_id was previously set
}) {
  const name = patient.billing_name || patient.full_name;

  // Direct write to an already-mapped partner (SSOT: patient.odoo_partner_id)
  // Avoids re-searching by VAT/email/name, which could hit the wrong partner
  // or create a duplicate — leaving the mapped partner's address stale.
  let existingIds: number[] = [];
  let skipSearch = false;
  if (patient.odoo_partner_id) {
    existingIds = [patient.odoo_partner_id];
    skipSearch = true;
  }

  const performSearch = async () => {
    let ids: number[] = [];
    if (patient.nif_cif) {
      ids = await odooExecute('res.partner', 'search', [[['vat', '=', patient.nif_cif]]]);
    }
    if (ids.length === 0 && patient.email) {
      ids = await odooExecute('res.partner', 'search', [[['email', '=', patient.email]]]);
    }
    if (ids.length === 0) {
      ids = await odooExecute('res.partner', 'search', [[['name', 'ilike', name]]]);
    }
    if (ids.length === 0 && patient.full_name !== name) {
      ids = await odooExecute('res.partner', 'search', [[['name', 'ilike', patient.full_name]]]);
    }
    return ids;
  };

  if (!skipSearch) {
    existingIds = await performSearch();
  }

  // Only write fields the caller actually provided. This prevents a partial
  // payload (e.g. payment flow without billing address) from wiping existing
  // street/city/zip/vat on the mapped partner.
  const providedVals: Record<string, unknown> = { name };
  if (patient.nif_cif) providedVals.vat = patient.nif_cif;
  if (patient.billing_address) providedVals.street = patient.billing_address;
  if (patient.billing_address_2) providedVals.street2 = patient.billing_address_2;
  if (patient.billing_city) providedVals.city = patient.billing_city;
  if (patient.billing_postal_code) providedVals.zip = patient.billing_postal_code;
  if (patient.email) providedVals.email = patient.email;
  if (patient.phone) providedVals.phone = patient.phone;

  // Resolve Country ID
  let countryId = 68; // Default: 68 is España in Odoo
  if (patient.billing_country) {
    const countries = await odooExecute('res.country', 'search_read', [
      [['name', 'ilike', patient.billing_country]],
      ['id']
    ]);
    if (countries && countries.length > 0) {
      countryId = countries[0].id;
    }
  }
  providedVals.country_id = countryId;

  // Resolve State ID
  if (patient.billing_province) {
    const states = await odooExecute('res.country.state', 'search_read', [
      [['name', 'ilike', patient.billing_province], ['country_id', '=', countryId]],
      ['id']
    ]);
    if (states && states.length > 0) {
      providedVals.state_id = states[0].id;
    }
  }

  if (existingIds.length > 0) {
    try {
      await odooExecute('res.partner', 'write', [[existingIds[0]], providedVals]);
      return existingIds[0];
    } catch (error: any) {
      const errMsg = (error.message || '').toLowerCase();
      const isStaleId = errMsg.includes('eliminado') || errMsg.includes('exist') || errMsg.includes('deleted');
      if (isStaleId) {
        console.warn(`[Odoo] Stored partner ID ${existingIds[0]} is stale. Running deep search…`);
        const foundIds = await performSearch();

        if (foundIds.length > 0) {
          const recoveredId = foundIds[0];
          console.info(`[Odoo] Recovered partner ID ${recoveredId}. Updating Supabase reference…`);
          await odooExecute('res.partner', 'write', [[recoveredId], providedVals]);

          // Self-heal: update the stale odoo_partner_id in Supabase so this never happens again
          if (patient.patient_id) {
            const { createClient } = await import('@supabase/supabase-js');
            const supa = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            await supa.from('patients').update({ odoo_partner_id: recoveredId }).eq('id', patient.patient_id);
            console.info(`[Odoo] Self-healed: patients.odoo_partner_id updated to ${recoveredId}`);
          }

          return recoveredId;
        }

        // Not found anywhere. If force_create is set, fall through to create.
        // Otherwise surface a typed error so the UI can ask the user.
        if (!patient.force_create) {
          throw new OdooPartnerNotFoundError(existingIds[0]);
        }
        // force_create=true: reset existingIds so the create block below runs.
        existingIds = [];
      } else {
        throw error;
      }
    }
  }
  
  if (existingIds.length === 0) {
    // Create needs all defaults + provided values
    const createVals: Record<string, unknown> = {
      ...providedVals,
      vat: patient.nif_cif || false,
      street: patient.billing_address || false,
      city: patient.billing_city || false,
      zip: patient.billing_postal_code || false,
      // country_id and state_id are already in providedVals
      email: patient.email || false,
      phone: patient.phone || false,
      customer_rank: 1,
      is_company: false,
      lang: 'es_ES',
    };
    return odooExecute('res.partner', 'create', [createVals]);
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

/**
 * Get PDF bytes for an invoice
 */
export async function getOdooInvoicePdf(invoiceId: number) {
  // Ensure session is initialized
  await getUID();

  const res = await fetch(`${ODOO_URL}/report/pdf/account.report_invoice/${invoiceId}`, {
    method: 'GET',
    headers: {
      ...(_sessionId ? { 'Cookie': _sessionId } : {})
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch PDF from Odoo: ${res.statusText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}

/**
 * Register full payment for an invoice
 */
export async function registerOdooPayment(invoiceId: number) {
  const wizardId = await odooExecute('account.payment.register', 'create', [{}], {
    context: { active_model: 'account.move', active_ids: [invoiceId] }
  });
  await odooExecute('account.payment.register', 'action_create_payments', [[wizardId]]);
}

/**
 * Send invoice by email using Odoo's native action
 */
export async function sendOdooInvoiceEmail(invoiceId: number) {
  // Call the native action to send the invoice email
  return odooExecute('account.move', 'action_invoice_sent', [[invoiceId]]);
}
