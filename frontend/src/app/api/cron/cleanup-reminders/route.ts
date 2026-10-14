import { NextResponse } from "next/server";
import { archivePastReminders } from "@/lib/reminders/cleanup";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;
  const apiKey = request.headers.get("x-api-key");
  const validApiKey = process.env.N8N_API_KEY || "melosmile_internal_n8n_key_2026";
  return apiKey === validApiKey;
}

/**
 * Cron de housekeeping: archiva los recordatorios cuya cita ya ha pasado.
 * Programado en `vercel.json` (03:00 Europe/Madrid aprox. vía UTC 02:00).
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  }

  const result = await archivePastReminders();
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
