import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/server";
import { getDateRange, getMadridDate, formatTimeMadrid, formatDateMadrid, DATE_KEYWORDS } from "@/lib/utils/date-parser";

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
    const afterDateParam = searchParams.get("after_date");
    const rawQ =
      searchParams.get("q") ||
      searchParams.get("query") ||
      searchParams.get("patient") ||
      searchParams.get("patient_name") ||
      "";

    let dateQuery = rawDate; 
    let patientTerm = "";

    // Determine if afterDateParam is present and format dateQuery accordingly
    if (afterDateParam) {
      dateQuery = `después de ${afterDateParam}`; 
    } else if (rawQ) {
      let cleanedForDate = rawQ;
      let dateKeywordFoundInRawQ = false;

      // Check if any date keyword is present in rawQ
      for (const kw of DATE_KEYWORDS) {
        if (rawQ.toLowerCase().includes(kw.toLowerCase())) {
          dateKeywordFoundInRawQ = true;
          break;
        }
      }

      // If date keyword is found, assign rawQ to dateQuery and clean rawQ for patientTerm
      if (dateKeywordFoundInRawQ) {
        dateQuery = rawQ; 
        cleanedForDate = cleanedForDate.replace(/\b(?:próximas|próximo|próxima|mañana|después de|a partir de|luego de|hoy|ayer|semana|mes|últimas|últimos|recientes|agendadas|programadas|de|el)\b/gi, "").trim();
        patientTerm = cleanPatientName(cleanedForDate);
      } else {
        // Otherwise, rawQ is entirely patientTerm
        patientTerm = cleanPatientName(rawQ);
      }
    }

    // Default to 'hoy' if no date or patient query is provided
    if (!dateQuery && !patientTerm) {
      dateQuery = "hoy";
    }

    const isRecentQuery = /reciente|últim/i.test(dateQuery) && !/semana|mes|año/i.test(dateQuery);
    const isUpcomingQuery = /próxim|proxim|futur|siguiente|agendada|programada/i.test(dateQuery) && !/semana|mes|año/i.test(dateQuery);

    let rangeStart: string | null = null;
    let rangeEnd: string | null = null;
    let dateLabel: string;

    const { isoToday } = getMadridDate(); // Helper para obtener la fecha de hoy en ISO

    // Resolve date ranges based on query types
    const naturalAfterMatch = dateQuery.match(/despu[eé]s\s+(?:de|del)|a\s+partir\s+de|luego\s+de/i);
    if (afterDateParam || naturalAfterMatch) {
      const afterSrc = afterDateParam
        ? afterDateParam
        : dateQuery.replace(/^.*?(?:despu[eé]s\s+(?:de|del)|a\s+partir\s+de|luego\s+de)\s*/i, "").trim();
      const resolvedDateRange = getDateRange(afterSrc);
      rangeStart = resolvedDateRange.startISO;
      rangeEnd = null; // Open-ended
      dateLabel = `después del ${formatDateMadrid(new Date(resolvedDateRange.startISO))}`;
    } else if (isUpcomingQuery) {
      rangeStart = `${isoToday.split("T")[0]}T00:00:00.000Z`; // Start from beginning of today
      rangeEnd = null; // Open-ended
      dateLabel = "próximas citas";
    } else if (isRecentQuery) {
      rangeStart = "1970-01-01T00:00:00.000Z"; // From epoch
      rangeEnd = new Date().toISOString(); // Up to now
      dateLabel = "citas recientes";
    } else {
      // General date query
      const resolvedDateRange = getDateRange(dateQuery);
      rangeStart = resolvedDateRange.startISO;
      rangeEnd = resolvedDateRange.endISO;
      dateLabel = resolvedDateRange.dateLabel;
    }

    const includeCancelled = searchParams.get("include_cancelled") === "true";

    let countQueryBuilder = supabase
      .from("appointments")
      .select("*", { count: "exact" });

    if (rangeStart) {
      countQueryBuilder = countQueryBuilder.gte("appointment_date", rangeStart);
    }
    if (rangeEnd) {
      countQueryBuilder = countQueryBuilder.lte("appointment_date", rangeEnd);
    }

    if (!includeCancelled) {
      countQueryBuilder = countQueryBuilder.neq("status", "Cancelada");
    }

    if (patientTerm) {
      const terms = patientTerm.split(/\s+/).filter((t: string) => t.length >= 2);
      const matchedPatientIds = new Set<string>();

      for (const term of terms) {
        const { data: matchedPatients, error: patientsErr } = await supabase
          .from("patients")
          .select("id")
          .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,phone.ilike.%${term}%,historia_id.ilike.%${term}%`);
        if (patientsErr) throw patientsErr;
        for (const p of matchedPatients || []) {
          if (p?.id) matchedPatientIds.add(String(p.id));
        }
      }

      if (matchedPatientIds.size === 0) {
        const summaryText = `No se encontraron citas programadas para el paciente "${patientTerm}".`;
        return NextResponse.json({
          success: true,
          fecha_consulta: dateLabel,
          total_citas: 0,
          resumen: summaryText,
          citas: [],
          pagination: { has_more: false, total: 0, returned: 0 },
        });
      }

      countQueryBuilder = countQueryBuilder.in("patient_id", Array.from(matchedPatientIds));
    }

    const { count: totalAppointments, error: countError } = await countQueryBuilder;
    if (countError) throw countError;

    let queryBuilder = supabase
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
      `);

    if (rangeStart) {
      queryBuilder = queryBuilder.gte("appointment_date", rangeStart);
    }
    if (rangeEnd) {
      queryBuilder = queryBuilder.lte("appointment_date", rangeEnd);
    }

    if (!includeCancelled) {
      queryBuilder = queryBuilder.neq("status", "Cancelada");
    }

    if (patientTerm) {
      const terms = patientTerm.split(/\s+/).filter((t: string) => t.length >= 2);
      const matchedPatientIds = new Set<string>();

      for (const term of terms) {
        const { data: matchedPatients, error: patientsErr } = await supabase
          .from("patients")
          .select("id")
          .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,phone.ilike.%${term}%,historia_id.ilike.%${term}%`);
        if (patientsErr) throw patientsErr;
        for (const p of matchedPatients || []) {
          if (p?.id) matchedPatientIds.add(String(p.id));
        }
      }
      queryBuilder = queryBuilder.in("patient_id", Array.from(matchedPatientIds));
    }

    queryBuilder = queryBuilder.order("appointment_date", { ascending: !isRecentQuery });

    const displayLimit = (isRecentQuery || isUpcomingQuery) ? 10 : undefined;
    if (displayLimit) {
      queryBuilder = queryBuilder.limit(displayLimit);
    }

    const { data: rawAppointments, error } = await queryBuilder;
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

    const hasMore = displayLimit && totalAppointments && totalAppointments > results.length;

    let summaryText: string;
    if (results.length === 0) {
      summaryText = patientTerm
        ? `No se encontraron citas programadas para el paciente "${patientTerm}".`
        : isRecentQuery
        ? "No se encontraron citas registradas en el historial de la clínica."
        : `No hay ninguna cita programada para ${dateLabel === "próximas citas" ? "próximas fechas" : `la fecha ${dateLabel}`}.`;
    } else {
      summaryText = `${isRecentQuery ? "Citas más recientes registradas" : `Citas encontradas para ${dateLabel}`}`; 
      if (displayLimit) {
        summaryText += ` (Mostrando ${results.length} de ${totalAppointments} en total):\n`;
      } else {
        summaryText += ` (${results.length} en total):\n`;
      }
      summaryText += results
          .map((c: any, i: number) =>
            `${i + 1}. ${c.fecha} a las ${c.hora} - ${c.paciente} (${c.motivo}, ${c.clinica}, ${c.estado})`
          )
          .join("\n");
    }

    return NextResponse.json({
      success: true,
      fecha_consulta: dateLabel,
      total_citas: totalAppointments,
      resumen: summaryText,
      citas: results,
      pagination: { has_more: hasMore, total: totalAppointments, returned: results.length },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
