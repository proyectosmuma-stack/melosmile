import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    let { id: patientIdentifier } = await params;
    try { patientIdentifier = decodeURIComponent(patientIdentifier).trim(); } catch (_) {}

    let patient: any = null;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientIdentifier);

    if (isUUID) {
      const { data } = await supabase
        .from("patients")
        .select("first_name, last_name, ai_summary")
        .eq("id", patientIdentifier)
        .maybeSingle();
      patient = data;
    } else if (/^PAC-\d+$/i.test(patientIdentifier)) {
      const { data } = await supabase
        .from("patients")
        .select("first_name, last_name, ai_summary")
        .ilike("historia_id", patientIdentifier)
        .maybeSingle();
      patient = data;
    } else {
      const terms = patientIdentifier.split(/\s+/).filter((t: string) => t.length >= 2);
      let query = supabase
        .from("patients")
        .select("first_name, last_name, ai_summary");

      if (terms.length > 0) {
        const orConditions = terms.flatMap((t: string) => [
          `first_name.ilike.%${t}%`,
          `last_name.ilike.%${t}%`
        ]).join(",");
        query = query.or(orConditions);
      } else {
        query = query.or(`first_name.ilike.%${patientIdentifier}%,last_name.ilike.%${patientIdentifier}%`);
      }

      const { data: matched } = await query.limit(1);
      if (matched && matched.length > 0) {
        patient = matched[0];
      }
    }

    if (!patient) {
      return NextResponse.json({ success: false, error: `Paciente "${patientIdentifier}" no encontrado` }, { status: 404 });
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
