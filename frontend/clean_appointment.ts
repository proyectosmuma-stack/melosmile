import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.remote' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const appointmentId = '3cd58b0d-4af8-4c04-a4e8-af3671c437e5';
  
  console.log(`Buscando la cita en la BD: ${supabaseUrl}`);
  const { data, error } = await supabase.from('appointments').select('*').eq('id', appointmentId).single();
  if (error) {
    console.error('Error buscando cita:', error.message);
    return;
  }
  
  console.log('Estado actual de la cita:', data);
  
  // Buscar en billing_records
  const { data: br } = await supabase.from('billing_records').select('*').eq('appointment_id', appointmentId);
  console.log('Billing records encontrados:', br?.length || 0);

  // Buscar en billing_session_lines
  const { data: bsl } = await supabase.from('billing_session_lines').select('*').eq('appointment_id', appointmentId);
  console.log('Billing session lines encontrados:', bsl?.length || 0);
  
  // Ejecutar limpieza
  if (br?.length) await supabase.from('billing_records').delete().eq('appointment_id', appointmentId);
  if (bsl?.length) await supabase.from('billing_session_lines').delete().eq('appointment_id', appointmentId);
  
  // Resetear la cita (asumiendo payment_status como campo común, vemos qué campos tiene data primero)
  const updates: any = {};
  if ('payment_status' in data) updates.payment_status = 'pending';
  if ('billing_status' in data) updates.billing_status = 'pending';
  if ('invoice_id' in data) updates.invoice_id = null;
  if ('odoo_invoice_id' in data) updates.odoo_invoice_id = null;
  if ('payment_method' in data) updates.payment_method = null;
  
  if (Object.keys(updates).length > 0) {
    console.log('Aplicando updates a cita:', updates);
    const { error: updateErr } = await supabase.from('appointments').update(updates).eq('id', appointmentId);
    if (updateErr) console.error('Error actualizando:', updateErr.message);
  }
  
  console.log('¡Limpieza completada!');
}

run();
