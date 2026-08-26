const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.remote') });
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

// ─── CONFIGURACIÓN ──────────────────────────────────────────────
const NOTION_TOKEN = process.env.NOTION_TOKEN || process.env.NOTION_API_KEY || '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://amhfdzfcmpastmlsosou.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const DB_PACIENTES_GEN   = '2ab50bdb-2d45-80af-b446-ec0d2ab66dfd';
const DB_PACIENTES_ALB   = '2bf50bdb-2d45-80e9-9de4-d64b87b5bd0e';
const DB_CITAS_GEN       = '2ab50bdb-2d45-80fb-8c71-f98c170b2b99';
const DB_CITAS_ALB       = '2bf50bdb-2d45-80df-9492-d8a761128214';
const DB_TRATAMIENTOS    = '2bf50bdb-2d45-801b-a3a5-e79bb4aa9694';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── NOTION API HELPERS ──────────────────────────────────────────
async function fetchNotion(endpoint, method = 'GET', payload = null) {
  return new Promise((resolve, reject) => {
    const data = payload ? JSON.stringify(payload) : '';
    const headers = {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28'
    };
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(data);
    }
    const req = https.request(`https://api.notion.com/v1/${endpoint}`, { method, headers }, (r) => {
      let body = '';
      r.on('data', chunk => body += chunk);
      r.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { resolve({ error: e.message, raw: body }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(data);
    req.end();
  });
}

async function queryAllNotionDB(dbId) {
  let results = [];
  let startCursor = undefined;
  let hasMore = true;

  while (hasMore) {
    const res = await fetchNotion(`databases/${dbId}/query`, 'POST', {
      page_size: 100,
      start_cursor: startCursor
    });
    if (res.results) {
      results = results.concat(res.results);
    } else {
      console.error(`Error querying DB ${dbId}:`, res);
      break;
    }
    hasMore = res.has_more;
    startCursor = res.next_cursor;
  }
  return results;
}

async function getBlockChildren(blockId) {
  let results = [];
  let startCursor = undefined;
  let hasMore = true;

  while (hasMore) {
    let url = `blocks/${blockId}/children?page_size=100`;
    if (startCursor) url += `&start_cursor=${startCursor}`;
    const res = await fetchNotion(url, 'GET');
    if (res.results) {
      results = results.concat(res.results);
    } else {
      break;
    }
    hasMore = res.has_more;
    startCursor = res.next_cursor;
  }
  return results;
}

async function extractImagesAndTextFromBlocks(blockId, depth = 0) {
  if (depth > 4) return { images: [], texts: [] };
  const blocks = await getBlockChildren(blockId);
  let images = [];
  let texts = [];

  for (const b of blocks) {
    const type = b.type;
    if (type === 'image') {
      const url = b.image.file?.url || b.image.external?.url;
      if (url) images.push({ id: b.id, url, caption: b.image.caption?.map(c => c.plain_text).join(' ') || '' });
    } else if (b[type]?.rich_text) {
      const txt = b[type].rich_text.map(t => t.plain_text).join('').trim();
      if (txt) texts.push(txt);
    }

    if (b.has_children) {
      const sub = await extractImagesAndTextFromBlocks(b.id, depth + 1);
      images = images.concat(sub.images);
      texts = texts.concat(sub.texts);
    }
  }
  return { images, texts };
}

function downloadBinary(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadBinary(res.headers.location).then(resolve).catch(reject);
      }
      const data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => resolve(Buffer.concat(data)));
    }).on('error', reject);
  });
}

function getPropText(prop) {
  if (!prop) return '';
  if (prop.type === 'title') return prop.title?.map(t => t.plain_text).join('') || '';
  if (prop.type === 'rich_text') return prop.rich_text?.map(t => t.plain_text).join('') || '';
  if (prop.type === 'email') return prop.email || '';
  if (prop.type === 'phone_number') return prop.phone_number || '';
  if (prop.type === 'select') return prop.select?.name || '';
  if (prop.type === 'date') return prop.date?.start || '';
  if (prop.type === 'checkbox') return prop.checkbox;
  if (prop.type === 'number') return prop.number;
  if (prop.type === 'rollup') {
    if (prop.rollup.type === 'array' && prop.rollup.array?.[0]) {
      return prop.rollup.array[0].number || prop.rollup.array[0].string || '';
    }
    if (prop.rollup.type === 'number') return prop.rollup.number || 0;
  }
  if (prop.type === 'formula') {
    if (prop.formula.type === 'string') return prop.formula.string || '';
    if (prop.formula.type === 'number') return prop.formula.number || 0;
    if (prop.formula.type === 'boolean') return prop.formula.boolean;
  }
  return '';
}

