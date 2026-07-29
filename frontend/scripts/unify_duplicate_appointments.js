import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function unifyDuplicates() {
  console.log("🔄 Ejecutando unificación de citas duplicadas según reglas de AGENTS.md...");

  const { data: appts, error } = await supabase
    .from('appointments')
    .select('id, patient_id, appointment_date, reason, notes, clinic_id, professional_id, created_at')
    .order('appointment_date', { ascending: true })
    .order('created_at', { ascending: true });

  if (error || !appts) {
    console.error("❌ Error consultando citas:", error);
    return;
  }

  const map = {};
  for (const a of appts) {
    const key = `${a.patient_id}_${a.appointment_date}`;
    if (!map[key]) map[key] = [];
    map[key].push(a);
  }

  let unifiedCount = 0;

  for (const [key, group] of Object.entries(map)) {
    if (group.length > 1) {
      console.log(`📍 Unificando ${group.length} citas solapadas para clave ${key}`);
      const keep = group[0];
      const toDelete = group.slice(1);

      const combinedReasons = Array.from(new Set(group.map(g => g.reason).filter(Boolean))).join(" + ");
      
      let allProcedures = [];
      for (const g of group) {
        const match = (g.notes || "").match(/\[Procedimientos: (\[.*\])\]/);
        if (match) {
          try {
            const procs = JSON.parse(match[1]);
            allProcedures.push(...procs);
          } catch(e) {}
        }
      }

      const updatedNotes = `Agendada por Asistente IA (Unificada)\n\n[Procedimientos: ${JSON.stringify(allProcedures)}]`;

      await supabase.from('appointments').update({
        reason: combinedReasons,
        notes: updatedNotes,
      }).eq('id', keep.id);

      for (const extra of toDelete) {
        await supabase.from('billing_records').delete().eq('appointment_id', extra.id);
        await supabase.from('appointments').delete().eq('id', extra.id);
      }

      unifiedCount++;
    }
  }

  console.log(`✅ Unificación completada. Citas unificadas: ${unifiedCount}`);
}

unifyDuplicates().catch(console.error);
