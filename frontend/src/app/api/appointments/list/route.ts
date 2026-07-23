import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

function cleanSearchTerm(term: string): string {
  if (!term) return "";
  let clean = term;
  try {
    clean = decodeURIComponent(clean);
  } catch (e) {}

  clean = clean.replace(/^["']|["']$/g, "").trim();

  // If term contains conversational phrases like "cuándo tiene cita Munir?", extract the actual patient name
  const stopWords = /^(cuándo|cuando|tiene|cita|citas|de|para|ver|buscar|las|los|la|el|\?|\s)+|(\s+(cuándo|cuando|tiene|cita|citas|de|para|ver|buscar|las|los|la|el|\?))+$/gi;
  let nameOnly = clean.replace(stopWords, "").replace(/[?¿!¡]/g, "").trim();

  // If cleaning stripped everything, fall back to original clean term
  return (nameOnly.length >= 2 ? nameOnly : clean).toLowerCase();
}

function getDateRange(dateStr?: string, patientQuery?: string): { startISO: string; endISO: string | null; dateLabel: string } {
  const now = new Date();
  const target = new Date(now);

  let clean = (dateStr || "").replace(/^["']|["']$/g, "").toLowerCase().trim();
  try {
    clean = decodeURIComponent(clean);
  } catch (e) {}

  let isSpecificFutureDate = false;

  if (clean.includes("mañana") || clean.includes("tomorrow")) {
    target.setDate(target.getDate() + 1);
    isSpecificFutureDate = true;
  } else if (clean.includes("pasado mañana")) {
    target.setDate(target.getDate() + 2);
    isSpecificFutureDate = true;
  } else if (clean.includes("ayer") || clean.includes("yesterday")) {
    target.setDate(target.getDate() - 1);
    isSpecificFutureDate = true;
  } else {
    const isoMatch = clean.match(/\d{4}-\d{2}-\d{2}/);
    if (isoMatch && !isNaN(new Date(isoMatch[0]).getTime())) {
      const custom = new Date(isoMatch[0]);
      target.setFullYear(custom.getFullYear(), custom.getMonth(), custom.getDate());
      isSpecificFutureDate = true;
    }
  }

  // If patient query is present and no explicit relative/ISO date (like "mañana") was passed, search all upcoming from today
  if (patientQuery && !isSpecificFutureDate) {
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    return {
      startISO: startOfDay.toISOString(),
      endISO: null,
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
    let rawDate = searchParams.get("date") || "";
    let patientQuery =
      searchParams.get("patient") ||
      searchParams.get("patient_name") ||
      searchParams.get("q") ||
      searchParams.get("query") ||
      "";

    // Auto-detect if rawDate contains patient name instead of a date
    if (!patientQuery && rawDate && !["hoy", "mañana", "ayer", "pasado mañana"].some((w) => rawDate.toLowerCase().includes(w)) && !rawDate.match(/\d{4}-\d{2}-\d{2}/)) {
      patientQuery = rawDate;
      rawDate = "";
    }

    const cleanedTerm = cleanSearchTerm(patientQuery);
    const { startISO, endISO, dateLabel } = getDateRange(rawDate, cleanedTerm);

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

    if (cleanedTerm) {
      results = results.filter((r: any) => r.paciente.toLowerCase().includes(cleanedTerm));
    }

    let summaryText = `Citas encontradas (${results.length} en total):\n`;
    if (results.length === 0) {
      summaryText = patientQuery
        ? `No se encontraron citas programadas para el paciente ${cleanedTerm || patientQuery}.`
        : `No hay ninguna cita programada para la fecha ${dateLabel}.`;
    } else {
      summaryText += results
        .map(
          (c: any, i: number) =>
            `${i + 1}. ${c.fecha} a las ${c.hora} - ${c.paciente} (${c.motivo}, ${c.clinica}, ${c.estado})`
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
