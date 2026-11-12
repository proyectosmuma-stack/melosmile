import { supabaseAdmin as supabase } from "@/lib/supabase/server";

/** Horas de gracia tras la cita antes de archivar (cubre recordatorios post-operatorios/encuestas). */
const GRACE_HOURS = 48;
/** Limite defensivo de filas por pasada. */
const SCAN_LIMIT = 5000;

export interface CleanupResult {
  success: boolean;
  scanned: number;
  /** Pendientes obsoletos (su cita ya pasó y nunca se enviaron) -> status 'cancelado'. */
  cancelled: number;
  /** Histórico (enviado/error/leido/cancelado) con cita pasada -> solo archived_at. */
  archived: number;
  /** Filas intactas (cita futura, dentro de gracia, o sin cita no obsoleta). */
  skipped: number;
  error?: string;
}

/**
 * Archiva automáticamente los recordatorios cuya cita ya ha pasado.
 *
 * Reglas (aprobadas por el CTO):
 * - Cita pasada hace más de GRACE_HOURS:
 *     · `pendiente`                              -> se cancela (status='cancelado') y se archiva.
 *     · `enviado` | `error` | `leido` | `cancelado` -> se archiva (solo archived_at).
 * - Sin cita (appointment_id NULL): `pendiente` con `scheduled_at` > GRACE_HOURS de
 *   antigüedad -> se cancela y archiva (obsoleto, jamás llegará a enviarse).
 * - Cita futura o dentro del periodo de gracia -> NO se toca.
 *
 * Idempotente y seguro: solo actúa sobre filas con `archived_at IS NULL`, y jamás
 * toca recordatorios cuya cita sea futura (p. ej. una cita reprogramada).
 */
export async function archivePastReminders(): Promise<CleanupResult> {
  const result: CleanupResult = {
    success: true,
    scanned: 0,
    cancelled: 0,
    archived: 0,
    skipped: 0,
  };

  try {
    const nowMs = Date.now();
    const graceMs = GRACE_HOURS * 60 * 60 * 1000;
    const nowIso = new Date(nowMs).toISOString();

    const { data: rows, error } = await (supabase as any)
      .from("reminders")
      .select("id, status, scheduled_at, appointment_id, appointments(appointment_date)")
      .is("archived_at", null)
      .limit(SCAN_LIMIT);

    if (error) {
      return { ...result, success: false, error: error.message };
    }

    const all: any[] = rows || [];
    result.scanned = all.length;

    const cancelIds: string[] = [];
    const archiveIds: string[] = [];

    for (const r of all) {
      const apptDate = r.appointments?.appointment_date
        ? new Date(r.appointments.appointment_date)
        : null;

      if (apptDate) {
        // Cita futura o aún dentro de la ventana de gracia -> no tocar.
        if (apptDate.getTime() > nowMs - graceMs) {
          result.skipped++;
          continue;
        }
        if (r.status === "pendiente") cancelIds.push(r.id);
        else archiveIds.push(r.id);
        continue;
      }

      // Sin cita: solo se limpia un `pendiente` claramente obsoleto.
      const schedMs = r.scheduled_at ? new Date(r.scheduled_at).getTime() : 0;
      if (r.status === "pendiente" && schedMs > 0 && schedMs < nowMs - graceMs) {
        cancelIds.push(r.id);
      } else {
        result.skipped++;
      }
    }

    if (cancelIds.length > 0) {
      const { error: cErr } = await (supabase as any)
        .from("reminders")
        .update({
          status: "cancelado",
          error_message: "Cita caducada (auto-archivado)",
          archived_at: nowIso,
        })
        .in("id", cancelIds)
        .is("archived_at", null);

      if (cErr) return { ...result, success: false, error: cErr.message };

      await (supabase as any).from("reminder_events").insert(
        cancelIds.map((id) => ({
          reminder_id: id,
          event_type: "cancelled",
          description: "Cancelado y archivado automáticamente (cita caducada)",
        }))
      );
      result.cancelled = cancelIds.length;
    }

    if (archiveIds.length > 0) {
      const { error: aErr } = await (supabase as any)
        .from("reminders")
        .update({ archived_at: nowIso })
        .in("id", archiveIds)
        .is("archived_at", null);

      if (aErr) return { ...result, success: false, error: aErr.message };

      await (supabase as any).from("reminder_events").insert(
        archiveIds.map((id) => ({
          reminder_id: id,
          event_type: "archived",
          description: "Archivado automáticamente (cita transcurrida)",
        }))
      );
      result.archived = archiveIds.length;
    }

    console.log(
      `[archivePastReminders] scanned=${result.scanned} cancelled=${result.cancelled} archived=${result.archived} skipped=${result.skipped}`
    );
    return result;
  } catch (e: any) {
    return { ...result, success: false, error: e?.message || "Error en archivePastReminders" };
  }
}
