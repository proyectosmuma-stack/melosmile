import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/server";
import { createAutomaticAppointmentReminders } from "@/lib/reminders/cadence";

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

    // 1. Obtener cita y datos del paciente
    const { data: appt, error: apptErr } = await (supabase as any)
      .from("appointments")
      .select(`
        id, appointment_date, reason, status,
        patients ( id, first_name, last_name, phone, email, telegram_chat_id )
      `)
      .eq("id", appointmentId)
      .single();

    if (apptErr || !appt) {
      return NextResponse.json(
        { success: false, error: "Cita no encontrada" },
        { status: 404 }
      );
    }

    const patient = appt.patients;
    const patientName = patient ? `${patient.first_name || ""} ${patient.last_name || ""}`.trim() : "Paciente";

    // Canales por defecto según los datos disponibles del paciente
    const channels: string[] = [];
    if (patient?.phone) {
      channels.push("telegram");
      channels.push("whatsapp");
    }
    if (patient?.email) {
      channels.push("email");
    }
    if (channels.length === 0) {
      channels.push("telegram");
    }

    const created = await createAutomaticAppointmentReminders({
      appointmentId: appt.id,
      patientId: patient.id,
      patientName,
      patientPhone: patient.phone,
      patientEmail: patient.email,
      appointmentDate: appt.appointment_date,
      reason: appt.reason || "Consulta Odontológica",
      isConfirmed: appt.status === "Confirmada",
      channels,
    });

    return NextResponse.json({
      success: true,
      count: created.length,
      reminders: created,
      message: `Cadencia de ${created.length} recordatorio(s) programada exitosamente (1 semana, 2 días y día de la cita).`,
    });
  } catch (err: any) {
    console.error("[Appointment Cadence Error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Error al programar cadencia" },
      { status: 500 }
    );
  }
}
