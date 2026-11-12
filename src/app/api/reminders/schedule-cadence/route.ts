import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/server";
import { createAutomaticAppointmentReminders } from "@/lib/reminders/cadence";
import { getDateRange } from "@/lib/utils/date-parser";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function resolveChannel(patient: { phone?: string; email?: string }): "whatsapp" | "email" | null {
  const digits = (patient?.phone || "").replace(/\D/g, "");
  if (digits.length >= 9) return "whatsapp";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (patient?.email && emailRegex.test(patient.email)) return "email";
  return null;
}

export async function POST(req: Request) {
  try {
    const body: any = await req.json().catch(() => ({}));
    const qs = new URL(req.url).searchParams;

    const date: string | null = body.date || qs.get("date") || null;
    const clinicName: string | null = body.clinic || qs.get("clinic") || null;

    let patientNames: string[] = [];
    const pnRaw = body.patient_names || qs.get("patient_names");
    if (Array.isArray(pnRaw)) {
      patientNames = pnRaw.map((s: string) => String(s).trim()).filter(Boolean);
    } else if (typeof pnRaw === "string") {
      patientNames = pnRaw.split(",").map((s) => s.trim()).filter(Boolean);
    }

    let appointmentIds: string[] = [];
    const aiRaw = body.appointment_ids || qs.get("appointment_ids");
    if (Array.isArray(aiRaw)) appointmentIds = aiRaw.map(String).filter(Boolean);
    else if (typeof aiRaw === "string" && aiRaw.trim()) appointmentIds = aiRaw.split(",").map((s) => s.trim()).filter(Boolean);

    if (!date && patientNames.length === 0 && appointmentIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Debes indicar 'date', 'patient_names' o 'appointment_ids'." },
        { status: 400 }
      );
    }

    const selectCols = "id, appointment_date, reason, status, patient_id, clinic_id, patients(id, first_name, last_name, phone, email), clinics(name)";

    let appointments: any[] = [];
    const warnings: string[] = []; // Declaración única de warnings

    if (appointmentIds.length > 0) {
      const { data: appointmentData, error: appointmentError } = await (supabase as any)
        .from("appointments")
        .select(selectCols)
        .in("id", appointmentIds)
        .neq("status", "Cancelada")
        .order("appointment_date", { ascending: true });
      if (appointmentError) throw appointmentError;
      appointments = appointmentData || [];
    } else {
      let query = (supabase as any)
        .from("appointments")
        .select(selectCols)
        .neq("status", "Cancelada")
        .order("appointment_date", { ascending: true });

      if (date) {
        const { startISO, endISO } = getDateRange(date);
        query = query.gte("appointment_date", startISO);
        if (endISO) query = query.lte("appointment_date", endISO);
      }

      if (patientNames.length > 0) {
        const matchedIds = new Set<string>();
        const norm = (s:string) => (s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();

        const { data: allPats, error: patErr } = await (supabase as any)
          .from("patients")
          .select("id, first_name, last_name");
        if (patErr) throw patErr;

        for (const name of patientNames) {
          const tokens = norm(name).split(/\s+/).filter(t => t.length >= 2);
          if (tokens.length === 0) continue;

          const matchingPatients = (allPats || []).filter((p: any) => {
            const fullDbName = norm(`${p.first_name || ""} ${p.last_name || ""}`);
            return tokens.every(t => fullDbName.includes(t));
          });

          for (const p of matchingPatients) matchedIds.add(String(p.id));
        }

        if (matchedIds.size === 0) {
          warnings.push(`Ningún paciente coincide con: ${patientNames.join(", ")}`);
          return NextResponse.json({ success: true, processed_appointments: 0, created_reminders: 0, warnings });
        }
        query = query.in("patient_id", Array.from(matchedIds));
      }

      if (clinicName) {
        const { data: clinics, error: cErr } = await (supabase as any)
          .from("clinics")
          .select("id")
          .ilike("name", `%${clinicName}%`);
        if (cErr) throw cErr;
        const clinicIds = (clinics || []).map((c: any) => String(c.id));
        if (clinicIds.length === 0) {
          warnings.push("No se encontró la clínica indicada.");
          return NextResponse.json({ success: true, processed_appointments: 0, created_reminders: 0, warnings });
        }
        query = query.in("clinic_id", clinicIds);
      }

      const { data: queryData, error: queryError } = await query;
      if (queryError) throw queryError;
      appointments = queryData || [];
      if (appointments.length === 0 && (date || patientNames.length > 0 || clinicName)) {
        warnings.push("No se encontraron citas para los criterios indicados.");
        return NextResponse.json({ success: true, processed_appointments: 0, created_reminders: 0, warnings });
      }
    }

    let createdReminders = 0;

    for (const appt of appointments) {
      const patient = appt.patients || {};
      const patientName = `${patient.first_name || ""} ${patient.last_name || ""}`.trim() || "Paciente";
      const channel = resolveChannel(patient);

      if (!channel) {
        warnings.push(`Paciente ${patientName} (cita ${String(appt.id)}): sin teléfono ni email válido para notificar.`);
        continue;
      }

      await (supabase as any)
        .from("reminders")
        .update({ status: "cancelado" })
        .eq("appointment_id", appt.id)
        .eq("reminder_type", "recordatorio_cita")
        .eq("status", "pendiente");

      const created = await createAutomaticAppointmentReminders({
        appointmentId: String(appt.id),
        patientId: String(patient.id),
        patientName,
        patientPhone: patient.phone || undefined,
        patientEmail: patient.email || undefined,
        appointmentDate: appt.appointment_date,
        reason: appt.reason || "Consulta Odontológica",
        isConfirmed: appt.status === "Confirmada",
        channels: [channel],
      });

      if (!created || created.length === 0) {
        warnings.push(`Paciente ${patientName} (cita ${String(appt.id)}): las fechas de los recordatorios ya pasaron.`);
      } else {
        createdReminders += created.length;
      }
    }

    return NextResponse.json({
      success: true,
      processed_appointments: appointments.length,
      created_reminders: createdReminders,
      warnings,
    });
  } catch (error: any) {
    console.error("[schedule-cadence] Error:", error?.message || error);
    return NextResponse.json({ success: false, error: error?.message || "Error al programar la cadencia" }, { status: 500 });
  }
}
