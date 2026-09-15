import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/server";
import * as ftp from "basic-ftp";
import { Readable } from "stream";
import { jwtVerify } from "jose";

export async function POST(req: Request) {
  const client = new ftp.Client(15000);
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const token = formData.get("token") as string | null;

    if (!file || !token) {
      return NextResponse.json(
        { success: false, error: "Archivo (file) y token son requeridos." },
        { status: 400 }
      );
    }

    // Verify token
    const secret = new TextEncoder().encode(
      process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || "melosmile-secret-key-12345"
    );

    let payload;
    try {
      const verified = await jwtVerify(token, secret);
      payload = verified.payload;
    } catch (err) {
      return NextResponse.json(
        { success: false, error: "Token inválido o expirado. Vuelve a generar el código QR." },
        { status: 401 }
      );
    }

    const patientId = payload.patientId as string;
    const appointmentId = payload.appointmentId as string;
    const appointmentDateStr = (payload.appointmentDate as string) || new Date().toISOString().substring(0, 10);
    const documentType = "foto_clinica";

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const isImage = ["jpg", "jpeg", "png", "webp", "gif", "bmp", "heic"].includes(ext);

    if (!isImage) {
      return NextResponse.json(
        { success: false, error: "Solo se permiten imágenes." },
        { status: 400 }
      );
    }

    // Determine target VPS directory structure: melosmile.com/pacientes/...
    const dateFolder = appointmentDateStr.substring(0, 10);
    const subFolder = `pacientes/${patientId}/registros/${dateFolder}`;

    const rootDomain = process.env.VPS_DOMAIN_FOLDER || "melosmile.com";
    const fullRemoteDir = `${rootDomain}/${subFolder}`;
    const safeFileName = `${Date.now()}_mobile_${file.name.replace(/[^a-zA-Z0-9_.-]/g, "_")}`;
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
    const descriptionText = `Registro fotográfico (${dateFolder}) - Subido desde móvil`;

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

    return NextResponse.json({
      success: true,
      documentId: newDoc?.id,
      filePath: fullPath,
      message: "Imagen subida exitosamente",
    });
  } catch (error: any) {
    client.close();
    console.error("Error en mobile upload route (FTP):", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al subir archivo a VPS" },
      { status: 500 }
    );
  }
}
