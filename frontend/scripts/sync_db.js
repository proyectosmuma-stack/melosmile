const { execSync } = require('child_process');
const path = require('path');

console.log('🔄 [REDUNDANCIA Y RESPALDO DE DATOS] Sincronizando Supabase Cloud → Local...');

try {
  // 1. Exportar datos actualizados de la nube a supabase/seed.sql
  console.log('1️⃣ Exportando registros de Supabase Cloud a seed.sql...');
  execSync('node scripts/export_remote_data.js', { stdio: 'inherit' });

  // 2. Aplicar los datos exportados a la base de datos local
  console.log('\n2️⃣ Reiniciando y poblando Supabase Local con los datos de la nube...');
  const rootDir = path.join(__dirname, '../../');
  execSync('supabase db reset', { cwd: rootDir, stdio: 'inherit' });

  // 3. Inyectar base de conocimiento de agentes (SOLO LOCAL)
  console.log('\n3️⃣ Inyectando base de conocimiento de agentes (Local Only)...');
  execSync('docker exec -i supabase_db_melosmile psql -U postgres < supabase/local_scripts/agent_learnings.sql', { cwd: rootDir, stdio: 'inherit' });

  console.log('\n🎉 ¡Sincronización y Redundancia completada con éxito!');
  console.log('Tu base de datos local ahora contiene la copia exacta de todos los datos procesados por n8n y los agentes en la nube.');
} catch (error) {
  console.error('\n❌ Error durante la sincronización:', error.message);
  process.exit(1);
}
