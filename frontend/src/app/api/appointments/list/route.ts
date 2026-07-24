import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

// Keywords that indicate a date context, NOT a patient name
const DATE_KEYWORDS = [
  "mañana",
  "manana",
  "tomorrow",
  "pasado mañana",
  "hoy",
  "today",
  "ayer",
  "yesterday",
  "semana",
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const SPANISH_MONTHS: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

function isDateKeyword(term: string): boolean {
  const lower = term.toLowerCase();
  if (DATE_KEYWORDS.some((kw) => lower.includes(kw))) return true;
  if (/\d{4}-\d{2}-\d{2}/.test(lower)) return true;
  if (/\d{1,2}\s*(?:de|\/|-)\s*(?:[a-z]+|\d{1,2})/i.test(lower)) return true;
  return false;
}

function cleanPatientName(term: string): string {
  if (!term) return "";
  let clean = term;
  try { clean = decodeURIComponent(clean); } catch (e) {}
  clean = clean.replace(/^["']|["']$/g, "").trim();

  // Strip conversational stop-words from patient search
  const stopPattern = /\b(cu[aá]ndo|tiene|cita|citas|de|para|ver|buscar|las|los|la|el|revisar|agenda)\b/gi;
  let nameOnly = clean.replace(stopPattern, "").replace(/[?¿!¡]/g, "").replace(/\s+/g, " ").trim();

  return (nameOnly.length >= 2 ? nameOnly : clean).toLowerCase();
}

/**
 * Returns current date components in Europe/Madrid timezone
 */
function getMadridDate(): { yyyy: number; mm: number; dd: number; isoToday: string } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now); // Format: "YYYY-MM-DD"

  const [yyyy, mm, dd] = parts.split("-").map(Number);
  return { yyyy, mm, dd, isoToday: parts };
}

/**
 * Parses natural language date strings into ISO start/end UTC range using Europe/Madrid baseline
 */
function getDateRange(dateStr: string): { startISO: string; endISO: string; dateLabel: string } {
  let clean = dateStr.replace(/^["']|["']$/g, "").toLowerCase().trim();
  try { clean = decodeURIComponent(clean); } catch (e) {}

  const madrid = getMadridDate();
  let targetY = madrid.yyyy;
  let targetM = madrid.mm;
  let targetD = madrid.dd;

  if (clean.includes("esta semana") || clean.includes("semana") || clean.includes("this week")) {
    const d = new Date(madrid.yyyy, madrid.mm - 1, madrid.dd);
    const dayOfWeek = d.getDay(); // 0 is Sun, 1 is Mon...
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMon);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const monY = monday.getFullYear();
    const monM = String(monday.getMonth() + 1).padStart(2, "0");
    const monD = String(monday.getDate()).padStart(2, "0");

    const sunY = sunday.getFullYear();
    const sunM = String(sunday.getMonth() + 1).padStart(2, "0");
    const sunD = String(sunday.getDate()).padStart(2, "0");

    return {
      startISO: `${monY}-${monM}-${monD}T00:00:00.000Z`,
      endISO: `${sunY}-${sunM}-${sunD}T23:59:59.999Z`,
      dateLabel: `esta semana (${monY}-${monM}-${monD} al ${sunY}-${sunM}-${sunD})`,
    };
  }

  if (clean.includes("pasado mañana") || clean.includes("pasado manana")) {
    const d = new Date(madrid.yyyy, madrid.mm - 1, madrid.dd + 2);
    targetY = d.getFullYear();
    targetM = d.getMonth() + 1;
    targetD = d.getDate();
  } else if (clean.includes("mañana") || clean.includes("manana") || clean.includes("tomorrow")) {
    const d = new Date(madrid.yyyy, madrid.mm - 1, madrid.dd + 1);
    targetY = d.getFullYear();
    targetM = d.getMonth() + 1;
    targetD = d.getDate();
  } else if (clean.includes("ayer") || clean.includes("yesterday")) {
    const d = new Date(madrid.yyyy, madrid.mm - 1, madrid.dd - 1);
    targetY = d.getFullYear();
    targetM = d.getMonth() + 1;
    targetD = d.getDate();
  } else if (clean.includes("hoy") || clean.includes("today")) {
    // Keep target as madrid today
  } else {
    // Match "24 de julio", "24 de julio de 2026", "24/07", "24/07/2026"
    const spanishDateMatch = clean.match(/(\d{1,2})\s*(?:de|\/|-)\s*([a-z]+|\d{1,2})(?:\s*(?:de|\/|-)\s*(\d{2,4}))?/i);
    if (spanishDateMatch) {
      const day = parseInt(spanishDateMatch[1], 10);
      const monthRaw = spanishDateMatch[2].toLowerCase();
      let month = parseInt(monthRaw, 10);
      if (isNaN(month)) {
        month = SPANISH_MONTHS[monthRaw] || madrid.mm;
      }
      let year = spanishDateMatch[3] ? parseInt(spanishDateMatch[3], 10) : madrid.yyyy;
      if (year < 100) year += 2000;

      targetY = year;
      targetM = month;
      targetD = day;
    } else {
      const isoMatch = clean.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        targetY = parseInt(isoMatch[1], 10);
        targetM = parseInt(isoMatch[2], 10);
        targetD = parseInt(isoMatch[3], 10);
      }
    }
  }

  const mmStr = String(targetM).padStart(2, "0");
  const ddStr = String(targetD).padStart(2, "0");
  const dateLabel = `${targetY}-${mmStr}-${ddStr}`;

  return {
    startISO: `${dateLabel}T00:00:00.000Z`,
    endISO: `${dateLabel}T23:59:59.999Z`,
    dateLabel,
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

    let dateInput = rawDate;
    let patientInput = "";

    if (rawQ) {
      if (isDateKeyword(rawQ)) {
        dateInput = dateInput || rawQ;
      } else {
        patientInput = rawQ;
      }
    }

    const patientTerm = cleanPatientName(patientInput);

    let startISO: string;
    let endISO: string | null;
    let dateLabel: string;

    if (dateInput) {
      // Filter by specific date (natural language or ISO)
      ({ startISO, endISO, dateLabel } = getDateRange(dateInput));
    } else if (patientTerm) {
      // Patient search with no date: return all upcoming from today (Europe/Madrid)
      const madridToday = getMadridDate().isoToday;
      startISO = `${madridToday}T00:00:00.000Z`;
      endISO = null;
      dateLabel = "próximas citas";
    } else {
      // No params: default to today (Europe/Madrid)
      ({ startISO, endISO, dateLabel } = getDateRange("hoy"));
    }

    const includeCancelled = searchParams.get("include_cancelled") === "true";

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

    if (!includeCancelled) {
      query = query.neq("status", "Cancelada");
    }

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
      summaryText = `Citas encontradas para ${dateLabel} (${results.length} en total):\n` +
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

export async function POST(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch (e) {}
  const fakeUrl = new URL("http://localhost/api/appointments/list");
  if (body.date) fakeUrl.searchParams.set("date", body.date);
  if (body.q || body.query || body.patient) fakeUrl.searchParams.set("q", body.q || body.query || body.patient);
  return GET(new Request(fakeUrl.toString()));
}
