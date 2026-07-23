import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: patientId } = await params;

    const { data: patient } = await supabase
      .from("patients")
      .select("ai_summary")
      .eq("id", patientId)
      .single();

    if (!patient) {
      return NextResponse.json({ success: false, error: "Paciente no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      summary: patient.ai_summary || "No hay resumen disponible para este paciente.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener resumen" },
      { status: 500 }
    );
  }
}
