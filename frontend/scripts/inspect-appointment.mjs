
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.remote') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const APPT_ID = process.argv[2];

const TABLES = [
  ['reminders', 'appointment_id'],
  ['billing_records', 'appointment_id'],
  ['billing_session_lines', 'appointment_id'],
  ['billing_sessions', 'appointment_id'],
  ['documents', 'appointment_id'],
  ['treatment_plans', 'appointment_id']
];

async function main() {
  if (!APPT_ID) {
    console.error('Uso: node scripts/inspect-appointment.mjs <appointment_id>');
    process.exit(1);
  }
  console.log('PROYECTO:', process.env.NEXT_PUBLIC_SUPABASE_URL);

  const { data: appt, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', APPT_ID)
    .maybeSingle();

  if (error) console.error('ERROR appointments:', error.message);
  console.log('APPOINTMENT:', JSON.stringify(appt, null, 2));

  if (appt) {
    if (appt.patient_id) {
      const { data: p, error: pe } = await supabase
        .from('patients')
        .select('id, first_name, last_name, historia_id, phone, email')
        .eq('id', appt.patient_id)
        .maybeSingle();
      if (pe) console.error('ERROR patients:', pe.message);
      console.log('PATIENT:', JSON.stringify(p, null, 2));
    }
    if (appt.clinic_id) {
      const { data: c, error: ce } = await supabase
        .from('clinics')
        .select('id, name, address')
        .eq('id', appt.clinic_id)
        .maybeSingle();
      if (ce) console.error('ERROR clinics:', ce.message);
      console.log('CLINIC:', JSON.stringify(c, null, 2));
    }
  }

  for (const [t, col] of TABLES) {
    const { data, error: e } = await supabase.from(t).select('id').eq(col, APPT_ID);
    if (e) {
      console.log(`DEP [${t}]: NO DISPONIBLE (${e.message})`);
    } else {
      console.log(`DEP [${t}]: ${data.length} fila(s) ${JSON.stringify(data)}`);
    }
  }
}

main();
