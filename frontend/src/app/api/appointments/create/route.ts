import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { patient_id, appointment_date, reason, clinic_id, professional_id, treatment } = body;

    if (!patient_id || !appointment_date) {
      return NextResponse.json({ error: "patient_id and appointment_date are required" }, { status: 400 });
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

    const { data, error } = await (supabase as any).from("appointments").insert({
      patient_id,
      clinic_id: c_id,
      professional_id: p_id,
      appointment_date,
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
