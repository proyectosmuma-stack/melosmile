import { supabaseAdmin as supabase } from "@/lib/supabase/server";
import { archivePastReminders, type CleanupResult } from "./cleanup";
import { syncAppointmentCadence } from "./cadence";

/**
 * Mantenimiento determinista del sistema de recordatorios — SIN cron ni n8n.
 *
 * Se ejecuta de forma perezosa (lazy) cuando la aplicación consulta los recordatorios:
 *   1. Archiva los recordatorios cuya cita ya pasó (soft-archive, ver cleanup.ts).
 *   2. Backfill: asegura la cadencia (1 semana / 2 días / día de la cita) para las
 *      citas próximas que aún no tienen recordatorios (p. ej. citas creadas antes
 *      de activarse la creación automática).
 *
 * Es idempotente y lleva un throttle en memoria para no repetirse en cada request.
 */

const THROTTLE_MS = 5 * 60 * 1000; // 5 minutos
const BACKFILL_DAYS = 30; // ventana de citas a cubrir
const BACKFILL_LIMIT = 10; // máximo de citas a reparar por pasada (protege la latencia)

let lastRunMs = 0;

export interface MaintenanceResult {
  ran: boolean;
  reason?: string;
  archived?: CleanupResult;
  backfilled?: number;
}

export async function runReminderMaintenance(force = false): Promise<MaintenanceResult> {
  const nowMs = Date.now();
  if (!force && nowMs - lastRunMs < THROTTLE_MS) {
    return { ran: false, reason: "throttled" };
  }
  lastRunMs = nowMs;

  // 1. Archivar recordatorios cuya cita ya pasó.
  const archived = await archivePastReminders();

  // 2. Backfill de cadencias para citas próximas sin recordatorios.
  let backfilled = 0;
  try {
    const nowIso = new Date(nowMs).toISOString();
    const horizonIso = new Date(nowMs + BACKFILL_DAYS * 86_400_000).toISOString();

    const { data: upcoming, error } = await (supabase as any)
      .from("appointments")
      .select("id")
      .gt("appointment_date", nowIso)
      .lte("appointment_date", horizonIso)
      .neq("status", "Cancelada")
      .limit(BACKFILL_LIMIT * 5);

    if (!error && upcoming && upcoming.length > 0) {
      const apptIds: string[] = upcoming.map((a: any) => a.id);

      const { data: existing } = await (supabase as any)
        .from("reminders")
        .select("appointment_id")
        .in("appointment_id", apptIds)
        .eq("reminder_type", "recordatorio_cita")
        .is("archived_at", null);

      const covered = new Set<string>((existing || []).map((r: any) => String(r.appointment_id)));
      const missing = apptIds.filter((id) => !covered.has(String(id))).slice(0, BACKFILL_LIMIT);

      // Secuencial a propósito: evita saturar el pool de conexiones de Supabase.
      for (const id of missing) {
        const res = await syncAppointmentCadence(id, "backfill automático");
        if (res.created > 0) backfilled++;
      }
    }
  } catch (e: any) {
    console.warn("[runReminderMaintenance] backfill error:", e?.message || e);
  }

  return { ran: true, archived, backfilled };
}
