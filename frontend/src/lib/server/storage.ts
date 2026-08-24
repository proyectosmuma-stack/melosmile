import { createClient } from "@supabase/supabase-js";

/**
 * Genera una URL firmada de lectura temporal para un archivo en el bucket
 * de documentos de pacientes ('patient-documents').
 *
 * @param filePath Ruta relativa del archivo dentro del bucket.
 * @param expiresIn Tiempo de validez del enlace en segundos (por defecto: 3600 = 1 hora).
 * @returns La URL firmada o null si falla la generación o validación de seguridad.
 */
export async function signDocumentUrl(
  filePath: string,
  expiresIn = 3600
): Promise<string | null> {
  try {
    if (!filePath || typeof filePath !== "string") {
      return null;
    }

    const trimmedPath = filePath.trim();

    // Defensa contra path traversal y URLs absolutas/externas
    if (
      trimmedPath.toLowerCase().startsWith("http") ||
      trimmedPath.includes("..")
    ) {
      return null;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return null;
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabaseAdmin.storage
      .from("patient-documents")
      .createSignedUrl(trimmedPath, expiresIn);

    if (error || !data?.signedUrl) {
      return null;
    }

    return data.signedUrl;
  } catch {
    // Captura cualquier error inesperado; nunca lances ni loguees secretos
    return null;
  }
}
