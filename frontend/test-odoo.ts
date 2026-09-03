import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const client = await import('./src/lib/odoo/client');
  console.log("Searching Odoo for Munir...");
  try {
    const res = await client.odooExecute('res.partner', 'search_read', [
      [['name', 'ilike', 'Munir']]
    ], { fields: ['id', 'name', 'vat', 'street', 'city', 'email'] });
    console.log("Found in Odoo:", res);
  } catch (e) {
    console.error(e);
  }
}
run();
