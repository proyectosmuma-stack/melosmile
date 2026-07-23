import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

function parseAppointmentDate(inputDate?: string): string {
  if (!inputDate) return new Date().toISOString();

  const parsed = new Date(inputDate);
  if (!isNaN(parsed.getTime())) return parsed.toISOString();

  const now = new Date();
  const target = new Date(now);

  const lower = inputDate.toLowerCase();
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
    const { appointment_id, patient_id, appointment_date, reason, status, notes, treatment_id, professional_id, clinic_id } = body;

    let targetId = appointment_id;
    let resolvedPatientId = patient_id;

    if (patient_id && !UUID_REGEX.test(patient_id)) {
      const terms = String(patient_id).split(/\s+/).filter(Boolean);
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

      if (found) resolvedPatientId = found.id;
    }

    if (!targetId && resolvedPatientId) {
      const { data: latest } = await (supabase as any)
        .from("appointments")
        .select("id")
        .eq("patient_id", resolvedPatientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latest) targetId = latest.id;
    }

    if (!targetId) {
      return NextResponse.json({ error: "appointment_id or patient_id is required" }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (appointment_date) updates.appointment_date = parseAppointmentDate(appointment_date);
    if (reason) updates.reason = reason;
    if (status) updates.status = status;
    if (notes) updates.notes = notes;
    if (treatment_id) updates.treatment_id = treatment_id;
    if (professional_id) updates.professional_id = professional_id;
    if (clinic_id) updates.clinic_id = clinic_id;

    const { data, error } = await (supabase as any)
      .from("appointments")
      .update(updates)
      .eq("id", targetId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
