import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import * as ftp from "basic-ftp";
import { Readable } from "stream";

export async function POST(req: Request) {
  const client = new ftp.Client(15000);
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

    // Determine target VPS directory structure: melosmile.com/pacientes/...
    const dateFolder = appointmentDateStr.substring(0, 10);
    const subFolder = isImage
      ? `pacientes/${patientId}/registros/${dateFolder}`
      : `pacientes/${patientId}/docs`;

    const rootDomain = process.env.VPS_DOMAIN_FOLDER || "melosmile.com";
    const fullRemoteDir = `${rootDomain}/${subFolder}`;
    const safeFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9_.-]/g, "_")}`;
    const fullPath = `/${fullRemoteDir}/${safeFileName}`;

    const vpsHost = process.env.VPS_SSH_HOST;
    const vpsUser = process.env.VPS_SSH_USER;
    const vpsPassword = process.env.VPS_SSH_PASSWORD;

    if (!vpsHost || !vpsUser || !vpsPassword) {
      return NextResponse.json(
        { success: false, error: "Configuración de almacenamiento VPS incompleta en el servidor." },
        { status: 500 }
      );
    }

    // Connect to IONOS VPS via FTP
    await client.access({
      host: vpsHost,
      port: parseInt(process.env.VPS_FTP_PORT || "21", 10),
      user: vpsUser,
      password: vpsPassword,
      secure: false,
    });

    await client.ensureDir(fullRemoteDir);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const stream = Readable.from(buffer);

    await client.uploadFrom(stream, safeFileName);
    client.close();

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
      message: isImage ? "Imagen guardada en VPS (FTP)" : "Documento guardado en VPS (FTP) y enviado a vectorizar",
    });
  } catch (error: any) {
    client.close();
    console.error("Error en upload route (FTP):", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al subir archivo a VPS" },
      { status: 500 }
    );
  }
}
