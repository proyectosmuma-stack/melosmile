import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

function parseAppointmentDate(inputDate?: string, inputTime?: string): string {
  let combined = inputDate || "";
  if (inputTime && !combined.includes(inputTime)) {
    combined += ` ${inputTime}`;
  }

  if (!combined.trim()) return new Date().toISOString();

  const parsed = new Date(combined);
  if (!isNaN(parsed.getTime())) return parsed.toISOString();

  const now = new Date();
  const target = new Date(now);

  const lower = combined.toLowerCase();
  if (lower.includes("mañana")) {
    target.setDate(target.getDate() + 1);
  } else if (lower.includes("pasado mañana")) {
    target.setDate(target.getDate() + 2);
  }

  const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    target.setHours(hours, minutes, 0, 0);
  } else {
    target.setHours(10, 0, 0, 0);
  }

  return target.toISOString();
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Accept multiple naming conventions passed by different LLM tool calls
    const rawPatient = body.patient_id || body.patient_name || body.patient || body.name;
    const rawDate = body.appointment_date || body.date;
    const rawTime = body.time;
    const rawReason = body.reason || body.treatment || body.appointment_type || body.concept;
    const rawClinic = body.clinic || body.clinic_name || body.location;

    if (!rawPatient) {
      return NextResponse.json({ error: "patient identification is required" }, { status: 400 });
    }

    let resolvedPatientId = String(rawPatient);

    // Resolve patient name to UUID if not a valid UUID
    if (!UUID_REGEX.test(resolvedPatientId)) {
      const terms = resolvedPatientId.split(/\s+/).filter(Boolean);
      const orConditions = terms
        .flatMap((term) => [
          `first_name.ilike.%${term}%`,
          `last_name.ilike.%${term}%`,
          `phone.ilike.%${term}%`,
        ])
        .join(",");

      const { data: found } = await (supabase as any)
        .from("patients")
        .select("id")
        .or(orConditions)
        .limit(1)
        .maybeSingle();

      if (found) {
        resolvedPatientId = found.id;
      } else {
        return NextResponse.json({ error: `Paciente no encontrado con el término "${rawPatient}"` }, { status: 404 });
      }
    }

    let c_id = body.clinic_id;
    let p_id = body.professional_id;

    if (rawClinic && (!c_id || !UUID_REGEX.test(c_id))) {
      const { data: matchedClinic } = await (supabase as any)
        .from("clinics")
        .select("id")
        .or(`name.ilike.%${rawClinic}%,address.ilike.%${rawClinic}%`)
        .limit(1)
        .maybeSingle();
      if (matchedClinic) c_id = matchedClinic.id;
    }

    if (!c_id || !UUID_REGEX.test(c_id)) {
      const { data: clinics } = await (supabase as any).from("clinics").select("id").limit(1).single();
      if (clinics) c_id = clinics.id;
    }

    if (!p_id || !UUID_REGEX.test(p_id)) {
      const { data: profs } = await (supabase as any).from("professionals").select("id").limit(1).single();
      if (profs) p_id = profs.id;
    }

    const isoDate = parseAppointmentDate(rawDate, rawTime);

    const { data, error } = await (supabase as any).from("appointments").insert({
      patient_id: resolvedPatientId,
      clinic_id: c_id,
      professional_id: p_id,
      appointment_date: isoDate,
      reason: rawReason || "Nueva cita (IA)",
      status: body.status || "Confirmada",
      notes: rawClinic ? `Agendada por Asistente IA (${rawClinic})` : "Agendada por Asistente IA"
    }).select().single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
