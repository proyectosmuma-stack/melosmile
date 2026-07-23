const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'frontend/.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_ACCESS_TOKEN || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('appointments')
    .select('*, patients(first_name, last_name)')
    .eq('date', tomorrowStr);
    
  if (error) console.error("Error:", error);
  else console.log("Appointments for tomorrow:", JSON.stringify(data, null, 2));
}
check();
