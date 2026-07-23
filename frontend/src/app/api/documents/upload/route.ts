import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const patientId = formData.get("patientId") as string | null;
    const appointmentId = formData.get("appointmentId") as string | null;
    let documentType = (formData.get("documentType") as string | null) || "otro";
    const appointmentDateStr = (formData.get("appointmentDate") as string | null) || new Date().toISOString().substring(0, 10);

    if (!file || !patientId) {
      return NextResponse.json(
        { success: false, error: "Archivo (file) y patientId son requeridos." },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const isImage = ["jpg", "jpeg", "png", "webp", "gif", "bmp"].includes(ext);

    if (isImage && documentType === "otro") {
      documentType = "foto_clinica";
    } else if (!isImage && ext === "pdf" && documentType === "otro") {
      documentType = "informe";
    }

    // Determine target VPS directory
    const dateFolder = appointmentDateStr.substring(0, 10);
    const baseDir = isImage
      ? `/opt/melosmile/pacientes/${patientId}/registros/${dateFolder}`
      : `/opt/melosmile/pacientes/${patientId}/docs`;

    try {
      fs.mkdirSync(baseDir, { recursive: true });
    } catch (mkdirErr: any) {
      console.warn("Notice: VPS dir creation warning:", mkdirErr.message);
    }

    const safeFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9_.-]/g, "_")}`;
    const fullPath = path.join(baseDir, safeFileName);

    // Read ArrayBuffer and write to VPS filesystem
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(fullPath, buffer);

    // Save metadata in Supabase `documents` table
    const descriptionText = isImage
      ? `Registro fotográfico (${dateFolder})`
      : "Vectorizado 🧠 (Procesado por n8n IA)";

    const { data: newDoc, error: dbErr } = await (supabase as any)
      .from("documents")
      .insert({
        patient_id: patientId,
        appointment_id: appointmentId || null,
        document_type: documentType,
        file_name: file.name,
        file_path: fullPath,
        file_size_bytes: file.size,
        mime_type: file.type,
        uploaded_by: "Dra. Melo",
        description: descriptionText,
      })
      .select("id")
      .single();

    if (dbErr) {
      console.error("Error al guardar metadata en Supabase:", dbErr);
    }

    const docId = newDoc?.id;

    // Trigger n8n vectorization ONLY for non-image documents (PDFs, docs)
    if (!isImage && docId) {
      const n8nWebhookUrl = process.env.N8N_VECTORIZER_WEBHOOK_URL || "https://n8n.mumaleads.com/webhook/melosmile-knowledge-processor";
      fetch(n8nWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: docId,
          patient_id: patientId,
          appointment_id: appointmentId,
          file_name: file.name,
          file_path: fullPath,
          document_type: documentType,
          timestamp: new Date().toISOString(),
        }),
      }).catch((e) => console.warn("n8n vectorize notice:", e.message));
    }

    return NextResponse.json({
      success: true,
      documentId: docId,
      filePath: fullPath,
      isImage,
      message: isImage ? "Imagen guardada en VPS" : "Documento guardado y enviado a vectorizar",
    });
  } catch (error: any) {
    console.error("Error en upload route:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al subir archivo" },
      { status: 500 }
    );
  }
}
