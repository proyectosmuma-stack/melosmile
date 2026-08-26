import { getOdooProducts } from '../src/lib/odoo/client';

async function main() {
  try {
    const products = await getOdooProducts();
    console.log(`Conexión exitosa. Se encontraron ${products.length} productos en Odoo Test.`);
    if (products.length > 0) {
      console.log('Primer producto:', products[0]);
    }
  } catch (error) {
    console.error('Error conectando a Odoo:', error);
  }
}

main();
