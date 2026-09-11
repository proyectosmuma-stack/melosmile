import { NextResponse } from "next/server";
import { processDueReminders } from "@/lib/reminders/scheduler";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // 1. Verificación opcional de autorización CRON_SECRET en Vercel
    const authHeader = request.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      // También permitir si se pasa x-api-key o sesión interna
      const apiKey = request.headers.get("x-api-key");
      const validApiKey = process.env.N8N_API_KEY || "melosmile_internal_n8n_key_2026";
      if (apiKey !== validApiKey) {
        return NextResponse.json(
          { success: false, error: "No autorizado" },
          { status: 401 }
        );
      }
    }

    // 2. Procesar recordatorios programados que hayan llegado a su hora
    const result = await processDueReminders(15);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error en /api/cron/reminders:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al procesar recordatorios" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
