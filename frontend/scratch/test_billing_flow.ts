import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.remote') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  console.log("🔍 Buscando cita de Munir en Staging (melosmile_db)...");
  
  // Buscar a Munir
  const { data: patient } = await supabase
    .from('patients')
    .select('id')
    .or('first_name.ilike.%Munir%,last_name.ilike.%Callaos%')
    .single();
    
  if (!patient) {
    console.error("❌ Paciente no encontrado");
    return;
  }
  
  const { data: appt } = await supabase
    .from('appointments')
    .select('*')
    .eq('patient_id', patient.id)
    .ilike('title', '%Munir%')
    .order('start_time', { ascending: false })
    .limit(1)
    .single();
    
  if (!appt) {
    console.error("❌ Cita no encontrada");
    return;
  }
  
  console.log(`✅ Cita encontrada: ${appt.title} (ID: ${appt.id}) - Estado: ${appt.status}`);
  
  console.log("🚀 Probando endpoint de Odoo Facturación en Staging...");
  try {
    const res = await fetch("https://melosmile-staging-o54y7wdx8-proyectosmuma-stacks-projects.vercel.app/api/odoo/invoice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "melosmile_internal_n8n_key_2026"
      },
      body: JSON.stringify({
        appointmentId: appt.id,
        patientName: "Munir Callaos",
        amount: 100,
        concept: "Tratamiento Prueba"
      })
    });
    
    const data = await res.json();
    console.log("Respuesta de Odoo API:", JSON.stringify(data, null, 2));
  } catch(e) {
    console.error("Error al llamar API:", e);
  }
}
main();
