const fs = require('fs');
const path = require('path');
const dns = require('dns');
const { createClient } = require('@supabase/supabase-js');

// Configuración de resolución DNS para entornos donde libc dns cachea fallos temporales
const origLookup = dns.lookup;
dns.lookup = (hostname, options, callback) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (hostname === 'amhfdzfcmpastmlsosou.supabase.co') {
    if (options && options.all) return callback(null, [{ address: '172.64.149.246', family: 4 }]);
    return callback(null, '172.64.149.246', 4);
  }
  return origLookup(hostname, options, callback);
};

const SUPABASE_URL = 'https://amhfdzfcmpastmlsosou.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaGZkemZjbXBhc3RtbHNvc291Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDczNTM3NCwiZXhwIjoyMTAwMzExMzc0fQ.yPLQaV1xbfnuJJcNktxqbneP9Yb5UGlWfXA1tKYx6ZM';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const TABLES = [
  'clinics',
  'professionals',
  'treatment_families',
  'treatments',
  'treatment_clinic_prices',
  'clinic_commission_rules',
  'clinic_treatments',
  'professional_clinics',
  'patients',
  'patient_clinics',
  'patient_representatives',
  'tags',
  'patient_tags',
  'appointments',
  'billing_records',
  'billing_sessions',
  'billing_session_lines',
  'documents',
  'reminders',
  'reminder_events',
  'payment_installments',
  'ai_conversation_history',
  'ai_agent_reports'
];

function escapeValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean' || typeof val === 'number') return val.toString();
  if (typeof val === 'object') {
    return "'" + JSON.stringify(val).replace(/'/g, "''") + "'";
  }
  return "'" + String(val).replace(/'/g, "''") + "'";
}

async function exportData() {
  console.log('🚀 Extrayendo datos desde Supabase Cloud...');
  let sqlOutput = `-- Auto-generated seed data from Supabase Cloud\nSET session_replication_role = replica;\n\n`;

  for (const table of TABLES) {
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        console.warn(`⚠️ Error leyendo la tabla ${table}:`, error.message);
        continue;
      }
      if (!data || data.length === 0) {
        console.log(`ℹ️ Tabla ${table} está vacía.`);
        continue;
      }

      console.log(`✅ ${table}: ${data.length} registros encontrados.`);

      sqlOutput += `-- Data for ${table}\n`;
      const keys = Object.keys(data[0]);
      const columns = keys.map(k => `"${k}"`).join(', ');

      for (const row of data) {
        const values = keys.map(k => escapeValue(row[k])).join(', ');
        sqlOutput += `INSERT INTO public."${table}" (${columns}) VALUES (${values}) ON CONFLICT DO NOTHING;\n`;
      }
      sqlOutput += `\n`;
    } catch (err) {
      console.error(`❌ Error inesperado en tabla ${table}:`, err.message);
    }
  }

  sqlOutput += `SET session_replication_role = DEFAULT;\n`;

  const seedPath = path.join(__dirname, '../../supabase/seed.sql');
  fs.writeFileSync(seedPath, sqlOutput, 'utf8');
  console.log(`🎉 Datos exportados con éxito a ${seedPath}`);
}

exportData();
