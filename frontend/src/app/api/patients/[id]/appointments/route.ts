import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    let { id: patientIdentifier } = await params;

    const { data: appointments, error } = await supabase
      .from("appointments")
      .select("id, appointment_date, reason, status")
      .eq("patient_id", patientIdentifier)
      .order("appointment_date", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      appointments: appointments || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener citas" },
      { status: 500 }
    );
  }
}
