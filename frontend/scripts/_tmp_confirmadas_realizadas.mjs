import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.remote') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const APPLY = process.argv.includes('--apply');

async function main() {
  const ahora = new Date().toISOString();

  const { data: confirmadas, error } = await supabase
    .from('appointments')
    .select('id, appointment_date, status, reason, patient_id')
    .eq('status', 'Confirmada')
    .order('appointment_date', { ascending: true });
  if (error) return console.error('ERR:', error.message);

  const antiguas = (confirmadas || []).filter(a => a.appointment_date < ahora);
  const futuras = (confirmadas || []).filter(a => a.appointment_date >= ahora);

  console.log(`CONFIRMADAS_TOTAL: ${confirmadas.length} | ANTIGUAS(<hoy): ${antiguas.length} | FUTURAS(se mantienen): ${futuras.length}`);
  antiguas.forEach(a => console.log(`  ANTIGUA: ${a.appointment_date} | ${(a.reason||'').slice(0,35)} | pac=${a.patient_id.slice(0,8)} | ${a.id}`));
  if (futuras.length) {
    console.log('FUTURAS que NO se tocan:');
    futuras.forEach(a => console.log(`  FUTURA: ${a.appointment_date} | ${(a.reason||'').slice(0,35)} | pac=${a.patient_id.slice(0,8)}`));
  }

  if (!APPLY) return console.log('MODO_DRY_RUN (--apply para ejecutar)');
  if (!antiguas.length) return console.log('NADA_QUE_ACTUALIZAR');

  const { error: eU } = await supabase
    .from('appointments')
    .update({ status: 'Realizada' })
    .in('id', antiguas.map(a => a.id));
  if (eU) return console.error('ERR_UPDATE:', eU.message);
  console.log(`UPDATE_EJECUTADO sobre ${antiguas.length} citas`);

  // Verificación absoluta
  const { count: quedan } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Confirmada')
    .lt('appointment_date', ahora);
  const { count: realizadas } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Realizada');
  console.log(`VERIFICACION: confirmadas antiguas restantes = ${quedan} | Realizada total = ${realizadas}`);
}

main();
