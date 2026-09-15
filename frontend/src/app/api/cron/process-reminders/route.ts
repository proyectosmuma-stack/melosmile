import { NextResponse } from "next/server";
import { processDueReminders } from "@/lib/reminders/scheduler";

export async function GET(request: Request) {
  try {
    // 1. Verificación de seguridad de Vercel Cron
    const authHeader = request.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Ejecutamos el dispatcher de recordatorios vencidos
    // Límite de 15 recordatorios por ejecución para evitar timeouts en funciones Vercel Edge/Serverless
    const result = await processDueReminders(15);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error en endpoint /api/cron/process-reminders:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
