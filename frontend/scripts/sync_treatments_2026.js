#!/usr/bin/env node
/**
 * sync_treatments_2026.js
 * Migración idempotente del catálogo de tratamientos MeloSmile 2026
 * 
 * Ejecutar: node scripts/sync_treatments_2026.js
 * 
 * Acciones:
 *  1. Crea/actualiza familias de tratamiento 2026
 *  2. Consolida tratamientos existentes (renombra + actualiza precio)
 *  3. Inserta nuevos tratamientos 2026
 *  4. Marca como is_active=false los legacy fuera del catálogo 2026
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── FAMILIAS REQUERIDAS 2026 ────────────────────────────────────────────────
const FAMILIES_2026 = [
  { name: 'Ortodoncia interceptiva miofuncional', color: '#85348c', description: 'Tratamientos Myobrace y miofuncionales' },
  { name: 'Prevención y remineralización',        color: '#9b59b6', description: 'Remineralización, fluoración y prevención de caries' },
  { name: 'Odontología restauradora',             color: '#6c5ce7', description: 'Obturaciones, reconstrucciones y restauraciones' },
  { name: 'Endodoncia pediátrica',                color: '#a29bfe', description: 'Pulpotomías, pulpectomías y tratamientos de conductos infantiles' },
  { name: 'Cirugía pediátrica',                   color: '#fd79a8', description: 'Extracciones, operculectomías y cirugías menores' },
  { name: 'Terapia miofuncional',                 color: '#e17055', description: 'Control de hábitos orales y reeducación muscular' },
  { name: 'Ortodoncia interceptiva',              color: '#00b894', description: 'Mantenedores de espacio y ortodoncia temprana' },
  { name: 'Diagnóstico por imagen',               color: '#0984e3', description: 'Radiografías, ortopantomografías y estudios' },
  { name: 'Prevención y diagnóstico',             color: '#00cec9', description: 'Revisiones, higiene y diagnóstico preventivo' },
  { name: 'Odontopediatría',                      color: '#fdcb6e', description: 'Odontología infantil general' },
];

// ─── CONSOLIDACIÓN: nombre DB → nombre oficial 2026 ─────────────────────────
const CONSOLIDATION_MAP = [
  { dbName: 'Fluorización',                  newName: 'Fluoración tópica profesional',       newPrice: 50,   family: 'Prevención y diagnóstico' },
  { dbName: 'Sellado de Fosas y Fisuras',    newName: 'Sellador de fisuras',                 newPrice: 40,   family: 'Prevención y diagnóstico' },
  { dbName: 'Pulpotomía',                    newName: 'Pulpotomía infantil convencional',    newPrice: 100,  family: 'Endodoncia pediátrica' },
  { dbName: 'Corona Pediátrica (Acero)',     newName: 'Corona metálica (por separado)',      newPrice: 110,  family: 'Odontología restauradora' },
  { dbName: 'Ortopantomografía / Panorámica', newName: 'Ortopantomografía infantil',         newPrice: 35,   family: 'Diagnóstico por imagen' },
  { dbName: 'Radiografía Periapical',        newName: 'Radiografía intraoral periapical / aleta', newPrice: 20, family: 'Diagnóstico por imagen' },
  { dbName: 'Limpieza Dental Ultrasónica',   newName: 'Limpieza / profilaxis infantil',      newPrice: 50,   family: 'Prevención y diagnóstico' },
  { dbName: 'Primera Visita / Valoración',   newName: 'Primera visita y diagnóstico infantil', newPrice: 0,  family: 'Prevención y diagnóstico' },
  { dbName: 'Revisión Periódica',            newName: 'Revisión periódica preventiva infantil', newPrice: 40, family: 'Prevención y diagnóstico' },
  { dbName: 'Obturación Compuesta',          newName: 'Obturación en diente permanente',    newPrice: 80,   family: 'Odontología restauradora' },
  { dbName: 'Obturación Simple',             newName: 'Obturación en diente temporal',      newPrice: 65,   family: 'Odontología restauradora' },
  { dbName: 'Aparato Funcional',             newName: 'Aparatología interceptiva individual (Hawley / McNamara / Carrier)', newPrice: 500, family: 'Ortodoncia interceptiva' },
];

// ─── NUEVOS TRATAMIENTOS 2026 ────────────────────────────────────────────────
const NEW_TREATMENTS_2026 = [
  // MYOBRACE
  { name: 'Myobrace J1',  price: 1500, family: 'Ortodoncia interceptiva miofuncional', description: 'Myobrace Etapa J1 · 3-6 años · Hábito y respiración nasal' },
  { name: 'Myobrace J2',  price: 1500, family: 'Ortodoncia interceptiva miofuncional', description: 'Myobrace Etapa J2 · 4-7 años · Desarrollo de arcada' },
  { name: 'Myobrace J3',  price: 1500, family: 'Ortodoncia interceptiva miofuncional', description: 'Myobrace Etapa J3 · 4-7 años · Posición lingual' },
  { name: 'Myobrace K1',  price: 1700, family: 'Ortodoncia interceptiva miofuncional', description: 'Myobrace Etapa K1 · 6-10 años · Corrección de arcada temprana' },
  { name: 'Myobrace K2',  price: 1700, family: 'Ortodoncia interceptiva miofuncional', description: 'Myobrace Etapa K2 · 6-10 años · Expansión y posicionamiento' },
  { name: 'Myobrace K3',  price: 1700, family: 'Ortodoncia interceptiva miofuncional', description: 'Myobrace Etapa K3 · 6-10 años · Alineación dental temprana' },
  { name: 'Myobrace T1',  price: 2100, family: 'Ortodoncia interceptiva miofuncional', description: 'Myobrace Etapa T1 · 8-15 años · Maloclusión mixta' },
  { name: 'Myobrace T2',  price: 2100, family: 'Ortodoncia interceptiva miofuncional', description: 'Myobrace Etapa T2 · 8-15 años · Tratamiento activo' },
  { name: 'Myobrace T3',  price: 2100, family: 'Ortodoncia interceptiva miofuncional', description: 'Myobrace Etapa T3 · 8-15 años · Retención y mantenimiento' },
  { name: 'Myobrace T4',  price: 2100, family: 'Ortodoncia interceptiva miofuncional', description: 'Myobrace Etapa T4 · 8-15 años · Finalización' },
  { name: 'Myobrace A1',  price: 2500, family: 'Ortodoncia interceptiva miofuncional', description: 'Myobrace Adulto A1 · Fase inicial adulto' },
  { name: 'Myobrace A2',  price: 2500, family: 'Ortodoncia interceptiva miofuncional', description: 'Myobrace Adulto A2 · Fase activa adulto' },
  { name: 'Myobrace A3',  price: 2500, family: 'Ortodoncia interceptiva miofuncional', description: 'Myobrace Adulto A3 · Retención adulto' },
  { name: 'Estudio Ortodoncia Myobrace', price: 224, family: 'Diagnóstico por imagen', description: 'Estudio diagnóstico completo para protocolo Myobrace' },
  { name: 'Mensualidad Tratamiento Myobrace', price: 95, family: 'Ortodoncia interceptiva miofuncional', description: 'Cuota mensual de seguimiento activo Myobrace' },
  // REMINERALIZACIÓN
  { name: 'Remineralización bioactiva tópica (APAPRO)',          price: 172.68, family: 'Prevención y remineralización', description: 'Protocolo APAPRO con fosfopéptido de caseína' },
  { name: 'Regeneración guiada mancha blanca (Caries incipiente)', price: 246.63, family: 'Prevención y remineralización', description: 'Icon + APAPRO + transiluminación fotográfica' },
  { name: 'Regeneración guiada HIM / MIH (4 sesiones) como mínimo', price: 246.63, family: 'Prevención y remineralización', description: 'Protocolo HIM/MIH con Curodont + APAPRO mínimo 4 sesiones' },
  { name: 'Curodont Repair (Aplicación directa)',                 price: 125,    family: 'Prevención y remineralización', description: 'Aplicación directa Curodont Repair P11-4' },
  { name: 'Infiltración resinosa (Icon)',                        price: 150,    family: 'Prevención y remineralización', description: 'Técnica Icon para manchas de esmalte interproximal' },
  { name: 'Barniz de flúor profesional',                         price: 45,     family: 'Prevención y remineralización', description: 'Aplicación barniz fluorado de alta concentración' },
  { name: 'Seguimiento fotográfico y transiluminación',           price: 35,     family: 'Prevención y remineralización', description: 'Control fotográfico clínico con transiluminación DIAGNOdent' },
  // ODONTOPEDIATRÍA AVANZADA
  { name: 'Reconstrucción sin anestesia / Biomineralización (Caries incipiente)', price: 80, family: 'Odontología restauradora', description: 'Técnica no invasiva con BRIX 3000 para caries inicial' },
  { name: 'Caries avanzada / Técnica BSMART (sin turbina ni anestesia)',          price: 122.76, family: 'Odontología restauradora', description: 'Remoción selectiva Brix 6m + Biodentine XP + Stella automix' },
  { name: 'Regeneración pulpar / Recubrimiento pulpar directo',                   price: 122.76, family: 'Odontología restauradora', description: 'Remoción selectiva + Biodentine XP + torunda algodón 1m' },
  { name: 'Terapia pulpar vital con biocerámicos (Pulpotomía vital)',             price: 140,  family: 'Endodoncia pediátrica', description: '1-2 citas, remoción selectiva + sellado Biodentine 12m' },
  { name: 'Terapia pulpar no vital con biocerámicos',                             price: 180,  family: 'Endodoncia pediátrica', description: '2-3 citas, CHX + Ca(OH)2 + Biodentine (sin corona incluida)' },
  { name: 'Pulpectomía infantil convencional',                                    price: 130,  family: 'Endodoncia pediátrica', description: 'Tratamiento de conductos en dientes temporales' },
  { name: 'Apicoformación / Cierre apical (por sesión)',                          price: 95,   family: 'Endodoncia pediátrica', description: 'Tratamiento completo en 1 o varias sesiones según técnica' },
  { name: 'Educación en higiene y dieta',                                         price: 40,   family: 'Prevención y diagnóstico', description: 'Entrenamiento en cepillado y asesoramiento dietético' },
  { name: 'Adaptación de paciente a consulta',                                    price: 45,   family: 'Prevención y diagnóstico', description: 'Manejo conductual desensibilizante para pacientes aprensivos' },
  { name: 'Corona pediátrica estética (por separado)',                            price: 140,  family: 'Odontología restauradora', description: 'Corona estética biocompatible para sector anterior/posterior' },
  { name: 'Extracción de diente temporal',                                        price: 55,   family: 'Cirugía pediátrica', description: 'Exodoncia simple con anestesia tópica/infiltrativa' },
  { name: 'Operculectomía (Ventana de erupción)',                                 price: 150,  family: 'Cirugía pediátrica', description: 'Liberación mucosa para guiar erupción dental' },
  { name: 'Mantenedor de espacio fijo unilateral',                               price: 110,  family: 'Ortodoncia interceptiva', description: 'Banda-asa o corona-asa individualizada' },
  { name: 'Mantenedor de espacio removible',                                      price: 105,  family: 'Ortodoncia interceptiva', description: 'Placa de mantenimiento con retención de acrílico' },
  { name: 'Mantenedor de espacio fijo bilateral (Arco lingual / Nance)',          price: 220,  family: 'Ortodoncia interceptiva', description: 'Arco lingual inferior o Botón de Nance superior' },
  { name: 'Control de hábito oral',                                               price: 200,  family: 'Terapia miofuncional', description: 'Protocolo reeducación muscular y corrección disfunciones orales' },
  { name: 'Ortodoncia interceptiva (Tratamiento hasta 12 meses)',                 price: 1600, family: 'Ortodoncia interceptiva', description: 'Tratamiento interceptivo completo hasta 12 meses, dentición mixta' },
  { name: 'Ortodoncia interceptiva (Tratamiento hasta 18 meses)',                 price: 1850, family: 'Ortodoncia interceptiva', description: 'Tratamiento ortopédico/interceptivo hasta 18 meses' },
  { name: 'Expansión maxilar (Disyuntor Hyrax / McNamara)',                      price: 1600, family: 'Ortodoncia interceptiva', description: 'Disyuntor palatino, tornillo rápido, controles y retención' },
];

// ─── LEGACY (marcar is_active=false) ────────────────────────────────────────
const LEGACY_NAMES = [
  'Blanqueamiento Dental', 'Blanqueamiento LED', 'Cambio de Arcos',
  'Carilla Cerámica', 'CBCT / TAC Dental', 'Cirugía Periodontal',
  'Composite Estético', 'Control / Revisión General', 'Control de Ortodoncia',
  'Control y Revisión', 'Corona Metal-Porcelana', 'Corona sobre Implante',
  'Corona Zirconio', 'Curetaje Periodontal', 'Diseño de Sonrisa',
  'Elevación de Seno', 'Endodoncia Birradicular', 'Endodoncia Multirradicular',
  'Endodoncia Unirradicular', 'Extracción Quirúrgica', 'Extracción Simple',
  'Implante Dental', 'Incrustación / Inlay-Onlay', 'Injerto Óseo',
  'Ortodoncia - Alineadores Invisalign', 'Ortodoncia Brackets Cerámicos',
  'Ortodoncia Brackets Metálicos', 'Ortodoncia Invisible / Alineadores',
  'Periodoncia Básica', 'Placa de Descarga', 'Prótesis Removible Completa',
  'Prótesis Removible Parcial', 'Puente Dental', 'RAR / Raspado y Alisado Radicular',
  'Retenedor Fijo', 'Retenedor Removible', 'Retratamiento de Conducto',
  'Revisión de Ortodoncia', 'Revisión Rutinaria', 'Tartrectomía / Limpieza Dental',
  'Urgencia Dental',
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function log(msg) { console.log(`  ${msg}`); }
function ok(msg)  { console.log(`  ✅ ${msg}`); }
function warn(msg){ console.log(`  ⚠️  ${msg}`); }
function err(msg) { console.log(`  ❌ ${msg}`); }

async function getOrCreateFamily(name, color, description) {
  const { data: existing } = await supabase
    .from('treatment_families')
    .select('id')
    .eq('name', name)
    .single();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from('treatment_families')
    .insert({ name, color_hex: color, description })
    .select('id')
    .single();
  if (error) throw new Error(`Error creando familia "${name}": ${error.message}`);
  ok(`Familia creada: "${name}"`);
  return created.id;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🦷 SYNC TREATMENTS 2026 — MeloSmile\n');
  console.log(`📡 Supabase: ${SUPABASE_URL}\n`);

  // ── PASO 1: Familias ──────────────────────────────────────────────────────
  console.log('━'.repeat(60));
  console.log('PASO 1/4 — Crear/verificar familias de tratamiento 2026');
  console.log('━'.repeat(60));
  const familyIdMap = {};
  for (const fam of FAMILIES_2026) {
    familyIdMap[fam.name] = await getOrCreateFamily(fam.name, fam.color, fam.description);
    log(`Familia OK: "${fam.name}" → ${familyIdMap[fam.name]}`);
  }

  // ── PASO 2: Consolidación (renombrar + actualizar precio) ─────────────────
  console.log('\n' + '━'.repeat(60));
  console.log('PASO 2/4 — Consolidar tratamientos (renombrar + precio)');
  console.log('━'.repeat(60));
  let consolidated = 0;
  for (const map of CONSOLIDATION_MAP) {
    const familyId = familyIdMap[map.family];
    const { data: existing } = await supabase
      .from('treatments')
      .select('id, service_name, default_price')
      .eq('service_name', map.dbName)
      .single();

    if (!existing) {
      warn(`No encontrado en DB: "${map.dbName}" — omitido`);
      continue;
    }

    const { error } = await supabase
      .from('treatments')
      .update({
        service_name: map.newName,
        default_price: map.newPrice,
        family_id: familyId,
        is_active: true,
      })
      .eq('id', existing.id);

    if (error) {
      err(`Error consolidando "${map.dbName}": ${error.message}`);
    } else {
      ok(`"${map.dbName}" → "${map.newName}" | ${map.newPrice}€`);
      consolidated++;
    }
  }
  log(`\n${consolidated}/${CONSOLIDATION_MAP.length} consolidados`);

  // ── PASO 3: Insertar nuevos tratamientos ──────────────────────────────────
  console.log('\n' + '━'.repeat(60));
  console.log('PASO 3/4 — Insertar nuevos tratamientos 2026');
  console.log('━'.repeat(60));
  let inserted = 0, skipped = 0;
  for (const t of NEW_TREATMENTS_2026) {
    const familyId = familyIdMap[t.family];
    
    // Check if already exists (idempotent)
    const { data: exists } = await supabase
      .from('treatments')
      .select('id')
      .eq('service_name', t.name)
      .single();

    if (exists) {
      // Update price and family if already exists
      await supabase.from('treatments').update({
        default_price: t.price,
        family_id: familyId,
        is_active: true,
        description: t.description,
      }).eq('id', exists.id);
      log(`Ya existe (actualizado): "${t.name}"`);
      skipped++;
      continue;
    }

    const { error } = await supabase.from('treatments').insert({
      service_name: t.name,
      default_price: t.price,
      family_id: familyId,
      description: t.description,
      is_active: true,
    });

    if (error) {
      err(`Error insertando "${t.name}": ${error.message}`);
    } else {
      ok(`Insertado: "${t.name}" | ${t.price}€`);
      inserted++;
    }
  }
  log(`\n${inserted} insertados, ${skipped} ya existían (actualizados)`);

  // ── PASO 4: Marcar legacy como is_active=false ────────────────────────────
  console.log('\n' + '━'.repeat(60));
  console.log('PASO 4/4 — Marcar tratamientos legacy como inactivos');
  console.log('━'.repeat(60));
  let deactivated = 0;
  for (const name of LEGACY_NAMES) {
    const { error } = await supabase
      .from('treatments')
      .update({ is_active: false })
      .eq('service_name', name);

    if (error) {
      err(`Error desactivando "${name}": ${error.message}`);
    } else {
      log(`Desactivado: "${name}"`);
      deactivated++;
    }
  }
  log(`\n${deactivated}/${LEGACY_NAMES.length} tratamientos legacy desactivados`);

  // ── RESUMEN FINAL ─────────────────────────────────────────────────────────
  console.log('\n' + '━'.repeat(60));
  console.log('📊 RESUMEN FINAL');
  console.log('━'.repeat(60));
  const { count } = await supabase.from('treatments').select('*', { count: 'exact', head: true }).eq('is_active', true);
  console.log(`  ✅ Tratamientos activos en DB: ${count}`);
  console.log(`  🔄 Consolidados/renombrados:   ${consolidated}`);
  console.log(`  🆕 Nuevos insertados:          ${inserted}`);
  console.log(`  📦 Ya existían (actualizados): ${skipped}`);
  console.log(`  ⚠️  Legacy desactivados:        ${deactivated}`);
  console.log('\n🎉 Migración completada. Verifica en /settings/treatments\n');
}

main().catch(console.error);
