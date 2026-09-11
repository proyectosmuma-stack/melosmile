import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/server";
import { dispatchReminder } from "@/lib/reminders/dispatch";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      patientId,
      appointmentId,
      reminderType,
      channel,
      channels,
      scheduledAt,
      subject,
      message,
      sendImmediately,
    } = body;

    if (!patientId || !message) {
      return NextResponse.json(
        { success: false, error: "patientId y message son requeridos." },
        { status: 400 }
      );
    }

    // Acepta selección múltiple de canales (array) o canal único
    const channelList: string[] = Array.isArray(channels) && channels.length > 0
      ? channels
      : [channel || "telegram"];

    const createdReminders = [];

    for (const ch of channelList) {
      const { data: newReminder, error } = await (supabase as any)
        .from("reminders")
        .insert({
          patient_id: patientId,
          appointment_id: appointmentId || null,
          reminder_type: reminderType || "personalizado",
          channel: ch,
          scheduled_at: scheduledAt || new Date().toISOString(),
          subject: subject || "Notificación Melosmile",
          message,
          status: "pendiente",
          created_by: "manual",
        })
        .select("*")
        .single();

      if (error || !newReminder) {
        throw new Error(error?.message || `Error al insertar recordatorio para canal ${ch}`);
      }

      // Insert reminder_event
      await (supabase as any).from("reminder_events").insert({
        reminder_id: newReminder.id,
        event_type: "created",
        description: `Recordatorio creado para canal ${newReminder.channel}`,
      });

      // If sendImmediately, dispatch right now directly in-process
      if (sendImmediately) {
        const dispatchRes = await dispatchReminder(newReminder.id);
        if (!dispatchRes.success) {
          console.warn(`[SendImmediately Notice for ${ch}]:`, dispatchRes.error);
        }
      }

      createdReminders.push(newReminder);
    }

    return NextResponse.json({
      success: true,
      count: createdReminders.length,
      reminders: createdReminders,
    });
  } catch (error: any) {
    console.error("Error en reminders/create:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al crear recordatorio" },
      { status: 500 }
    );
  }
}
