import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { appointmentId, patientId, patientName, evolutionNotes, nextStepNotes, appointmentDate } = body;

    if (!appointmentId || !patientId) {
      return NextResponse.json(
        { success: false, error: "appointmentId y patientId son requeridos." },
        { status: 400 }
      );
    }

    const n8nWebhookUrl = process.env.N8N_APPOINTMENT_ANALYZER_WEBHOOK || "https://n8n.mumaleads.com/webhook/melosmile-appointment-analyzer";

    let suggestionData = null;

    try {
      const response = await fetch(n8nWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointment_id: appointmentId,
          patient_id: patientId,
          patient_name: patientName,
          evolution_notes: evolutionNotes,
          next_step_notes: nextStepNotes,
          appointment_date: appointmentDate,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        suggestionData = await response.json();
      }
    } catch (n8nErr: any) {
      console.warn("n8n appointment analyzer call failed or not reachable, using fallback rule:", n8nErr.message);
    }

    // Fallback heuristic if n8n not active: parse nextStepNotes for keywords like "semanas", "días", "citar", "control"
    if (!suggestionData && nextStepNotes) {
      const lower = nextStepNotes.toLowerCase();
      if (lower.includes("citar") || lower.includes("control") || lower.includes("semana") || lower.includes("mes") || lower.includes("día") || lower.includes("revisión")) {
        let timeframe = "en 2-3 semanas";
        const weekMatch = lower.match(/(\d+)\s*semana/);
        if (weekMatch) timeframe = `en ${weekMatch[1]} semanas`;
        const dayMatch = lower.match(/(\d+)\s*días?/);
        if (dayMatch) timeframe = `en ${dayMatch[1]} días`;
        
        suggestionData = {
          citaSugerida: true,
          motivo: "Cita de Seguimiento / Control",
          timeframe,
          detalles: nextStepNotes,
        };
      }
    }

    // If a suggestion was generated, update appointment notes with structured metadata tag
    if (suggestionData?.citaSugerida) {
      const metaTag = `\n[CitaSugeridaIA: ${JSON.stringify(suggestionData)}]`;
      const { data: currAppt } = await supabase.from("appointments").select("notes").eq("id", appointmentId).single();
      const existingNotes = currAppt?.notes || "";
      if (!existingNotes.includes("[CitaSugeridaIA:")) {
        await supabase.from("appointments").update({
          notes: (existingNotes + metaTag).trim(),
        }).eq("id", appointmentId);
      }
    }

    return NextResponse.json({
      success: true,
      suggestion: suggestionData,
    });
  } catch (error: any) {
    console.error("Error en analyze-appointment:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error analizando cita" },
      { status: 500 }
    );
  }
}
