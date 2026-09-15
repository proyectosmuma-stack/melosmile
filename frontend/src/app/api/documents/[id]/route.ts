import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/server";
import * as ftp from "basic-ftp";
import { Readable } from "stream";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await (params as any);
    const id = resolvedParams.id;

    if (!id) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
    }

    // 1. Obtener la información del documento antes de borrarlo
    const { data: doc, error: fetchErr } = await supabase
      .from("documents")
      .select("file_path")
      .eq("id", id)
      .single();

    if (fetchErr) {
      console.warn("Document not found or already deleted:", fetchErr.message);
    }

    // 2. Eliminar de la base de datos de Supabase
    const { error: deleteErr } = await supabase
      .from("documents")
      .delete()
      .eq("id", id);

    if (deleteErr) {
      throw new Error(`Error eliminando registro en Supabase: ${deleteErr.message}`);
    }

    // 3. Intentar eliminar del VPS si file_path existe y no es una URL http (FTP delete - best effort)
    if (doc?.file_path && !doc.file_path.startsWith("http")) {
      const vpsHost = process.env.VPS_SSH_HOST;
      const vpsUser = process.env.VPS_SSH_USER;
      const vpsPassword = process.env.VPS_SSH_PASSWORD;

      if (vpsHost && vpsUser && vpsPassword) {
        const client = new ftp.Client();
        try {
          await client.access({
            host: vpsHost,
            port: parseInt(process.env.VPS_FTP_PORT || "21", 10),
            user: vpsUser,
            password: vpsPassword,
            secure: false,
          });
          
          // Limpiar el path para el FTP (asegurar que no empieza con doble barra)
          const ftpPath = doc.file_path.startsWith("/") ? doc.file_path : `/${doc.file_path}`;
          await client.remove(ftpPath);
          console.log("Archivo eliminado del VPS exitosamente:", ftpPath);
        } catch (ftpErr: any) {
          console.warn("No se pudo eliminar el archivo del VPS vía FTP:", ftpErr.message);
          // No lanzamos error porque el borrado de la DB ya ocurrió con éxito
        } finally {
          client.close();
        }
      }
    }

    return NextResponse.json({ success: true, message: "Documento eliminado correctamente" });
  } catch (error: any) {
    console.error("Error en DELETE document:", error);
    return NextResponse.json(
      { error: error.message || "Error eliminando el documento" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const client = new ftp.Client(15000);
  try {
    const resolvedParams = await (params as any);
    const id = resolvedParams.id;

    if (!id) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Archivo (file) es requerido para actualizar." },
        { status: 400 }
      );
    }

    // 1. Obtener la información del documento
    const { data: doc, error: fetchErr } = await supabase
      .from("documents")
      .select("file_path")
      .eq("id", id)
      .single();

    if (fetchErr || !doc || !doc.file_path) {
      return NextResponse.json(
        { success: false, error: "Documento no encontrado o no tiene file_path." },
        { status: 404 }
      );
    }

    const vpsHost = process.env.VPS_SSH_HOST;
    const vpsUser = process.env.VPS_SSH_USER;
    const vpsPassword = process.env.VPS_SSH_PASSWORD;

    if (!vpsHost || !vpsUser || !vpsPassword) {
      return NextResponse.json(
        { success: false, error: "Configuración de almacenamiento VPS incompleta." },
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

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const stream = Readable.from(buffer);

    const ftpPath = doc.file_path.startsWith("/") ? doc.file_path : `/${doc.file_path}`;
    
    // Extraer nombre de archivo y carpeta del path existente para sobreescribirlo
    const pathParts = ftpPath.split("/");
    const fileName = pathParts.pop() || "updated_file.jpg";
    const remoteDir = pathParts.join("/");
    
    await client.ensureDir(remoteDir.substring(1)); // Quitar '/' inicial para basic-ftp dir
    
    // ensureDir already changes the working directory to the target directory
    await client.uploadFrom(stream, fileName);
    
    client.close();

    // Actualizar metadata en DB (tamaño)
    await supabase
      .from("documents")
      .update({ file_size_bytes: file.size })
      .eq("id", id);

    return NextResponse.json({
      success: true,
      message: "Imagen actualizada exitosamente",
    });
  } catch (error: any) {
    client.close();
    console.error("Error en PUT document (FTP):", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar archivo" },
      { status: 500 }
    );
  }
}
