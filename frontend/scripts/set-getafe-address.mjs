import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.remote') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CLINIC_NAME = 'Clinica Montaño - Getafe';
const NEW_ADDRESS = 'C/ Hospital de San José 41, Getafe, Madrid';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Faltan las variables de entorno de Supabase Cloud (.env.remote)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  console.log('🎯 Proyecto Supabase:', supabaseUrl);

  const { data: before, error: readErr } = await supabase
    .from('clinics')
    .select('id, name, address')
    .eq('name', CLINIC_NAME);

  if (readErr) {
    console.error('❌ Error leyendo:', readErr.message);
    process.exit(1);
  }
  if (!before || before.length === 0) {
    console.error(`❌ No existe la clínica "${CLINIC_NAME}"`);
    process.exit(1);
  }

  console.log('ANTES:', JSON.stringify(before, null, 2));

  const { error: updErr } = await supabase
    .from('clinics')
    .update({ address: NEW_ADDRESS, updated_at: new Date().toISOString() })
    .eq('name', CLINIC_NAME);

  if (updErr) {
    console.error('❌ Error actualizando:', updErr.message);
    process.exit(1);
  }

  const { data: after, error: readErr2 } = await supabase
    .from('clinics')
    .select('id, name, address')
    .eq('name', CLINIC_NAME);

  if (readErr2) {
    console.error('❌ Error verificando:', readErr2.message);
    process.exit(1);
  }

  console.log('DESPUÉS:', JSON.stringify(after, null, 2));

  const ok = !!after && after.length > 0 && after[0].address === NEW_ADDRESS;
  console.log(ok ? '✅ VERIFICADO' : '❌ NO VERIFICADO');
  process.exit(ok ? 0 : 1);
}

main();