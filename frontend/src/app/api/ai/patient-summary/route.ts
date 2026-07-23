import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { patientId } = body;

    if (!patientId) {
      return NextResponse.json(
        { success: false, error: "patientId es requerido." },
        { status: 400 }
      );
    }

    // 1. Fetch patient basic details
    const { data: patient } = await supabase
      .from("patients")
      .select("id, first_name, last_name, historia_id, treatment_plan, allergies, important_diseases")
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

HISTORIAL DE NOTAS CLÍNICAS REALES DE CADA CITA:
${notesList || "No hay citas ni notas registradas."}
`.trim();

    const n8nWebhookUrl = process.env.N8N_PATIENT_SUMMARY_WEBHOOK || "https://n8n.mumaleads.com/webhook/melosmile-patient-summary";

    let aiSummary = "";

    try {
      const response = await fetch(n8nWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          patient_name: `${patient.first_name} ${patient.last_name}`,
          historia_id: patient.historia_id,
          clinical_context: fullClinicalContext,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        const json = await response.json();
        aiSummary = json.summary || json.aiSummary || json.text || "";
      }
    } catch (n8nErr: any) {
      console.warn("n8n patient summary call notice:", n8nErr.message);
    }

    // Fallback if n8n endpoint not active or returned empty
    if (!aiSummary) {
      const totalAppts = appointments?.length || 0;
      const completed = appointments?.filter((a) => a.status === "Realizada").length || 0;
      aiSummary = `Resumen Clínico (${totalAppts} citas, ${completed} realizadas):\nEl paciente presenta seguimiento activo. Último motivo: ${appointments?.[appointments.length - 1]?.reason || "Consulta"}. Ver historial clínico para detalles completos.`;
    }

    // Save summary into Supabase `patients.ai_summary`
    await (supabase as any)
      .from("patients")
      .update({ ai_summary: aiSummary })
      .eq("id", patientId);

    return NextResponse.json({
      success: true,
      summary: aiSummary,
    });
  } catch (error: any) {
    console.error("Error en patient-summary:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al generar resumen IA del paciente" },
      { status: 500 }
    );
  }
}
