import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
process.env.ODOO_URL = process.env.ODOO_URL || 'https://melosmile-test.odoo.com';
process.env.ODOO_DB = process.env.ODOO_DB || 'melosmile-test';

async function run() {
  const client = await import('./src/lib/odoo/client');
  console.log("Upserting Munir in Odoo...");
  try {
    const id = await client.upsertOdooPartner({
      full_name: 'Munir Mauel Callaos Cardama',
      nif_cif: '12345678Z', // Mock NIF to see if it updates
      billing_address: 'Calle Falsa 123',
      billing_city: 'Madrid',
      billing_postal_code: '28001',
      email: 'mcallaos83@gmail.com',
      phone: '600123456'
    });
    console.log("Upserted successfully! ID:", id);
    
    // Fetch it back to verify
    const res = await client.odooExecute('res.partner', 'search_read', [
      [['id', '=', id]]
    ], { fields: ['id', 'name', 'vat', 'street', 'city', 'email'] });
    console.log("Updated data in Odoo:", res);
  } catch (e) {
    console.error(e);
  }
}
run();
