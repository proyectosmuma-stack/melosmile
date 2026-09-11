import { supabaseAdmin as supabase } from "@/lib/supabase/server";
import { dispatchReminder } from "./dispatch";

export interface ProcessDueResult {
  success: boolean;
  totalFound: number;
  dispatched: number;
  skipped: number;
  errors: number;
  details: Array<{
    id: string;
    channel: string;
    scheduled_at: string;
    success: boolean;
    error?: string;
  }>;
}

/**
 * Procesa y despacha recordatorios que hayan alcanzado su fecha/hora programada
 * (scheduled_at <= NOW() y status = 'pendiente'), respetando estrictamente:
 * 1. El texto original del mensaje (sin alteraciones).
 * 2. La hora programada (nunca se envían antes de tiempo).
 * 3. El retardo humano aleatorio de 30 a 60 segundos entre mensajes de WhatsApp.
 */
export async function processDueReminders(limit = 15): Promise<ProcessDueResult> {
  const nowIso = new Date().toISOString();

  // 1. Obtener recordatorios pendientes cuya hora programada ya haya llegado
  const { data: dueReminders, error } = await (supabase as any)
    .from("reminders")
    .select("id, patient_id, appointment_id, channel, scheduled_at, status")
    .eq("status", "pendiente")
    .lte("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[processDueReminders] Error buscando recordatorios vencidos:", error);
    return {
      success: false,
      totalFound: 0,
      dispatched: 0,
      skipped: 0,
      errors: 1,
      details: [],
    };
  }

  if (!dueReminders || dueReminders.length === 0) {
    return {
      success: true,
      totalFound: 0,
      dispatched: 0,
      skipped: 0,
      errors: 0,
      details: [],
    };
  }

  console.log(`[processDueReminders] Procesando ${dueReminders.length} recordatorios pendientes vencidos a las ${nowIso}...`);

  const details: ProcessDueResult["details"] = [];
  let dispatched = 0;
  let errors = 0;
  let skipped = 0;

  for (const reminder of dueReminders) {
    try {
      const result = await dispatchReminder(reminder.id);
      if (result.success) {
        dispatched++;
        details.push({
          id: reminder.id,
          channel: reminder.channel,
          scheduled_at: reminder.scheduled_at,
          success: true,
        });
      } else {
        if (result.error?.includes("cancelada")) {
          skipped++;
        } else {
          errors++;
        }
        details.push({
          id: reminder.id,
          channel: reminder.channel,
          scheduled_at: reminder.scheduled_at,
          success: false,
          error: result.error,
        });
      }
    } catch (dispatchErr: any) {
      errors++;
      details.push({
        id: reminder.id,
        channel: reminder.channel,
        scheduled_at: reminder.scheduled_at,
        success: false,
        error: dispatchErr.message,
      });
    }
  }

  return {
    success: true,
    totalFound: dueReminders.length,
    dispatched,
    skipped,
    errors,
    details,
  };
}
