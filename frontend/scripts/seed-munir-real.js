const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://amhfdzfcmpastmlsosou.supabase.co';
const supabaseAnonKey = 'sb_publishable_kN-3hlqUxOni9onF1CDmhg_03EOCXG6';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function upsertByName(table, nameCol, items) {
  const results = [];
  for (const item of items) {
    // Check if exists first
    const { data: existing } = await supabase
      .from(table)
      .select('*')
      .eq(nameCol, item[nameCol])
      .limit(1);

    if (existing && existing.length > 0) {
      const { data: updated } = await supabase
        .from(table)
        .update(item)
        .eq('id', existing[0].id)
        .select();
      results.push(updated[0]);
    } else {
      const { data: inserted } = await supabase
        .from(table)
        .insert([item])
        .select();
      results.push(inserted[0]);
    }
  }
  return results;
}

async function seed() {
  console.log('\n==============================');
  console.log('SEED REAL: Munir Mauel Callaos Cardama (PAC-1)');
  console.log('Datos extraídos de Notion el 22/07/2026');
  console.log('==============================\n');

  // ─── 1. CLÍNICAS ───
  console.log('→ Insertando/verificando clínicas...');
  const clinics = await upsertByName('clinics', 'name', [
    { name: 'Clínica Goya', address: 'C/ Goya, Madrid', phone: '+34 914 000 001', email: 'goya@melosmile.com', lab_expense_discount_percentage: 10 },
    { name: 'Clínica RyA', address: 'Rozas y Albacete', phone: '+34 914 000 002', email: 'rya@melosmile.com', lab_expense_discount_percentage: 8 },
    { name: 'Clínica Las Rozas', address: 'Las Rozas, Madrid', phone: '+34 914 000 003', email: 'rozas@melosmile.com', lab_expense_discount_percentage: 8 },
  ]);
  const clinicGoya = clinics.find(c => c.name === 'Clínica Goya');
  const clinicRyA  = clinics.find(c => c.name === 'Clínica RyA');
  console.log('  ✓ Goya:', clinicGoya.id);
  console.log('  ✓ RyA: ', clinicRyA.id);

  // ─── 2. PROFESIONALES ───
  console.log('→ Insertando/verificando profesionales...');
  const professionals = await upsertByName('professionals', 'email', [
    { first_name: 'Osly', last_name: 'Melo', specialty: 'Odontología General / Ortodoncia', email: 'osly@melosmile.com', phone: '+34 600 100 001', base_commission_percentage: 40, clinic_id: clinicGoya.id },
    { first_name: 'Norelys', last_name: 'Melo', specialty: 'Odontología Estética / Blanqueamiento', email: 'norelys@melosmile.com', phone: '+34 600 100 002', base_commission_percentage: 35, clinic_id: clinicRyA.id },
  ]);
  const profOsly    = professionals.find(p => p.first_name === 'Osly');
  const profNorelys = professionals.find(p => p.first_name === 'Norelys');
  console.log('  ✓ Dra. Osly:    ', profOsly.id);
  console.log('  ✓ Dra. Norelys: ', profNorelys.id);

  // ─── 3. TRATAMIENTOS ───
  console.log('→ Insertando/verificando tratamientos...');
  const treatments = await upsertByName('treatments', 'service_name', [
    { service_name: 'Control / Revisión General', service_type: 'Revisión', default_price: 0, lab_cost: 0 },
    { service_name: 'Limpieza Dental Ultrasónica', service_type: 'Higiene', default_price: 60, lab_cost: 0 },
    { service_name: 'Blanqueamiento LED', service_type: 'Estética', default_price: 180, lab_cost: 30 },
    { service_name: 'Ortodoncia - Alineadores Invisalign', service_type: 'Ortodoncia', default_price: 3500, lab_cost: 1200 },
    { service_name: 'Revisión Periódica', service_type: 'Revisión', default_price: 40, lab_cost: 0 },
  ]);
  const treatControl  = treatments.find(t => t.service_name === 'Control / Revisión General');
  const treatRevision = treatments.find(t => t.service_name === 'Revisión Periódica');
  console.log('  ✓ Tratamientos listos:', treatments.length);

  // ─── 4. PACIENTE MUNIR — DATOS REALES DE NOTION ───
  console.log('→ Actualizando/creando ficha de Munir (PAC-1)...');
  const { data: existingMunir } = await supabase
    .from('patients')
    .select('*')
    .eq('historia_id', 'PAC-1')
    .limit(1);

  let munir;
  const munirData = {
    historia_id: 'PAC-1',
    first_name: 'Munir Mauel',
    last_name: 'Callaos Cardama',
    dni_nie: null,
    dob: '1983-12-26',
    gender: 'Masculino',
    phone: '+34 690 154 268',
    email: 'mcallaos83@gmail.com',
    address: null,
    in_treatment: true,
    important_diseases: 'Paciente Talacémico',
    previous_operations: 'Apéndice, Amígdalas',
    allergies: 'Aspirinas / AAS',
    current_medication: 'Ninguna',
    treatment_plan: 'Seguimiento periódico en Clínica Goya y RyA. Referido por familiar. Control talasemia.',
  };

  if (existingMunir && existingMunir.length > 0) {
    // Delete old mock records (PAC-005)
    await supabase.from('patients').delete().eq('historia_id', 'PAC-005');
    const { data: updated } = await supabase
      .from('patients')
      .update(munirData)
      .eq('id', existingMunir[0].id)
      .select();
    munir = updated[0];
  } else {
    const { data: inserted } = await supabase
      .from('patients')
      .insert([munirData])
      .select();
    munir = inserted[0];
  }
  console.log('  ✓ Munir guardado:');
  console.log('    ID:      ', munir.id);
  console.log('    Historia:', munir.historia_id);
  console.log('    Nombre:  ', munir.first_name, munir.last_name);
  console.log('    Email:   ', munir.email);
  console.log('    Tel:     ', munir.phone);
  console.log('    Nació:   ', munir.dob);
  console.log('    Alergias:', munir.allergies);
  console.log('    Enfermedades:', munir.important_diseases);

  // ─── 5. ELIMINAR CITAS ANTERIORES DEL PACIENTE (evitar duplicados) ───
  const { data: oldAppts } = await supabase
    .from('appointments')
    .select('id')
    .eq('patient_id', munir.id);

  if (oldAppts && oldAppts.length > 0) {
    const oldIds = oldAppts.map(a => a.id);
    await supabase.from('billing_records').delete().in('appointment_id', oldIds);
    await supabase.from('appointments').delete().eq('patient_id', munir.id);
    console.log('  ✓ Citas anteriores limpiadas:', oldIds.length);
  }

  // ─── 6. CITAS REALES DE NOTION ───
  console.log('→ Insertando citas reales de Notion...');
  const { data: appts, error: apptErr } = await supabase
    .from('appointments')
    .insert([
      {
        patient_id: munir.id,
        professional_id: profNorelys.id,
        clinic_id: clinicRyA.id,
        treatment_id: treatControl.id,
        appointment_date: '2025-11-25T11:30:00+01:00',
        reason: 'Control',
        status: 'Realizada',
        notes: 'Control periódico. 11:30–11:45 en Clínica RyA. Sin incidencias.',
      },
      {
        patient_id: munir.id,
        professional_id: profOsly.id,
        clinic_id: clinicGoya.id,
        treatment_id: treatRevision.id,
        appointment_date: '2025-12-29T10:00:00+01:00',
        reason: 'Revisión',
        status: 'Realizada',
        notes: 'Revisión general en Clínica Goya. Diciembre 2025.',
      },
    ])
    .select();

  if (apptErr) {
    console.error('  ✗ Error citas:', apptErr.message);
    return;
  }
  console.log('  ✓ Citas insertadas:', appts.length);
  appts.forEach((a, i) => console.log(`    Cita ${i+1}: ${a.reason} — ${a.appointment_date} — ${a.id}`));

  // ─── 7. REGISTROS DE FACTURACIÓN ───
  console.log('→ Creando registros de facturación...');
  const billing = [
    {
      appointment_id: appts[0].id,
      custom_price: 0,
      applied_commission_rate: 35,
      applied_lab_discount_rate: 8,
      calculated_total: 0,
      billing_month: '2025-11-01',
      status: 'Aprobado',
    },
    {
      appointment_id: appts[1].id,
      custom_price: 40,
      applied_commission_rate: 35,
      applied_lab_discount_rate: 8,
      calculated_total: 14,
      billing_month: '2025-12-01',
      status: 'Aprobado',
    },
  ];

  const { error: bilErr } = await supabase.from('billing_records').insert(billing);
  if (bilErr) {
    console.warn('  ⚠ Error facturación:', bilErr.message);
  } else {
    console.log('  ✓ Facturación creada');
  }

  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║       SEED COMPLETADO CON ÉXITO ✓        ║');
  console.log('╠═══════════════════════════════════════════╣');
  console.log('║  Paciente: Munir Mauel Callaos Cardama   ║');
  console.log('║  Historia: PAC-1                          ║');
  console.log(`║  ID: ${munir.id.slice(0,12)}...               ║`);
  console.log('║  Citas:   2 (Notion → Supabase)          ║');
  console.log('║  Facturas: 2 registros creados            ║');
  console.log('╚═══════════════════════════════════════════╝\n');
}

seed().catch(console.error);
