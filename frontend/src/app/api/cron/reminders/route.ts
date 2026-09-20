import { NextResponse } from "next/server";
import { processDueReminders, getDueReminders } from "@/lib/reminders/scheduler";
import { dispatchReminder } from "@/lib/reminders/dispatch";

export const dynamic = "force-dynamic";

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

    // Modo ALERTAS: recordatorios fallidos o atascados (para el avisador n8n)
    if (searchParams.get("mode") === "alerts") {
      const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const supabase = (await import("@/lib/supabase/server")).supabaseAdmin as any;

      const { data: errored } = await supabase
        .from("reminders")
        .select("id, patient_id, scheduled_at, status, error_message, patients(first_name, last_name, phone)")
        .eq("status", "error")
        .order("scheduled_at", { ascending: true })
        .limit(50);

      const { data: overdue } = await supabase
        .from("reminders")
        .select("id, patient_id, scheduled_at, status, patients(first_name, last_name, phone)")
        .eq("status", "pendiente")
        .lt("scheduled_at", cutoff)
        .order("scheduled_at", { ascending: true })
        .limit(50);

      const candidates = [...(errored || []), ...(overdue || [])];
      let items: any[] = candidates;

      if (candidates.length > 0) {
        const ids = candidates.map((r: any) => r.id);
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
        items = candidates.filter((r: any) => {
          const last = lastAlert.get(r.id);
          return last === undefined || now - last > cooldownMs;
        });

        if (items.length > 0) {
          await supabase.from("reminder_events").insert(
            items.map((r: any) => ({
              reminder_id: r.id,
              event_type: "alert_sent",
              description: `Aviso de fallo emitido (estado=${r.status})`,
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