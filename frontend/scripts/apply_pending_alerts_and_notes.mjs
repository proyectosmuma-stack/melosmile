import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const secretFile = '/tmp/sb_prod_service_role.txt';
if (!fs.existsSync(secretFile)) {
  console.error('❌ No se encontró el archivo de clave:', secretFile);
  process.exit(1);
}

const serviceRoleKey = fs.readFileSync(secretFile, 'utf8').trim();
const supabaseUrl = 'https://xylqytpudbdcsbuuwqpi.supabase.co';
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  console.log('🚀 Conectando a Supabase Producción (' + supabaseUrl + ')...');

  // 1. Aplicar notas a treatment_plan de los 4 pacientes (independiente de la tabla de alertas)
  console.log('\n📋 Actualizando notas en treatment_plan de los 4 pacientes...');
  const notasRaw = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../../scratch/notas-pendientes.json'), 'utf8')
  );

  for (const item of notasRaw.notas_a_aplicar) {
    const { data: patData, error: patErr } = await supabase
      .from('patients')
      .select('id, first_name, last_name, treatment_plan')
      .eq('id', item.patient_id)
      .single();

    if (patErr || !patData) {
      console.error(`   ❌ Paciente no encontrado (${item.patient_id}):`, patErr?.message);
      continue;
    }

    const currentPlan = patData.treatment_plan || '';
    if (currentPlan.includes(item.nota)) {
      console.log(`   ⏭️  Nota ya presente en paciente: ${patData.first_name} ${patData.last_name} (${patData.id.slice(0, 8)})`);
    } else {
      const updatedPlan = currentPlan
        ? `${currentPlan}\n\n- ${item.nota}`
        : `- ${item.nota}`;

      const { error: updateErr } = await supabase
        .from('patients')
        .update({ treatment_plan: updatedPlan })
        .eq('id', item.patient_id);

      if (updateErr) {
        console.error(`   ❌ Error actualizando paciente ${patData.first_name}:`, updateErr.message);
      } else {
        console.log(`   ✅ Nota añadida a: ${patData.first_name} ${patData.last_name} (${patData.id.slice(0, 8)})`);
      }
    }
  }

  // 2. Verificar si la tabla system_notifications existe e insertar alertas
  console.log('\n🔔 Comprobando tabla system_notifications para las alertas...');
  const { data: testData, error: testError } = await supabase
    .from('system_notifications')
    .select('id')
    .limit(1);

  if (testError && testError.code === 'PGRST205') {
    console.log('⚠️  La tabla "system_notifications" aún no está creada en Supabase Producción.');
    console.log('👉 Ejecuta este SQL en el SQL Editor de Supabase (https://supabase.com/dashboard/project/xylqytpudbdcsbuuwqpi/sql):');
    console.log('------------------------------------------------------------');
    const sqlContent = fs.readFileSync(
      path.resolve(__dirname, '../../supabase/migrations/20260909000000_create_system_notifications.sql'),
      'utf8'
    );
    console.log(sqlContent.trim());
    console.log('------------------------------------------------------------');
    console.log('En cuanto pegues y ejecutes el SQL, vuelve a correr este comando para insertar las 4 alertas automáticamente.');
    return;
  }

  console.log('Insertando alertas en system_notifications...');
  const alertsRaw = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../../scratch/alertas-campanita.json'), 'utf8')
  );

  for (const alerta of alertsRaw.alertas) {
    const { data: existing } = await supabase
      .from('system_notifications')
      .select('id')
      .eq('title', alerta.title)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`   ⏭️  Ya existe: "${alerta.title}"`);
    } else {
      const { error: insErr } = await supabase.from('system_notifications').insert({
        ...alerta,
        created_by: alertsRaw.created_by || 'MumaBot'
      });
      if (insErr) {
        console.error(`   ❌ Error insertando "${alerta.title}":`, insErr.message);
      } else {
        console.log(`   ✅ Insertada alerta: "${alerta.title}"`);
      }
    }
  }

  console.log('\n✨ Proceso 100% finalizado con éxito.');
}

main().catch(console.error);
