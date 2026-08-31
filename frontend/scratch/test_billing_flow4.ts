import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.remote') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: patient } = await supabase.from('patients').select('id').or('first_name.ilike.%Munir%,last_name.ilike.%Callaos%').single();
  if (!patient) return console.log("No patient");
  
  const { data: appt } = await supabase.from('appointments')
    .select('*, clinic:clinics(name)')
    .eq('patient_id', patient.id)
    .ilike('appointment_date', '%2025-12-29%')
    .single();
    
  if (!appt) return console.log("No appointment on 29-12-2025");
  
  console.log("Cita:", appt);
  
  console.log("Facturando...");
  const res = await fetch("https://melosmile-staging-o54y7wdx8-proyectosmuma-stacks-projects.vercel.app/api/odoo/invoice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "melosmile_internal_n8n_key_2026"
      },
      body: JSON.stringify({
        appointmentId: appt.id,
        patientName: "Munir Callaos",
        amount: 50,
        concept: "Control de Ortodoncia"
      })
  });
  
  const data = await res.json();
  console.log("Odoo response:", JSON.stringify(data, null, 2));
}
main();
