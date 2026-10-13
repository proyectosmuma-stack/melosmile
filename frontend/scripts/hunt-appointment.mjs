import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.remote') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ID = process.argv[2];

const TABLES = [
  'appointments', 'patients', 'treatment_plans', 'documents',
  'billing_records', 'billing_sessions', 'reminders', 'professionals',
  'clinics', 'ai_conversation_history'
];

async function main() {
  console.log('PROYECTO:', process.env.NEXT_PUBLIC_SUPABASE_URL);

  if (ID) {
    for (const t of TABLES) {
      const { data, error } = await supabase.from(t).select('*').eq('id', ID);
      if (error) { console.log(`SEARCH [${t}]: error (${error.message})`); continue; }
      if (data && data.length) console.log(`SEARCH [${t}]: FOUND ${JSON.stringify(data, null, 2)}`);
      else console.log(`SEARCH [${t}]: not found`);
    }
  }

  const { data: recent, error: re } = await supabase
    .from('appointments')
    .select('id, appointment_date, status, created_at, patient_id, clinic_id, reason')
    .order('created_at', { ascending: false })
    .limit(25);

  if (re) console.log('RECENT ERROR:', re.message);
  else console.log('RECENT 25:', JSON.stringify(recent, null, 2));
}

main();
