const { execSync } = require('child_process');
const path = require('path');

console.log('🔄 [REDUNDANCIA Y RESPALDO DE DATOS] Sincronizando Supabase Cloud → Local...');

try {
  const rootDir = path.resolve(__dirname, '../../');

  // 1. Exportar datos actualizados de la nube a supabase/seed.sql
  console.log('1️⃣ Exportando registros de Supabase Cloud a seed.sql...');
  execSync('node scripts/db/export_remote_data.js', { cwd: rootDir, stdio: 'inherit' });

  // 2. Aplicar los datos exportados a la base de datos local
  console.log('\n2️⃣ Reiniciando y poblando Supabase Local con los datos de la nube...');
  execSync('supabase db reset', { cwd: rootDir, stdio: 'inherit' });

  // 3. Inyectar base de conocimiento de agentes (SOLO LOCAL)
  console.log('\n3️⃣ Inyectando base de conocimiento de agentes (Local Only)...');
  execSync('docker exec -i supabase_db_melosmile psql -U postgres < supabase/local_scripts/agent_learnings.sql', { cwd: rootDir, stdio: 'inherit' });

  // 4. Sincronizar reportes de Musly (SSOT)
  console.log('\n4️⃣ Sincronizando reportes de errores de Musly (ai_agent_reports)...');
  execSync('node scripts/reports/sync_reports.js --sync', { cwd: rootDir, stdio: 'inherit' });

  console.log('\n🎉 ¡Sincronización y Redundancia completada con éxito!');
  console.log('Tu base de datos local y los logs de reportes ahora contienen la copia exacta de la nube.');
} catch (error) {
  console.error('\n❌ Error durante la sincronización:', error.message);
  process.exit(1);
}
