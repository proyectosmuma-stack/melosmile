import { NextResponse } from "next/server";
import { processDueReminders, getDueReminders } from "@/lib/reminders/scheduler";
import { dispatchReminder } from "@/lib/reminders/dispatch";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;
  const apiKey = request.headers.get("x-api-key");
  const validApiKey = process.env.N8N_API_KEY || "melosmile_internal_n8n_key_2026";
  return apiKey === validApiKey;
}

export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);

    // Modo LISTA (para el worker n8n): devuelve los vencidos SIN enviar nada
    if (searchParams.get("mode") === "list") {
      const limit = Number(searchParams.get("limit") || 15);
      const { data, error } = await getDueReminders(limit);
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, count: data.length, items: data });
    }

    // Modo ALERTAS: fallos de envío, atascados y datos incompletos (avisador n8n)
    if (searchParams.get("mode") === "alerts") {
      const supabase = (await import("@/lib/supabase/server")).supabaseAdmin as any;
      const fresh = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const horizon = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      // 1) Fallos de envío de las últimas 24h
      const { data: errored } = await supabase
        .from("reminders")
        .select("id, patient_id, scheduled_at, status, error_message, patients(first_name, last_name, phone), appointments(appointment_date)")
        .eq("status", "error")
        .gte("scheduled_at", fresh)
        .order("scheduled_at", { ascending: true })
        .limit(50);

      // 2) Pendientes de los próximos 14 días (para detectar datos incompletos y atascados)
      const { data: pending } = await supabase
        .from("reminders")
        .select("id, patient_id, scheduled_at, status, patients(first_name, last_name, phone), appointments(appointment_date)")
        .eq("status", "pendiente")
        .gte("scheduled_at", fresh)
        .lte("scheduled_at", horizon)
        .order("scheduled_at", { ascending: true })
        .limit(100);

      const rows = [...(errored || []), ...(pending || [])];
      const classified = rows
        .map((r: any) => {
          const apptDate = r.appointments?.appointment_date ? new Date(r.appointments.appointment_date) : null;
          if (apptDate && apptDate.getTime() < Date.now()) return null; // citas ya pasadas: no alertar
          const hasPhone = Boolean(r.patients?.phone);
          let type: string | null = null;
          if (r.status === "error") type = hasPhone ? "send_error" : "missing_phone";
          else if (!hasPhone) type = "missing_phone";
          else if (new Date(r.scheduled_at).getTime() < Date.now() - 30 * 60 * 1000) type = "stuck";
          if (!type) return null;
          return {
            id: r.id,
            type,
            patient_id: r.patient_id,
            patient: `${r.patients?.first_name || ""} ${r.patients?.last_name || ""}`.trim() || "Paciente",
            phone: r.patients?.phone || null,
            scheduled_at: r.scheduled_at,
            appointment_date: r.appointments?.appointment_date || null,
            error_message: r.error_message || null,
          };
        })
        .filter(Boolean);

      // Dedup: no repetir el aviso del mismo recordatorio antes de 6h
      let items = classified;
      if (classified.length > 0) {
        const ids = classified.map((r: any) => r.id);
        const { data: events } = await supabase
          .from("reminder_events")
          .select("reminder_id, created_at")
          .eq("event_type", "alert_sent")
          .in("reminder_id", ids)
          .order("created_at", { ascending: false });

        const lastAlert = new Map<string, number>();
        for (const e of events || []) {
          const t = new Date(e.created_at).getTime();
          const prev = lastAlert.get(e.reminder_id);
          if (prev === undefined || t > prev) lastAlert.set(e.reminder_id, t);
        }

        const cooldownMs = 6 * 60 * 60 * 1000;
        const now = Date.now();
        items = classified.filter((r: any) => {
          const last = lastAlert.get(r.id);
          return last === undefined || now - last > cooldownMs;
        });

        if (items.length > 0) {
          await supabase.from("reminder_events").insert(
            items.map((r: any) => ({
              reminder_id: r.id,
              event_type: "alert_sent",
              description: `Aviso emitido (${r.type})`,
            }))
          );
        }
      }

      return NextResponse.json({ success: true, count: items.length, items });
    }

    // Modo BATCH (compatibilidad): procesa todos los vencidos en una sola invocación
    const result = await processDueReminders(15);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error en /api/cron/reminders GET:", error);
    return NextResponse.json({ success: false, error: error.message || "Error al procesar recordatorios" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));

    // Despacho de UN recordatorio (worker n8n)
    if (body?.reminderId) {
      // Jitter humano: retardo aleatorio (0-30s) para romper cualquier patrón de envío detectable.
      // El tick del worker es de 60s, así que los intervalos reales quedan entre 30 y 90s (aleatorio).
      const jitterMs = Math.floor(Math.random() * 30000);
      if (jitterMs > 0) await new Promise((r) => setTimeout(r, jitterMs));
      const result = await dispatchReminder(body.reminderId);
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    // Sin reminderId: comportamiento batch (compatibilidad)
    const result = await processDueReminders(15);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error en /api/cron/reminders POST:", error);
    return NextResponse.json({ success: false, error: error.message || "Error al procesar recordatorios" }, { status: 500 });
  }
}