import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: patientId } = await params;

    // 1. Fetch patient basic details
    const { data: patient } = await supabase
      .from("patients")
      .select("id, first_name, last_name, historia_id, treatment_plan, allergies, important_diseases, current_medication")
      .eq("id", patientId)
      .single();

    if (!patient) {
      return NextResponse.json({ success: false, error: "Paciente no encontrado" }, { status: 404 });
    }

    // 2. Fetch all appointments and clinical notes for this patient
    const { data: appointments } = await supabase
      .from("appointments")
      .select("id, appointment_date, reason, status, notes, clinics(name), professionals(first_name, last_name)")
      .eq("patient_id", patientId)
      .order("appointment_date", { ascending: true });

    const notesList = (appointments || [])
      .map((a: any) => {
        const dateStr = new Date(a.appointment_date).toLocaleDateString("es-ES");
        return `• Cita ${dateStr} [${a.reason}] (Estado: ${a.status}): ${a.notes || "Sin anotaciones"}`;
      })
      .join("\n");

    const fullClinicalContext = `
PACIENTE: ${patient.first_name} ${patient.last_name} (${patient.historia_id})
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
