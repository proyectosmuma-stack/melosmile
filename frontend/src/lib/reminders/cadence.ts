import { supabaseAdmin as supabase } from "@/lib/supabase/server";

export interface CreateCadenceOptions {
  appointmentId: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  patientEmail?: string;
  appointmentDate: string; // ISO string
  reason?: string;
  isConfirmed?: boolean;
  channels?: string[]; // Por defecto ["whatsapp"]
}

/**
 * Genera la cadencia automática de 3 recordatorios de cita:
 * 1) 1 semana antes (7 días antes a las 09:00): Recordatorio con link de confirmación
 * 2) 2 días antes (48 horas antes a las 09:00): Si confirmado -> recordatorio amistoso; si no confirmado -> link de confirmación
 * 3) El día de la cita (a las 08:30): Recordatorio de cortesía del mismo día
 */
export async function createAutomaticAppointmentReminders(options: CreateCadenceOptions) {
  const {
    appointmentId,
    patientId,
    patientName,
    appointmentDate,
    reason = "Consulta Odontológica",
    isConfirmed = false,
    channels = ["whatsapp"],
  } = options;

  const apptDateObj = new Date(appointmentDate);
  const now = new Date();
  const firstName = patientName ? patientName.split(" ")[0] : "Paciente";
  const dateStr = apptDateObj.toLocaleDateString("es-ES", {
    timeZone: "Europe/Madrid",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = apptDateObj.toLocaleTimeString("es-ES", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const fullDateLabel = `${dateStr} a las ${timeStr}`;

  const rawUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://agenda.melosmile.com");
  const baseUrl = (rawUrl.includes("localhost") || rawUrl.includes("127.0.0.1")) ? "https://agenda.melosmile.com" : rawUrl;
  const confirmUrl = `${baseUrl.replace(/\/$/, '')}/c/${appointmentId}`;

  const stages = [];

  // Etapa 1: 1 semana antes (7 días antes a las 10:00)
  const weekBefore = new Date(apptDateObj.getTime() - 7 * 24 * 60 * 60 * 1000);
  weekBefore.setHours(10, 0, 0, 0);
  if (weekBefore > now) {
    stages.push({
      stage: 1,
      scheduledAt: weekBefore.toISOString(),
      subject: `Recordatorio de tu cita en Melosmile — ${dateStr}`,
      message: `[Mensaje dinámico que se generará al momento del envío]`,
    });
  }

  // Etapa 2: 2 días antes (48 horas antes a las 10:00)
  const twoDaysBefore = new Date(apptDateObj.getTime() - 2 * 24 * 60 * 60 * 1000);
  twoDaysBefore.setHours(10, 0, 0, 0);
  if (twoDaysBefore > now) {
    stages.push({
      stage: 2,
      scheduledAt: twoDaysBefore.toISOString(),
      subject: `Tu cita en Melosmile es en 2 días`,
      message: `[Mensaje dinámico que se generará al momento del envío]`,
    });
  }

  // Etapa 3: El día de la cita (a las 10:00 o 1h antes si es antes de las 11:00)
  const sameDay = new Date(apptDateObj);
  if (apptDateObj.getHours() < 11) {
    sameDay.setTime(apptDateObj.getTime() - 60 * 60 * 1000); // 1 hora antes
  } else {
    sameDay.setHours(10, 0, 0, 0);
  }

  if (sameDay > now && sameDay < apptDateObj) {
    stages.push({
      stage: 3,
      scheduledAt: sameDay.toISOString(),
      subject: `¡Hoy es tu cita en Melosmile! (${timeStr})`,
      message: `[Mensaje dinámico que se generará al momento del envío]`,
    });
  }

  const created = [];

  for (const stage of stages) {
    for (const channel of channels) {
      const { data: reminder, error } = await (supabase as any)
        .from("reminders")
        .insert({
          patient_id: patientId,
          appointment_id: appointmentId,
          reminder_type: "recordatorio_cita",
          channel,
          scheduled_at: stage.scheduledAt,
          subject: stage.subject,
          message: stage.message,
          stage: stage.stage,
          status: "pendiente",
          created_by: "auto_cadence",
        })
        .select("*")
        .single();

      if (!error && reminder) {
        created.push(reminder);
        await (supabase as any).from("reminder_events").insert({
          reminder_id: reminder.id,
          event_type: "created",
          description: `Cadencia automática programada para canal ${channel}`,
        });
      }
    }
  }

  return created;
}
