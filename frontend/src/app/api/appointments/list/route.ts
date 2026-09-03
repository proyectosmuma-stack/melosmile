import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/server";
import { isDateKeyword, getDateRange, getMadridDate, formatTimeMadrid, formatDateMadrid } from "@/lib/utils/date-parser";

function cleanPatientName(term: string): string {
  if (!term) return "";
  let clean = term;
  try { clean = decodeURIComponent(clean); } catch (_e) {}
  clean = clean.replace(/^["']|["']$/g, "").trim();
  const stopPattern = /\b(cu[aá]ndo|tiene|cita|citas|de|para|ver|buscar|las|los|la|el|revisar|agenda)\b/gi;
  const nameOnly = clean.replace(stopPattern, "").replace(/[?¿!¡]/g, "").replace(/\s+/g, " ").trim();
  return (nameOnly.length >= 2 ? nameOnly : clean).toLowerCase();
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

    const isRecentQuery = /reciente|últim|ultim/i.test(dateInput) && !/semana|mes|año/i.test(dateInput);
    const isUpcomingQuery = /proxim|próxim|futur|siguiente|agendada|programada/i.test(dateInput) && !/semana|mes|año/i.test(dateInput);

    let startISO: string;
    let endISO: string | null;
    let dateLabel: string;

    if (isRecentQuery) {
      dateLabel = "citas más recientes";
      startISO = "1970-01-01T00:00:00.000Z";
      endISO = new Date().toISOString();
    } else if (isUpcomingQuery) {
      const madridToday = getMadridDate().isoToday;
      dateLabel = "próximas citas agendadas";
      startISO = `${madridToday}T00:00:00.000Z`;
      endISO = null;
    } else if (dateInput) {
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
      .order("appointment_date", { ascending: !isRecentQuery });

    if (isRecentQuery) {
      query = query.lte("appointment_date", endISO).limit(10);
    } else if (isUpcomingQuery) {
      query = query.gte("appointment_date", startISO).limit(10);
    } else {
      query = query.gte("appointment_date", startISO);
      if (endISO) {
        query = query.lte("appointment_date", endISO);
      }
    }

    if (!includeCancelled) {
      query = query.neq("status", "Cancelada");
    }

    // Filter by patient name at DB level via 2-step resolution.
    // NOTE: embedded-resource or() like "patients.first_name.ilike..." is NOT
    // supported by PostgREST and fails with 500 "failed to parse logic tree",
    // so patient IDs are resolved first against the patients table directly
    // (simple .or() over its own columns), then applied as .in("patient_id").
    if (patientTerm) {
      const terms = patientTerm.split(/\s+/).filter((t: string) => t.length >= 2);
      const matchedPatientIds = new Set<string>();

      for (const term of terms) {
        const { data: matchedPatients, error: patientsErr } = await (supabase as any)
          .from("patients")
          .select("id")
          .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,phone.ilike.%${term}%,historia_id.ilike.%${term}%`);
        if (patientsErr) throw patientsErr;
        for (const p of matchedPatients || []) {
          if (p?.id) matchedPatientIds.add(String(p.id));
        }
      }

      if (matchedPatientIds.size === 0) {
        const summaryText = `No se encontraron citas programadas para el paciente "${patientInput}".`;
        return NextResponse.json({
          success: true,
          fecha_consulta: dateLabel,
          total_citas: 0,
          resumen: summaryText,
          citas: [],
        });
      }

      query = query.in("patient_id", Array.from(matchedPatientIds));
    }

    const { data: rawAppointments, error } = await query;
    if (error) throw error;

    let results = (rawAppointments || []).map((apt: any) => {
      const dateObj = new Date(apt.appointment_date);
      const timeStr = formatTimeMadrid(dateObj);
      const fechaStr = formatDateMadrid(dateObj);
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

    // Patient filter now applied at DB level — no post-fetch filtering needed

    let summaryText: string;
    if (results.length === 0) {
      summaryText = patientTerm
        ? `No se encontraron citas programadas para el paciente "${patientInput}".`
        : isRecentQuery
        ? "No se encontraron citas registradas en el historial de la clínica."
        : `No hay ninguna cita programada para ${dateLabel === "próximas citas" ? "próximas fechas" : `la fecha ${dateLabel}`}.`;
    } else {
      summaryText = `${isRecentQuery ? "Citas más recientes registradas" : `Citas encontradas para ${dateLabel}`} (${results.length} en total):\n` +
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
