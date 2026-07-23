import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

function getDateRange(dateStr?: string): { startISO: string; endISO: string; dateLabel: string } {
  const now = new Date();
  const target = new Date(now);

  const lower = (dateStr || "hoy").toLowerCase().trim();

  if (lower.includes("mañana") && !lower.includes("pasado")) {
    target.setDate(target.getDate() + 1);
  } else if (lower.includes("pasado mañana")) {
    target.setDate(target.getDate() + 2);
  } else if (lower.includes("ayer")) {
    target.setDate(target.getDate() - 1);
  } else if (dateStr && !isNaN(new Date(dateStr).getTime())) {
    const custom = new Date(dateStr);
    target.setFullYear(custom.getFullYear(), custom.getMonth(), custom.getDate());
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
    const rawDate = searchParams.get("date") || searchParams.get("q") || "hoy";
    const patientQuery = searchParams.get("patient") || searchParams.get("patient_name");

    const { startISO, endISO, dateLabel } = getDateRange(rawDate);

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
      .lte("appointment_date", endISO)
      .order("appointment_date", { ascending: true });

    const { data: rawAppointments, error } = await query;

    if (error) throw error;

    let results = (rawAppointments || []).map((apt: any) => {
      const dateObj = new Date(apt.appointment_date);
      const timeStr = dateObj.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

      const patientName = apt.patients
        ? `${apt.patients.first_name} ${apt.patients.last_name}`.trim()
        : "Paciente Sin Nombre";

      const doctorName = apt.professionals
        ? `Dr. ${apt.professionals.first_name} ${apt.professionals.last_name}`.trim()
        : "Profesional";

      return {
        id: apt.id,
        fecha: dateLabel,
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
      const term = patientQuery.toLowerCase();
      results = results.filter((r: any) => r.paciente.toLowerCase().includes(term));
    }

    return NextResponse.json({
      success: true,
      fecha_consulta: dateLabel,
      total_citas: results.length,
      citas: results
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
