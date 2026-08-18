import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      invoiceId,
      patientId,
      message,
      appointmentId,
      reminderType,
      channel,
      scheduledAt,
      subject,
      amount,
    } = body;

    if (!invoiceId && !patientId) {
      return NextResponse.json(
        { success: false, error: "invoiceId o patientId son requeridos." },
        { status: 400 }
      );
    }

    // Resolver patient_id desde invoiceId (billing_records -> appointments -> patients)
    let resolvedPatientId = patientId || null;
    let resolvedMessage = message || "";

    if (invoiceId && !patientId) {
      const { data: billing, error: billingErr } = await (supabase as any)
        .from("billing_records")
        .select("id, appointment_id, calculated_total, custom_price, status, billing_month")
        .eq("id", invoiceId)
        .single();

      if (billingErr || !billing) {
        return NextResponse.json(
          { success: false, error: `Factura ${invoiceId} no encontrada.` },
          { status: 404 }
        );
      }

      let patientIdFromAppointment = null;
      if (billing.appointment_id) {
        const { data: appointment } = await (supabase as any)
          .from("appointments")
          .select("id, patient_id")
          .eq("id", billing.appointment_id)
          .single();
        patientIdFromAppointment = appointment?.patient_id || null;
      }

      if (!patientIdFromAppointment) {
        return NextResponse.json(
          { success: false, error: "La factura no tiene cita asociada con paciente." },
          { status: 400 }
        );
      }

      resolvedPatientId = patientIdFromAppointment;

      if (!resolvedMessage) {
        const total = billing.calculated_total ?? billing.custom_price ?? "";
        const month = billing.billing_month ?? "";
        resolvedMessage = `Estimado paciente, le recordamos que tiene un saldo pendiente de ${total} correspondiente a ${month}.`;
      }
    }

    if (!resolvedMessage) {
      return NextResponse.json(
        { success: false, error: "message es requerido." },
        { status: 400 }
      );
    }

    let finalMessage = resolvedMessage;
    if (amount !== undefined && amount !== null && !resolvedMessage.includes(String(amount))) {
      finalMessage = `${resolvedMessage} (Monto: ${amount})`;
    }

    const effectiveChannel = channel || "email";
    const effectiveType = reminderType || "pago_pendiente";
    const effectiveScheduledAt = scheduledAt || new Date().toISOString();
    const effectiveSubject = subject || "Recordatorio de facturación Melosmile";

    const { data: newReminder, error } = await (supabase as any)
      .from("reminders")
      .insert({
        patient_id: resolvedPatientId,
        appointment_id: appointmentId || null,
        reminder_type: effectiveType,
        channel: effectiveChannel,
        scheduled_at: effectiveScheduledAt,
        subject: effectiveSubject,
        message: finalMessage,
        status: "pendiente",
        created_by: "agente_contabilidad",
      })
      .select("*")
      .single();

    if (error || !newReminder) {
      throw new Error(error?.message || "Error al insertar recordatorio en BD");
    }

    await (supabase as any).from("reminder_events").insert({
      reminder_id: newReminder.id,
      event_type: "created",
      description: `Recordatorio de facturación creado para canal ${effectiveChannel}`,
    }).select();

    return NextResponse.json({
      success: true,
      reminder: newReminder,
    });
  } catch (error: any) {
    console.error("Error en api/billing/reminders:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al crear recordatorio de facturación" },
      { status: 500 }
    );
  }
}
