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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { patient_id, appointment_date, reason, clinic_id, professional_id, treatment, status } = body;

    if (!patient_id) {
      return NextResponse.json({ error: "patient_id is required" }, { status: 400 });
    }

    let c_id = clinic_id;
    let p_id = professional_id;

    // Fallbacks if not provided by AI
    if (!c_id) {
      const { data: clinics } = await (supabase as any).from("clinics").select("id").limit(1).single();
      if (clinics) c_id = clinics.id;
    }
    if (!p_id) {
      const { data: profs } = await (supabase as any).from("professionals").select("id").limit(1).single();
      if (profs) p_id = profs.id;
    }

    const isoDate = parseAppointmentDate(appointment_date);

    const { data, error } = await (supabase as any).from("appointments").insert({
      patient_id,
      clinic_id: c_id,
      professional_id: p_id,
      appointment_date: isoDate,
      reason: reason || treatment || "Nueva cita (IA)",
      status: status || "Confirmada",
      notes: "Agendada por Asistente IA"
    }).select().single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
