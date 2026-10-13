import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/server";
import { createAutomaticAppointmentReminders } from "@/lib/reminders/cadence";
import { getDateRange } from "@/lib/utils/date-parser";

export const dynamic = "force-dynamic";

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

    if (appointmentIds.length > 0) {
      const { data, error } = await (supabase as any)
        .from("appointments")
        .select(selectCols)
        .in("id", appointmentIds)
        .neq("status", "Cancelada")
        .order("appointment_date", { ascending: true });
      if (error) throw error;
      appointments = data || [];
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
        for (const name of patientNames) {
          const term = name.trim();
          if (term.length < 2) continue;
          const { data: pats, error: patErr } = await (supabase as any)
            .from("patients")
            .select("id")
            .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%`);
          if (patErr) throw patErr;
          for (const p of pats || []) matchedIds.add(String(p.id));
        }
        if (matchedIds.size === 0) {
          return NextResponse.json({ success: true, processed_appointments: 0, created_reminders: 0, warnings: [] });
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
          return NextResponse.json({ success: true, processed_appointments: 0, created_reminders: 0, warnings: [] });
        }
        query = query.in("clinic_id", clinicIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      appointments = data || [];
    }

    let createdReminders = 0;
    const warnings: Array<{ patient_name: string; appointment_id: string; reason: string }> = [];

    for (const appt of appointments) {
      const patient = appt.patients || {};
      const patientName = `${patient.first_name || ""} ${patient.last_name || ""}`.trim() || "Paciente";
      const channel = resolveChannel(patient);

      if (!channel) {
        warnings.push({ patient_name: patientName, appointment_id: String(appt.id), reason: "no_contact_info" });
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
        warnings.push({ patient_name: patientName, appointment_id: String(appt.id), reason: "all_stages_passed" });
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
