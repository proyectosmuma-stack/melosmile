import { NextRequest, NextResponse } from "next/server";
import { syncAppointmentCadence } from "@/lib/reminders/cadence";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await context.params;
    const appointmentId = resolvedParams.id;

    if (!appointmentId) {
      return NextResponse.json(
        { success: false, error: "ID de cita requerido" },
        { status: 400 }
      );
    }

    // Idempotente: cancela los pendientes previos y regenera la cadencia vigente.
    const result = await syncAppointmentCadence(appointmentId, "generación manual de cadencia");

    if (result.skipped && result.created === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        reminders: [],
        message: `Cadencia no generada (${result.skipped}).`,
      });
    }

    return NextResponse.json({
      success: true,
      count: result.created,
      cancelled: result.cancelled,
      message: `Cadencia de ${result.created} recordatorio(s) programada exitosamente (1 semana, 2 días y día de la cita).`,
    });
  } catch (err: any) {
    console.error("[Appointment Cadence Error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Error al programar cadencia" },
      { status: 500 }
    );
  }
}
