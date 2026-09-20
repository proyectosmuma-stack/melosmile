import { supabaseAdmin as supabase } from "@/lib/supabase/server";

/**
 * Offset (ms) de Europe/Madrid para un instante dado (calcula DST de forma dinámica).
 */
function getMadridOffsetMs(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Madrid",
    timeZoneName: "longOffset",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(map.timeZoneName || "");
  if (!m) return 0;
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (parseInt(m[2], 10) * 3600 + parseInt(m[3], 10) * 60) * 1000;
}

/**
 * Devuelve el instante UTC correspondiente a las HH:00 de Europe/Madrid
 * del día (en Madrid) de `base` desplazado `dayShiftDays` días.
 */
function madridHourDate(base: Date, hour: number, dayShiftDays = 0): Date {
  const dayStr = base.toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" }); // YYYY-MM-DD en Madrid
  const [y, m, d] = dayStr.split("-").map(Number);
  const utcDay = Date.UTC(y, m - 1, d) + dayShiftDays * 86_400_000;
  const candidate = new Date(utcDay + hour * 3_600_000); // tentativo UTC+0
  return new Date(candidate.getTime() - getMadridOffsetMs(candidate));
}

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
 * 1) 1 semana antes (7 días antes a las 13:00): Recordatorio con link de confirmación
 * 2) 2 días antes (48 horas antes a las 13:00): Si confirmado -> recordatorio amistoso; si no confirmado -> link de confirmación
 * 3) El día de la cita (a las 13:00, o 1h antes si la cita es antes de las 13:00): Recordatorio de cortesía del mismo día
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

  // Etapa 1: 1 semana antes (7 días antes a las 13:00, hora de Madrid)
  const weekBefore = madridHourDate(apptDateObj, 13, -7);
  if (weekBefore > now) {
    stages.push({
      stage: 1,
      scheduledAt: weekBefore.toISOString(),
      subject: `Recordatorio de tu cita en Melosmile — ${dateStr}`,
      message: `[Mensaje dinámico que se generará al momento del envío]`,
    });
  }

  // Etapa 2: 2 días antes (48 horas antes a las 13:00, hora de Madrid)
  const twoDaysBefore = madridHourDate(apptDateObj, 13, -2);
  if (twoDaysBefore > now) {
    stages.push({
      stage: 2,
      scheduledAt: twoDaysBefore.toISOString(),
      subject: `Tu cita en Melosmile es en 2 días`,
      message: `[Mensaje dinámico que se generará al momento del envío]`,
    });
  }

  // Etapa 3: El día de la cita (a las 13:00 Madrid, o 1h antes si la cita es antes de las 13:00)
  const apptHourMadrid = Number(
    apptDateObj
      .toLocaleTimeString("en-GB", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" })
      .slice(0, 2)
  );
  const sameDay =
    apptHourMadrid < 13
      ? new Date(madridHourDate(apptDateObj, Math.max(apptHourMadrid - 1, 0), 0).getTime() - 60 * 60 * 1000)
      : madridHourDate(apptDateObj, 13, 0);

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
