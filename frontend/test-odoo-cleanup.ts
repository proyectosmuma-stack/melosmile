import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
async function run() {
  const client = await import('./src/lib/odoo/client');
  console.log("Cleaning up Munir in Odoo...");
  try {
    // Reset vat to false
    await client.odooExecute('res.partner', 'write', [
      [14], { vat: false, street: false, city: false, zip: false }
    ]);
    console.log("Cleaned up successfully!");
  } catch (e) {
    console.error(e);
  }
}
run();
