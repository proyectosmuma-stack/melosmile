import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

// Keywords that indicate a date context, NOT a patient name
const DATE_KEYWORDS = ["mañana", "manana", "tomorrow", "pasado mañana", "hoy", "today", "ayer", "yesterday"];

function isDateKeyword(term: string): boolean {
  const lower = term.toLowerCase();
  return DATE_KEYWORDS.some((kw) => lower.includes(kw)) || /\d{4}-\d{2}-\d{2}/.test(lower);
}

function cleanPatientName(term: string): string {
  if (!term) return "";
  let clean = term;
  try { clean = decodeURIComponent(clean); } catch (e) {}
  clean = clean.replace(/^["']|["']$/g, "").trim();

  // Strip conversational stop-words from patient search
  // e.g. "cuándo tiene cita Munir?" → "Munir"
  const stopPattern = /\b(cu[aá]ndo|tiene|cita|citas|de|para|ver|buscar|las|los|la|el|revisar|agenda)\b/gi;
  let nameOnly = clean.replace(stopPattern, "").replace(/[?¿!¡]/g, "").replace(/\s+/g, " ").trim();

  return (nameOnly.length >= 2 ? nameOnly : clean).toLowerCase();
}

function getDateRange(dateStr: string): { startISO: string; endISO: string | null; dateLabel: string } {
  const now = new Date();
  const target = new Date(now);

  let clean = dateStr.replace(/^["']|["']$/g, "").toLowerCase().trim();
  try { clean = decodeURIComponent(clean); } catch (e) {}

  if (clean.includes("pasado mañana") || clean.includes("pasado manana")) {
    target.setDate(target.getDate() + 2);
  } else if (clean.includes("mañana") || clean.includes("manana") || clean.includes("tomorrow")) {
    target.setDate(target.getDate() + 1);
  } else if (clean.includes("ayer") || clean.includes("yesterday")) {
    target.setDate(target.getDate() - 1);
  } else {
    const isoMatch = clean.match(/\d{4}-\d{2}-\d{2}/);
    if (isoMatch && !isNaN(new Date(isoMatch[0]).getTime())) {
      const custom = new Date(isoMatch[0]);
      target.setFullYear(custom.getFullYear(), custom.getMonth(), custom.getDate());
    }
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

    // Collect all possible query parameters
    const rawDate = searchParams.get("date") || "";
    const rawQ =
      searchParams.get("q") ||
      searchParams.get("query") ||
      searchParams.get("patient") ||
      searchParams.get("patient_name") ||
      "";

    // Determine whether rawQ is a date keyword or a patient name
    let dateInput = rawDate;
    let patientInput = "";

    if (rawQ) {
      if (isDateKeyword(rawQ)) {
        // e.g. q=mañana → use as date
        dateInput = dateInput || rawQ;
      } else {
        // e.g. q=Munir or q="cuando tiene cita Munir?" → use as patient
        patientInput = rawQ;
      }
    }

    const patientTerm = cleanPatientName(patientInput);

    let startISO: string;
    let endISO: string | null;
    let dateLabel: string;

    if (dateInput) {
      // Filter by specific date
      ({ startISO, endISO, dateLabel } = getDateRange(dateInput));
    } else if (patientTerm) {
      // Patient search with no date: return all upcoming from today
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      startISO = startOfDay.toISOString();
      endISO = null;
      dateLabel = "próximas citas";
    } else {
      // No params: default to today
      ({ startISO, endISO, dateLabel } = getDateRange("hoy"));
    }

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

    // Filter by patient name if provided
    if (patientTerm) {
      results = results.filter((r: any) => r.paciente.toLowerCase().includes(patientTerm));
    }

    let summaryText: string;
    if (results.length === 0) {
      summaryText = patientTerm
        ? `No se encontraron citas programadas para el paciente "${patientInput}".`
        : `No hay ninguna cita programada para ${dateLabel === "próximas citas" ? "próximas fechas" : `la fecha ${dateLabel}`}.`;
    } else {
      summaryText = `Citas encontradas (${results.length} en total):\n` +
        results
          .map((c: any, i: number) =>
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
