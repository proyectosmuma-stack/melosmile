import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
process.env.ODOO_URL = process.env.ODOO_URL || 'https://melosmile-test.odoo.com';
process.env.ODOO_DB = process.env.ODOO_DB || 'melosmile-test';

async function run() {
  const client = await import('./src/lib/odoo/client');
  console.log("=== PRUEBA E2E: MODIFICAR DATOS EN ODOO ===\n");
  
  // 1. Obtener estado actual
  console.log("1. Buscando a Munir en Odoo antes de modificar...");
  let res = await client.odooExecute('res.partner', 'search_read', [
    [['name', 'ilike', 'Munir']]
  ], { fields: ['id', 'name', 'street', 'city', 'email'] });
  console.log("Estado Original:", res[0], "\n");
  
  // 2. Modificar con upsertOdooPartner (como lo haría Next.js)
  console.log("2. Ejecutando upsertOdooPartner() con nuevos datos (Dirección = 'Avenida Siempreviva 742', Ciudad = 'Springfield')...");
  const id = await client.upsertOdooPartner({
    full_name: 'Munir Mauel Callaos Cardama',
    nif_cif: '', // Dejamos el NIF vacío para forzar la búsqueda por email/nombre
    billing_address: 'Avenida Siempreviva 742',
    billing_city: 'Springfield',
    email: 'mcallaos83@gmail.com'
  });
  console.log("Upsert finalizado. ID retornado:", id, "\n");
  
  // 3. Verificar estado tras modificar
  console.log("3. Obteniendo datos desde Odoo para confirmar el cambio...");
  res = await client.odooExecute('res.partner', 'search_read', [
    [['id', '=', id]]
  ], { fields: ['id', 'name', 'street', 'city', 'email'] });
  console.log("Estado Nuevo en Odoo:", res[0], "\n");

  // 4. Restaurar a la normalidad
  console.log("4. Restaurando los datos originales (Limpiando dirección)...");
  await client.odooExecute('res.partner', 'write', [
    [id], { street: false, city: false }
  ]);
  console.log("Datos restaurados a su estado original.");
}
run();
