import * as dotenv from 'dotenv';
dotenv.config({ path: 'frontend/.env.local' });
import { getOdooProducts, upsertOdooPartner, odooExecute } from './frontend/src/lib/odoo/client';

async function run() {
  console.log("Searching Odoo for Munir...");
  try {
    const res = await odooExecute('res.partner', 'search_read', [
      [['name', 'ilike', 'Munir']]
    ], { fields: ['id', 'name', 'vat', 'street', 'city'] });
    console.log("Found in Odoo:", res);
  } catch (e) {
    console.error(e);
  }
}
run();