function findProp(props, regex) {
  const key = Object.keys(props).find(k => regex.test(k));
  return key ? props[key] : null;
}

function splitFullName(fullName) {
  const clean = (fullName || '').trim().replace(/\s+/g, ' ');
  if (!clean) return { first_name: 'Paciente', last_name: 'Desconocido' };
  const parts = clean.split(' ');
  if (parts.length === 1) return { first_name: parts[0], last_name: '' };
  if (parts.length === 2) return { first_name: parts[0], last_name: parts[1] };
  if (parts.length === 3) return { first_name: parts[0], last_name: `${parts[1]} ${parts[2]}` };
  return { first_name: `${parts[0]} ${parts[1]}`, last_name: parts.slice(2).join(' ') };
}

// ─── MAIN MIGRATION SCRIPT ──────────────────────────────────────
async function main() {
  console.log('====================================================');
  console.log('🚀 INICIANDO MIGRACIÓN NOTION → SUPABASE PRODUCCIÓN');
  console.log('====================================================\n');

  // 1. CARGAR CATÁLOGOS BASE DESDE SUPABASE CLOUD
  console.log('1. Cargando catálogos de Supabase Cloud y Notion...');
  const { data: clinics } = await supabase.from('clinics').select('*');
  const { data: professionals } = await supabase.from('professionals').select('*');
  const { data: treatments } = await supabase.from('treatments').select('*');

  const clinicGoya       = clinics.find(c => c.name.includes('Goya'));
  const clinicRyA        = clinics.find(c => c.name.includes('RyA'));
  const clinicBustamante = clinics.find(c => c.name.includes('Bustamante') || c.name.includes('Albacete'));
  const clinicRozas      = clinics.find(c => c.name.includes('Rozas'));
  const clinicMontano    = clinics.find(c => c.name.includes('Montaño') || c.name.includes('Getafe'));

  const profOsly    = professionals.find(p => p.first_name.toLowerCase().includes('osly'));
  const profNorelys = professionals.find(p => p.first_name.toLowerCase().includes('norelys'));
  const profShirley = professionals.find(p => p.first_name.toLowerCase().includes('shirley'));

  // Cargar catálogo de tratamientos de Notion
  const rawNotionTreatments = await queryAllNotionDB(DB_TRATAMIENTOS);
  const notionTreatmentMap = new Map();
  for (const t of rawNotionTreatments) {
    const name = getPropText(t.properties['Servicio']);
    const price = getPropText(t.properties['Precio Servicio']);
    notionTreatmentMap.set(t.id, { name, price });
  }

  console.log(`  ✓ Clínicas: ${clinics.length}`);
  console.log(`  ✓ Profesionales: ${professionals.length}`);
  console.log(`  ✓ Tratamientos en Supabase: ${treatments.length}`);
  console.log(`  ✓ Tratamientos en Notion: ${notionTreatmentMap.size}\n`);

  // 2. EXTRAER PACIENTES DE NOTION
  console.log('2. Extrayendo pacientes de Notion...');
  const rawPacientesGen = await queryAllNotionDB(DB_PACIENTES_GEN);
  const rawPacientesAlb = await queryAllNotionDB(DB_PACIENTES_ALB);
  console.log(`  ✓ Notion Pacientes General: ${rawPacientesGen.length}`);
  console.log(`  ✓ Notion Pacientes Albacete: ${rawPacientesAlb.length}`);

  const patientMap = new Map();
  const notionPageToPatientId = new Map();

  const { data: existingMunir } = await supabase
    .from('patients')
    .select('*')
    .or('historia_id.eq.PAC-001,historia_id.eq.PAC-1')
    .limit(1);

  let munirId = existingMunir?.[0]?.id;
  let nextPacNum = 2;

  function normalizeNameKey(name) {
    return (name || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  // Pacientes Generales
  for (const row of rawPacientesGen) {
    const rawName = getPropText(findProp(row.properties, /nombre/i));
    if (!rawName) continue;

    const normKey = normalizeNameKey(rawName);
    const { first_name, last_name } = splitFullName(rawName);
    const phone = getPropText(findProp(row.properties, /^tel/i)) || getPropText(findProp(row.properties, /teléfono \(1\)/i));
    const email = getPropText(findProp(row.properties, /email/i));
    const dni = getPropText(findProp(row.properties, /dni|nie/i));
    const dob = getPropText(findProp(row.properties, /nacimiento/i)) || null;
    const gender = getPropText(findProp(row.properties, /sexo|género/i)) || null;
    const address = getPropText(findProp(row.properties, /dirección/i)) || null;
    const in_treatment = !!getPropText(findProp(row.properties, /tratamiento\?/i));
    const allergies = getPropText(findProp(row.properties, /alergia/i)) || null;
    const important_diseases = getPropText(findProp(row.properties, /enfermedades/i)) || null;
    const previous_operations = getPropText(findProp(row.properties, /operaciones/i)) || null;
    const current_medication = getPropText(findProp(row.properties, /medicación/i)) || null;
    const treatment_plan = getPropText(findProp(row.properties, /plan de tratamiento/i)) || null;
    const clinicRef = getPropText(findProp(row.properties, /clinica/i));

    patientMap.set(normKey, {
      notionPageIds: [row.id],
      first_name,
      last_name,
      fullName: rawName,
      phone,
      email,
      dni_nie: dni,
      dob,
      gender,
      address,
      in_treatment,
      allergies,
      important_diseases,
      previous_operations,
      current_medication,
      treatment_plan,
      isAlbacete: false,
      clinicRef
    });
  }

  // Pacientes Albacete
  for (const row of rawPacientesAlb) {
    const rawName = getPropText(findProp(row.properties, /nombre/i));
    if (!rawName) continue;

    const normKey = normalizeNameKey(rawName);
    const { first_name, last_name } = splitFullName(rawName);
    const phone = getPropText(findProp(row.properties, /^tel/i));
    const email = getPropText(findProp(row.properties, /email/i));
    const dni = getPropText(findProp(row.properties, /dni|nie/i));
    const dob = getPropText(findProp(row.properties, /nacimiento/i)) || null;
    const gender = getPropText(findProp(row.properties, /sexo|género/i)) || null;
    const address = getPropText(findProp(row.properties, /dirección/i)) || null;
    const in_treatment = !!getPropText(findProp(row.properties, /tratamiento\?/i));
    const allergies = getPropText(findProp(row.properties, /alergia/i)) || null;
    const important_diseases = getPropText(findProp(row.properties, /enfermedades/i)) || null;
    const previous_operations = getPropText(findProp(row.properties, /operaciones/i)) || null;
    const current_medication = getPropText(findProp(row.properties, /medicación/i)) || null;

    if (patientMap.has(normKey)) {
      const existing = patientMap.get(normKey);
      existing.notionPageIds.push(row.id);
      existing.isAlbacete = true;
      if (!existing.phone && phone) existing.phone = phone;
      if (!existing.email && email) existing.email = email;
      if (!existing.dni_nie && dni) existing.dni_nie = dni;
      if (!existing.dob && dob) existing.dob = dob;
      if (!existing.allergies && allergies) existing.allergies = allergies;
      if (!existing.important_diseases && important_diseases) existing.important_diseases = important_diseases;
    } else {
      patientMap.set(normKey, {
        notionPageIds: [row.id],
        first_name,
        last_name,
        fullName: rawName,
        phone,
        email,
        dni_nie: dni,
        dob,
        gender,
        address,
        in_treatment,
        allergies,
        important_diseases,
        previous_operations,
        current_medication,
        treatment_plan: null,
        isAlbacete: true,
        clinicRef: 'Albacete'
      });
    }
  }

  console.log(`  ✓ Pacientes únicos unificados: ${patientMap.size}\n`);

  // 3. INSERTAR PACIENTES EN SUPABASE CLOUD
  console.log('3. Guardando pacientes en Supabase Cloud...');
  const createdPatients = [];

  for (const [normKey, p] of patientMap.entries()) {
    let historiaId;
    let isMunir = normKey.includes('munir') || normKey.includes('callaos');

    if (isMunir) {
      historiaId = 'PAC-001';
    } else {
      historiaId = `PAC-${String(nextPacNum).padStart(3, '0')}`;
      nextPacNum++;
    }

    const patientPayload = {
      historia_id: historiaId,
      first_name: p.first_name,
      last_name: p.last_name,
      dni_nie: p.dni_nie || null,
      dob: p.dob || null,
      gender: p.gender || null,
      phone: p.phone || null,
      email: p.email || null,
      address: p.address || null,
      in_treatment: p.in_treatment,
      allergies: p.allergies || null,
      important_diseases: p.important_diseases || null,
      previous_operations: p.previous_operations || null,
      current_medication: p.current_medication || null,
      treatment_plan: p.treatment_plan || null,
      is_active: true
    };

    let savedPatient;
    if (isMunir && munirId) {
      const { data: updated } = await supabase
        .from('patients')
        .update(patientPayload)
        .eq('id', munirId)
        .select();
      savedPatient = updated?.[0];
    } else {
      const { data: existing } = await supabase
        .from('patients')
        .select('*')
        .eq('first_name', p.first_name)
        .eq('last_name', p.last_name)
        .limit(1);

      if (existing && existing.length > 0) {
        const { data: updated } = await supabase
          .from('patients')
          .update(patientPayload)
          .eq('id', existing[0].id)
          .select();
        savedPatient = updated?.[0];
      } else {
        const { data: inserted, error: insErr } = await supabase
          .from('patients')
          .insert([patientPayload])
          .select();
        if (insErr) {
          console.error(`  ✗ Error insertando paciente ${p.fullName}:`, insErr.message);
          continue;
        }
        savedPatient = inserted?.[0];
      }
    }

    if (savedPatient) {
      for (const pageId of p.notionPageIds) {
        notionPageToPatientId.set(pageId, savedPatient.id);
      }
      p.savedId = savedPatient.id;
      p.historia_id = historiaId;
      createdPatients.push(savedPatient);

      let targetClinic = clinicGoya || clinicRozas;
      if (p.isAlbacete) {
        targetClinic = clinicBustamante || clinicRyA;
      } else if (p.clinicRef && /getafe/i.test(p.clinicRef)) {
        targetClinic = clinicMontano || clinicGoya;
      } else if (p.clinicRef && /rya/i.test(p.clinicRef)) {
        targetClinic = clinicRyA || clinicGoya;
      }
      if (targetClinic) {
        await supabase
          .from('patient_clinics')
          .upsert({
            patient_id: savedPatient.id,
            clinic_id: targetClinic.id,
            is_primary: true
          }, { onConflict: 'patient_id,clinic_id' });
      }
    }
  }

  console.log(`  ✓ Pacientes procesados y vinculados en Cloud: ${createdPatients.length}\n`);

  // 4. MIGRAR CITAS GENERALES Y ALBACETE
  console.log('4. Migrando citas históricas y de Albacete...');
  const rawCitasGen = await queryAllNotionDB(DB_CITAS_GEN);
  const rawCitasAlb = await queryAllNotionDB(DB_CITAS_ALB);

  let insertedApptsCount = 0;
  let insertedBillingCount = 0;
  let insertedDocsCount = 0;

  function resolveTreatment(reasonText) {
    if (!reasonText) return treatments.find(t => t.service_name.includes('Control')) || treatments[0];
    const low = reasonText.toLowerCase();
    if (low.includes('rc') || low.includes('reconstruc')) {
      return treatments.find(t => t.service_name.toLowerCase().includes('obturación') || t.service_name.toLowerCase().includes('reconstrucción')) || treatments[0];
    }
    if (low.includes('rev') || low.includes('control')) {
      return treatments.find(t => t.service_name.toLowerCase().includes('control') || t.service_name.toLowerCase().includes('revisión')) || treatments[0];
    }
    if (low.includes('limpieza') || low.includes('tartec')) {
      return treatments.find(t => t.service_name.toLowerCase().includes('limpieza') || t.service_name.toLowerCase().includes('tartrectomía')) || treatments[0];
    }
    if (low.includes('invisalign') || low.includes('alineador') || low.includes('ortodoncia') || low.includes('bckts') || low.includes('bracket')) {
      return treatments.find(t => t.service_name.toLowerCase().includes('ortodoncia') || t.service_name.toLowerCase().includes('alineadores')) || treatments[0];
    }
    if (low.includes('cirug')) {
      return treatments.find(t => t.service_name.toLowerCase().includes('cirugía') || t.service_name.toLowerCase().includes('extracción')) || treatments[0];
    }
    return treatments.find(t => t.service_name.toLowerCase().includes('consulta') || t.service_name.toLowerCase().includes('control')) || treatments[0];
  }

  // Citas Albacete
  console.log(`  Procesando ${rawCitasAlb.length} citas de Albacete...`);
  for (const row of rawCitasAlb) {
    const patProp = findProp(row.properties, /paciente/i);
    const patRelId = patProp?.relation?.[0]?.id;
    let patientId = patRelId ? notionPageToPatientId.get(patRelId) : null;

    const dateVal = getPropText(findProp(row.properties, /date|fecha/i));
    if (!dateVal) continue;

    // Tratamiento
    const tratProp = findProp(row.properties, /tratamiento/i);
    const tratRelId = tratProp?.relation?.[0]?.id;
    const refTitle = getPropText(findProp(row.properties, /ref|title/i));
    
    let treatmentName = refTitle;
    let defaultPrice = 0;
    if (tratRelId && notionTreatmentMap.has(tratRelId)) {
      const tInfo = notionTreatmentMap.get(tratRelId);
      if (tInfo.name) treatmentName = treatmentName ? `${tInfo.name} - ${treatmentName}` : tInfo.name;
      if (tInfo.price) defaultPrice = Number(tInfo.price);
    }
    if (!treatmentName) treatmentName = 'Control y Consulta';

    const otroPrecio = Number(getPropText(findProp(row.properties, /otro precio/i)) || 0);
    const precioRollup = Number(getPropText(findProp(row.properties, /^precio/i)) || 0);
    const facturarFormula = Number(getPropText(findProp(row.properties, /facturar/i)) || 0);
    const finalPrice = otroPrecio > 0 ? otroPrecio : (precioRollup > 0 ? precioRollup : defaultPrice);

    const prof = profShirley || profOsly || professionals[0];
    const clinic = clinicBustamante || clinicRyA || clinics[0];
    const treatment = resolveTreatment(treatmentName);

    // Si aún no tenemos patientId, intentar vincular al primer paciente de Albacete de la fecha
    if (!patientId) {
      // Buscar paciente en la lista de Albacete
      for (const [normKey, p] of patientMap.entries()) {
        if (p.isAlbacete && p.savedId) {
          patientId = p.savedId;
          break;
        }
      }
    }
    if (!patientId) continue;

    const apptDate = new Date(`${dateVal}T10:00:00.000Z`).toISOString();

    // Check si ya existe la cita
    const { data: existingAppt } = await supabase
      .from('appointments')
      .select('id')
      .eq('patient_id', patientId)
      .eq('appointment_date', apptDate)
      .limit(1);

    let apptId;
    if (existingAppt && existingAppt.length > 0) {
      apptId = existingAppt[0].id;
    } else {
      const { data: newAppt } = await supabase
        .from('appointments')
        .insert([{
          patient_id: patientId,
          professional_id: prof.id,
          clinic_id: clinic.id,
          treatment_id: treatment.id,
          appointment_date: apptDate,
          reason: treatmentName,
          status: 'Realizada',
          notes: `Cita Albacete importada de Notion. ${refTitle ? 'Ref: ' + refTitle : ''}`
        }])
        .select();

      if (newAppt && newAppt.length > 0) {
        apptId = newAppt[0].id;
        insertedApptsCount++;
      }
    }

    if (apptId && finalPrice > 0) {
      const d = new Date(dateVal);
      const billingMonth = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
      
      const { data: existingBilling } = await supabase
        .from('billing_records')
        .select('id')
        .eq('appointment_id', apptId)
        .limit(1);

      if (!existingBilling || existingBilling.length === 0) {
        await supabase.from('billing_records').insert([{
          appointment_id: apptId,
          custom_price: finalPrice,
          applied_commission_rate: prof.base_commission_percentage || 60,
          applied_lab_discount_rate: clinic.lab_discount_pct || 50,
          calculated_total: finalPrice,
          billing_month: billingMonth,
          status: 'Aprobado'
        }]);
        insertedBillingCount++;
      }
    }
  }

  // Recuento final
  const { count: pTotal } = await supabase.from('patients').select('*', { count: 'exact', head: true });
  const { count: aTotal } = await supabase.from('appointments').select('*', { count: 'exact', head: true });
  const { count: dTotal } = await supabase.from('documents').select('*', { count: 'exact', head: true });
  const { count: bTotal } = await supabase.from('billing_records').select('*', { count: 'exact', head: true });

  console.log('\n====================================================');
  console.log('🎉 REPORTE FINAL DE PRODUCCIÓN');
  console.log('====================================================');
  console.log(`✅ Total Pacientes en Cloud:       ${pTotal}`);
  console.log(`✅ Total Citas en Cloud:           ${aTotal}`);
  console.log(`✅ Total Fotos y Documentos:       ${dTotal}`);
  console.log(`✅ Total Registros Facturación:    ${bTotal}`);
  console.log('====================================================\n');
}

main().catch(console.error);
