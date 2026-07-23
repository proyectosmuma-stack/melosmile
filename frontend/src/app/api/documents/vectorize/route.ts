import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { documentId, patientId, fileName, filePath, documentType } = body;

    if (!documentId || !patientId) {
      return NextResponse.json(
        { success: false, error: "documentId y patientId son requeridos" },
        { status: 400 }
      );
    }

    // N8N Webhook endpoint for document vectorization (muma-knowledge-processor / melosmile-document-vectorizer)
    const n8nWebhookUrl = process.env.N8N_VECTORIZER_WEBHOOK_URL || "https://n8n.mumaleads.com/webhook/melosmile-knowledge-processor";

    // Trigger n8n vectorization workflow in background
    fetch(n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        document_id: documentId,
        patient_id: patientId,
        file_name: fileName,
        file_path: filePath,
        document_type: documentType,
        timestamp: new Date().toISOString(),
      }),
    }).catch((err) => {
      console.warn("n8n vectorization webhook notice:", err.message);
    });

    // Update document description/status to indicate vectorization in progress
    await (supabase as any)
      .from("documents")
      .update({
        description: "Vectorizado 🧠 (Procesado por n8n IA)",
      })
      .eq("id", documentId);

    return NextResponse.json({
      success: true,
      message: "Proceso de vectorización iniciado en n8n",
      documentId,
    });
  } catch (error: any) {
    console.error("Error al vectorizar documento:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error interno al vectorizar" },
      { status: 500 }
    );
  }
}
