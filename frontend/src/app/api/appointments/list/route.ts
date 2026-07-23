import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

function getDateRange(dateStr?: string, fullUrl?: string, hasPatientQuery?: boolean): { startISO: string; endISO: string | null; dateLabel: string } {
  const now = new Date();
  const target = new Date(now);

  let clean = dateStr || "";
  try {
    clean = decodeURIComponent(clean);
  } catch (e) {}

  clean = clean.replace(/^["']|["']$/g, "").toLowerCase().trim();

  let isExplicitDate = false;

  if (clean.includes("mañana") || clean.includes("tomorrow")) {
    target.setDate(target.getDate() + 1);
    isExplicitDate = true;
  } else if (clean.includes("pasado mañana")) {
    target.setDate(target.getDate() + 2);
    isExplicitDate = true;
  } else if (clean.includes("ayer") || clean.includes("yesterday")) {
    target.setDate(target.getDate() - 1);
    isExplicitDate = true;
  } else if (clean.includes("hoy") || clean.includes("today")) {
    isExplicitDate = true;
  } else {
    const isoMatch = clean.match(/\d{4}-\d{2}-\d{2}/);
    if (isoMatch && !isNaN(new Date(isoMatch[0]).getTime())) {
      const custom = new Date(isoMatch[0]);
      target.setFullYear(custom.getFullYear(), custom.getMonth(), custom.getDate());
      isExplicitDate = true;
    }
  }

  // If a patient query is provided WITHOUT an explicit date, search all upcoming from today
  if (hasPatientQuery && !isExplicitDate) {
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    return {
      startISO: startOfDay.toISOString(),
      endISO: null, // No upper bound -> query all upcoming appointments
      dateLabel: "próximas citas"
    };
  }

  const startOfDay = new Date(target);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(target);
  endOfDay.setHours(23, 59, 59, 999);

  return {
    startISO: startOfDay.toISOString(),
    endISO: endOfDay.toISOString(),
    dateLabel: startOfDay.toISOString().split("T")[0]
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let rawDate = searchParams.get("date") || searchParams.get("q") || searchParams.get("message") || "";
    let patientQuery = searchParams.get("patient") || searchParams.get("patient_name");

    const hasPatient = Boolean(patientQuery && patientQuery.trim());
    const { startISO, endISO, dateLabel } = getDateRange(rawDate, req.url, hasPatient);

    let query = (supabase as any)
      .from("appointments")
      .select(`
        id,
        appointment_date,
        reason,
        status,
        notes,
        patients ( id, first_name, last_name, phone, historia_id ),
        clinics ( id, name ),
        professionals ( id, first_name, last_name )
      `)
      .gte("appointment_date", startISO)
      .order("appointment_date", { ascending: true });

    if (endISO) {
      query = query.lte("appointment_date", endISO);
    }

    const { data: rawAppointments, error } = await query;

    if (error) throw error;

    let results = (rawAppointments || []).map((apt: any) => {
      const dateObj = new Date(apt.appointment_date);
      const timeStr = dateObj.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
      const fechaStr = dateObj.toISOString().split("T")[0];

      const patientName = apt.patients
        ? `${apt.patients.first_name} ${apt.patients.last_name}`.trim()
        : "Paciente Sin Nombre";

      const doctorName = apt.professionals
        ? `Dr. ${apt.professionals.first_name} ${apt.professionals.last_name}`.trim()
        : "Profesional";

      return {
        id: apt.id,
        fecha: fechaStr,
        hora: timeStr,
        paciente: patientName,
        historia_id: apt.patients?.historia_id || "",
        telefono: apt.patients?.phone || "",
        clinica: apt.clinics?.name || "Clínica Melosmile",
        doctor: doctorName,
        motivo: apt.reason || "Consulta",
        estado: apt.status
      };
    });

    if (patientQuery) {
      let cleanPatient = patientQuery;
      try { cleanPatient = decodeURIComponent(cleanPatient); } catch (e) {}
      const term = cleanPatient.replace(/^["']|["']$/g, "").toLowerCase().trim();
      results = results.filter((r: any) => r.paciente.toLowerCase().includes(term));
    }

    let summaryText = `Citas encontradas (${results.length} en total):\n`;
    if (results.length === 0) {
      summaryText = patientQuery
        ? `No se encontraron citas programadas para el paciente ${patientQuery}.`
        : `No hay ninguna cita programada para la fecha ${dateLabel}.`;
    } else {
      summaryText += results
        .map(
          (c: any, i: number) =>
            `${i + 1}. ${c.fecha} a las ${c.hora} - ${c.paciente} (Motivo: ${c.motivo}, Clínica: ${c.clinica}, Doctor: ${c.doctor}, Estado: ${c.estado})`
        )
        .join("\n");
    }

    return NextResponse.json({
      success: true,
      fecha_consulta: dateLabel,
      total_citas: results.length,
      resumen: summaryText,
      citas: results
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
