import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const localUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const localServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const localClient = createClient(localUrl, localServiceKey);

dotenv.config({ path: path.resolve(__dirname, '../.env.remote') });
const remoteUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const remoteServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const remoteClient = remoteUrl && remoteServiceKey ? createClient(remoteUrl, remoteServiceKey) : null;

async function deduplicateCatalogFor(supabase, nameTag) {
  console.log(`\n🧹 Limpiando duplicados de catálogo en ${nameTag}...`);

  // 1. Deduplicate Clinics
  const { data: clinics } = await supabase.from('clinics').select('*').order('created_at', { ascending: true });
  if (clinics) {
    const seenNames = new Map();
    for (const c of clinics) {
      if (!seenNames.has(c.name)) {
        seenNames.set(c.name, c.id);
      } else {
        const canonicalId = seenNames.get(c.name);
        console.log(`  🏢 Fusionando clínica duplicada "${c.name}" (ID duplicado: ${c.id} -> Canon: ${canonicalId})`);
        
        // Re-link references before deleting
        await supabase.from('patient_clinics').update({ clinic_id: canonicalId }).eq('clinic_id', c.id);
        await supabase.from('professional_clinics').update({ clinic_id: canonicalId }).eq('clinic_id', c.id);
        await supabase.from('appointments').update({ clinic_id: canonicalId }).eq('clinic_id', c.id);
        await supabase.from('clinic_commission_rules').delete().eq('clinic_id', c.id);
        await supabase.from('clinics').delete().eq('id', c.id);
      }
    }
  }

  // 2. Deduplicate Professionals
  const { data: profs } = await supabase.from('professionals').select('*').order('created_at', { ascending: true });
  if (profs) {
    const seenProfs = new Map();
    for (const p of profs) {
      const key = `${p.first_name}_${p.last_name}`;
      if (!seenProfs.has(key)) {
        seenProfs.set(key, p.id);
      } else {
        const canonicalId = seenProfs.get(key);
        console.log(`  👨‍⚕️ Fusionando profesional duplicado "${p.first_name} ${p.last_name}" (ID duplicado: ${p.id} -> Canon: ${canonicalId})`);

        await supabase.from('professional_clinics').update({ professional_id: canonicalId }).eq('professional_id', p.id);
        await supabase.from('appointments').update({ professional_id: canonicalId }).eq('professional_id', p.id);
        await supabase.from('professionals').delete().eq('id', p.id);
      }
    }
  }

  // 3. Deduplicate Treatments
  const { data: treatments } = await supabase.from('treatments').select('*').order('created_at', { ascending: true });
  if (treatments) {
    const seenTreatments = new Map();
    for (const t of treatments) {
      if (!seenTreatments.has(t.service_name)) {
        seenTreatments.set(t.service_name, t.id);
      } else {
        const canonicalId = seenTreatments.get(t.service_name);
        console.log(`  🦷 Fusionando tratamiento duplicado "${t.service_name}" (ID duplicado: ${t.id} -> Canon: ${canonicalId})`);

        await supabase.from('appointments').update({ treatment_id: canonicalId }).eq('treatment_id', t.id);
        await supabase.from('clinic_treatments').delete().eq('treatment_id', t.id);
        await supabase.from('treatment_clinic_prices').delete().eq('treatment_id', t.id);
        await supabase.from('treatments').delete().eq('id', t.id);
      }
    }
  }

  console.log(`✅ ${nameTag} depurado correctamente.`);
}

async function main() {
  await deduplicateCatalogFor(localClient, 'Supabase Local');
  if (remoteClient) {
    await deduplicateCatalogFor(remoteClient, 'Supabase Cloud');
  }
}

main().catch(console.error);
