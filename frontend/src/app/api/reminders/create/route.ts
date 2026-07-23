import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      patientId,
      appointmentId,
      reminderType,
      channel,
      scheduledAt,
      subject,
      message,
      patientName,
      patientPhone,
      patientEmail,
      sendImmediately,
    } = body;

    if (!patientId || !message) {
      return NextResponse.json(
        { success: false, error: "patientId y message son requeridos." },
        { status: 400 }
      );
    }

    const { data: newReminder, error } = await (supabase as any)
      .from("reminders")
      .insert({
        patient_id: patientId,
        appointment_id: appointmentId || null,
        reminder_type: reminderType || "personalizado",
        channel: channel || "whatsapp",
        scheduled_at: scheduledAt || new Date().toISOString(),
        subject: subject || "Notificación Melosmile",
        message,
        status: "pendiente",
        created_by: "manual",
      })
      .select("*")
      .single();

    if (error || !newReminder) {
      throw new Error(error?.message || "Error al insertar recordatorio en BD");
    }

    // Insert reminder_event
    await (supabase as any).from("reminder_events").insert({
      reminder_id: newReminder.id,
      event_type: "created",
      description: `Recordatorio creado para canal ${channel}`,
    });

    // If sendImmediately, dispatch to n8n right now
    if (sendImmediately) {
      const dispatchRes = await fetch(new URL("/api/reminders/send-now", req.url).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminderId: newReminder.id }),
      });
      const dispatchData = await dispatchRes.json();
      return NextResponse.json({
        success: true,
        reminder: newReminder,
        dispatched: dispatchData,
      });
    }

    return NextResponse.json({
      success: true,
      reminder: newReminder,
    });
  } catch (error: any) {
    console.error("Error en reminders/create:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al crear recordatorio" },
      { status: 500 }
    );
  }
}
