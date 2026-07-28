import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

async function checkTodayAppointments() {
  const now = new Date();
  // Get local date YYYY-MM-DD
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const localToday = `${year}-${month}-${day}`;

  console.log("Local today:", localToday, "UTC ISO today:", now.toISOString());

  const { data: allAppts } = await supabase
    .from('appointments')
    .select('id, appointment_date, status, reason, patient_id');

  console.log("Total appointments in DB:", allAppts?.length);

  const todayAppts = allAppts?.filter(a => {
    if (!a.appointment_date) return false;
    const isNotCancelled = a.status !== "Cancelada" && a.status !== "cancelada";
    const dateStr = a.appointment_date.substring(0, 10);
    return isNotCancelled && dateStr === localToday;
  });

  console.log("Appointments strictly for local today (" + localToday + ") (not cancelled):", todayAppts?.length);
  console.log("List of today appointments:", todayAppts);
}

checkTodayAppointments();
