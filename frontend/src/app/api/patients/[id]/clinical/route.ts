import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    let { id: patientIdentifier } = await params;
    try { patientIdentifier = decodeURIComponent(patientIdentifier).trim(); } catch (_) {}

    // 1. Resolve patient by UUID, historia_id (PAC-###), or name
    let patient: any = null;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientIdentifier);

    if (isUUID) {
      const { data } = await supabase
        .from("patients")
        .select("id, first_name, last_name, historia_id, phone, email, dob, dni, address, treatment_plan, allergies, important_diseases, current_medication")
        .eq("id", patientIdentifier)
        .maybeSingle();
      patient = data;
    } else if (/^PAC-\d+$/i.test(patientIdentifier)) {
      const { data } = await supabase
        .from("patients")
        .select("id, first_name, last_name, historia_id, phone, email, dob, dni, address, treatment_plan, allergies, important_diseases, current_medication")
        .ilike("historia_id", patientIdentifier)
        .maybeSingle();
      patient = data;
    } else {
      // Search by name terms
      const terms = patientIdentifier.split(/\s+/).filter((t: string) => t.length >= 2);
      let query = supabase
        .from("patients")
        .select("id, first_name, last_name, historia_id, phone, email, dob, dni, address, treatment_plan, allergies, important_diseases, current_medication");

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

    // 2. Fetch all appointments and clinical notes for this patient
    const { data: appointments } = await supabase
      .from("appointments")
      .select("id, appointment_date, reason, status, notes, clinics(name), professionals(first_name, last_name)")
      .eq("patient_id", patient.id)
      .order("appointment_date", { ascending: true });

    const notesList = (appointments || [])
      .map((a: any) => {
        const dateStr = new Date(a.appointment_date).toLocaleDateString("es-ES");
        return `• Cita ${dateStr} [${a.reason}] (Estado: ${a.status}): ${a.notes || "Sin anotaciones"}`;
      })
      .join("\n");

    const fullClinicalContext = `
PACIENTE: ${patient.first_name} ${patient.last_name} (${patient.historia_id})
TELÉFONO: ${patient.phone || "No registrado"}
EMAIL: ${patient.email || "No registrado"}
DNI / DOCUMENTO: ${patient.dni || "No registrado"}
FECHA DE NACIMIENTO: ${patient.dob || "No registrada"}
DIRECCIÓN: ${patient.address || "No registrada"}
PLAN DE TRATAMIENTO BASE: ${patient.treatment_plan || "No especificado"}
ALERGIAS: ${patient.allergies || "Ninguna"}
ANTECEDENTES: ${patient.important_diseases || "Ninguno"}
MEDICACIÓN ACTUAL: ${patient.current_medication || "Ninguna"}

HISTORIAL DE NOTAS CLÍNICAS:
${notesList || "No hay citas ni notas registradas."}
`.trim();

    return NextResponse.json({
      success: true,
      context: fullClinicalContext,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener contexto clínico" },
      { status: 500 }
    );
  }
}
