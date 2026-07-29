import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.remote') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Faltan las variables de entorno de Supabase Cloud (.env.remote)");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function cleanCloudDatabase() {
  console.log("🧹 Iniciando limpieza en Supabase Cloud...");

  // 1. Get Munir's patient ID
  const { data: munirData, error: munirError } = await supabase
    .from('patients')
    .select('id, first_name, last_name')
    .or('first_name.ilike.%Munir%,last_name.ilike.%Callaos%');

  if (munirError || !munirData || munirData.length === 0) {
    console.error("❌ Error localizando a Munir en Cloud:", munirError);
    process.exit(1);
  }

  const munirId = munirData[0].id;
  console.log(`✅ Munir localizado en Cloud: ${munirData[0].first_name} ${munirData[0].last_name} (ID: ${munirId})`);

  // 2. Delete billing_session_lines
  const { error: errLines } = await supabase.from('billing_session_lines').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("🔹 billing_session_lines limpiadas:", errLines ? errLines.message : "OK");

  // 3. Delete billing_sessions
  const { error: errSessions } = await supabase.from('billing_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("🔹 billing_sessions limpiadas:", errSessions ? errSessions.message : "OK");

  // 4. Delete billing_records
  const { error: errBilling } = await supabase.from('billing_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("🔹 billing_records limpiados:", errBilling ? errBilling.message : "OK");

  // 5. Delete appointments
  const { error: errAppts } = await supabase.from('appointments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("🔹 appointments limpiadas:", errAppts ? errAppts.message : "OK");

  // 6. Delete patient relations for others
  await supabase.from('patient_tags').delete().neq('patient_id', munirId);
  await supabase.from('patient_clinics').delete().neq('patient_id', munirId);
  await supabase.from('patient_representatives').delete().neq('patient_id', munirId);

  // 7. Delete all patients EXCEPT Munir
  const { error: errPatients } = await supabase.from('patients').delete().neq('id', munirId);
  console.log("🔹 Pacientes secundarios eliminados:", errPatients ? errPatients.message : "OK");

  // 8. Verify remaining patients
  const { data: remainingPatients } = await supabase.from('patients').select('id, first_name, last_name, historia_id');
  const { count: apptCount } = await supabase.from('appointments').select('*', { count: 'exact', head: true });

  console.log("\n🎉 ¡Limpieza en Supabase Cloud completada!");
  console.log(`📌 Pacientes restantes en Cloud: ${remainingPatients?.length || 0}`);
  console.log("   ", remainingPatients);
  console.log(`📌 Citas restantes en Cloud: ${apptCount || 0}`);
}

cleanCloudDatabase().catch(err => {
  console.error("❌ Error en script de limpieza:", err);
  process.exit(1);
});
