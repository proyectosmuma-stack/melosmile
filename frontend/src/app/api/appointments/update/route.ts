import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { appointment_id, patient_id, appointment_date, reason, status, notes } = body;

    let targetId = appointment_id;

    if (!targetId && patient_id) {
      // Get most recent appointment for patient
      const { data: latest } = await (supabase as any)
        .from("appointments")
        .select("id")
        .eq("patient_id", patient_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latest) targetId = latest.id;
    }

    if (!targetId) {
      return NextResponse.json({ error: "appointment_id or patient_id is required" }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (appointment_date) updates.appointment_date = appointment_date;
    if (reason) updates.reason = reason;
    if (status) updates.status = status;
    if (notes) updates.notes = notes;

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
