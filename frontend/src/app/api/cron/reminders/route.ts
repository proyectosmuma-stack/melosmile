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