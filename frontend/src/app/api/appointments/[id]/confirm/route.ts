import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await context.params;
    const appointmentId = resolvedParams.id;

    if (!appointmentId) {
      return NextResponse.json({ success: false, error: "ID requerido" }, { status: 400 });
    }

    const { data: appt, error } = await (supabase as any)
      .from("appointments")
      .select(`
        id, appointment_date, reason, status, notes,
        patients ( id, first_name, last_name ),
        clinics ( name, address, google_maps_url )
      `)
      .eq("id", appointmentId)
      .single();

    if (error || !appt) {
      return NextResponse.json({ success: false, error: "Cita no encontrada" }, { status: 404 });
    }

    const apptDate = new Date(appt.appointment_date);
    const isExpired = apptDate.getTime() < Date.now();

    const clinic = appt.clinics;
    let mapsUrl: string | null = null;
    if (clinic?.google_maps_url && clinic.google_maps_url.trim() !== "") {
      mapsUrl = clinic.google_maps_url.trim();
    } else if (clinic?.name || clinic?.address) {
      const query = [clinic.name, clinic.address].filter(Boolean).join(", ");
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    }

    return NextResponse.json({
      success: true,
      appointment: {
        id: appt.id,
        appointment_date: appt.appointment_date,
        reason: appt.reason || "Consulta Odontológica",
        status: appt.status || "Pendiente",
        patientName: appt.patients ? `${appt.patients.first_name || ""} ${appt.patients.last_name || ""}`.trim() : "Paciente",
        clinicName: clinic?.name || "Clínica Dental Melosmile",
        clinicAddress: clinic?.address || null,
        mapsUrl,
        isExpired,
      },
    });
  } catch (err: any) {
    console.error("Error fetching confirmation details:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await context.params;
    const appointmentId = resolvedParams.id;
    const body = await req.json();
    const { action, notes } = body; // action: "confirm" | "cancel"

    if (!appointmentId || !action) {
      return NextResponse.json({ success: false, error: "Parámetros incompletos" }, { status: 400 });
    }

    const { data: appt, error } = await (supabase as any)
      .from("appointments")
      .select("id, appointment_date, status, notes")
      .eq("id", appointmentId)
      .single();

    if (error || !appt) {
      return NextResponse.json({ success: false, error: "Cita no encontrada" }, { status: 404 });
    }

    // Validación de expiración: Una vez pasada la hora de la cita, el enlace no opera
    const apptDate = new Date(appt.appointment_date);
    if (apptDate.getTime() < Date.now()) {
      return NextResponse.json(
        {
          success: false,
          error: "Este enlace de confirmación ha expirado porque la fecha y hora de la cita ya han transcurrido.",
          isExpired: true,
        },
        { status: 410 }
      );
    }

    if (action === "confirm") {
      await (supabase as any)
        .from("appointments")
        .update({ status: "Confirmada" })
        .eq("id", appointmentId);

      // Registrar evento
      await (supabase as any).from("reminder_events").insert({
        description: "Cita confirmada por el paciente vía enlace web rápido",
        event_type: "confirmed",
      });

      return NextResponse.json({ success: true, status: "Confirmada" });
    } else if (action === "cancel") {
      const updatedNotes = notes
        ? `${appt.notes || ""}\n[Cancelación solicitada por paciente vía web: ${notes}]`.trim()
        : `${appt.notes || ""}\n[Cancelación solicitada por paciente vía enlace web]`.trim();

      await (supabase as any)
        .from("appointments")
        .update({
          status: "Cancelada",
          notes: updatedNotes,
        })
        .eq("id", appointmentId);

      // Registrar evento
      await (supabase as any).from("reminder_events").insert({
        description: `Cita cancelada por el paciente vía web${notes ? `: ${notes}` : ""}`,
        event_type: "cancelled_by_patient",
      });

      return NextResponse.json({ success: true, status: "Cancelada" });
    }

    return NextResponse.json({ success: false, error: "Acción no reconocida" }, { status: 400 });
  } catch (err: any) {
    console.error("Error processing confirmation action:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
