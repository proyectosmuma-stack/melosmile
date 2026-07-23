import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reminderId } = body;

    if (!reminderId) {
      return NextResponse.json(
        { success: false, error: "reminderId es requerido." },
        { status: 400 }
      );
    }

    // 1. Fetch reminder with patient & appointment data
    const { data: reminder } = await (supabase as any)
      .from("reminders")
      .select(`
        *,
        patients ( first_name, last_name, phone, email, historia_id ),
        appointments ( appointment_date, reason, clinics(name) )
      `)
      .eq("id", reminderId)
      .single();

    if (!reminder) {
      return NextResponse.json({ success: false, error: "Recordatorio no encontrado" }, { status: 404 });
    }

    const patient = reminder.patients;
    const appointment = reminder.appointments;

    const payload = {
      reminder_id: reminder.id,
      patient_id: reminder.patient_id,
      patient_name: patient ? `${patient.first_name} ${patient.last_name}` : "Paciente",
      patient_phone: patient?.phone || "",
      patient_email: patient?.email || "",
      historia_id: patient?.historia_id || "",
      channel: reminder.channel,
      reminder_type: reminder.reminder_type,
      subject: reminder.subject,
      message: reminder.message,
      appointment_date: appointment?.appointment_date || null,
      appointment_reason: appointment?.reason || null,
      clinic_name: appointment?.clinics?.name || null,
      timestamp: new Date().toISOString(),
    };

    const n8nWebhookUrl = process.env.N8N_REMINDERS_WEBHOOK || "https://n8n.mumaleads.com/webhook/melosmile-reminders-dispatcher";

    let n8nExecutionId = null;

    try {
      const response = await fetch(n8nWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const resJson = await response.json().catch(() => ({}));
        n8nExecutionId = resJson.execution_id || resJson.id || null;
      }
    } catch (n8nErr: any) {
      console.warn("Notice: n8n reminder dispatcher call warning:", n8nErr.message);
    }

    // 2. Mark reminder as sent
    const nowIso = new Date().toISOString();
    await (supabase as any)
      .from("reminders")
      .update({
        status: "enviado",
        sent_at: nowIso,
        n8n_execution_id: n8nExecutionId,
      })
      .eq("id", reminder.id);

    // 3. Log event
    await (supabase as any).from("reminder_events").insert({
      reminder_id: reminder.id,
      event_type: "sent",
      description: `Recordatorio enviado a través de canal ${reminder.channel}`,
      metadata: { n8nExecutionId },
    });

    return NextResponse.json({
      success: true,
      message: `Recordatorio enviado por ${reminder.channel}`,
      reminderId,
    });
  } catch (error: any) {
    console.error("Error en reminders/send-now:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al enviar recordatorio" },
      { status: 500 }
    );
  }
}
