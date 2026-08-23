/**
 * Utilidades compartidas para documentos de pacientes.
 * Clasificación de imágenes, formateo de tamaños, etiquetas de tipo
 * y resolución de URLs de descarga/visualización.
 */

/** Extensiones de archivo consideradas imagen. */
export const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "bmp"];

/** Etiquetas legibles para cada valor del enum document_type. */
export const DOC_TYPE_LABELS: Record<string, string> = {
  foto_clinica: "Foto Clínica",
  radiografia: "Radiografía",
  consentimiento: "Consentimiento",
  presupuesto: "Presupuesto",
  plan_tratamiento: "Plan de Tratamiento",
  informe: "Informe",
  otro: "Otro",
};

/** Campos mínimos de un documento para poder clasificarlo como imagen. */
export interface DocumentLikeInput {
  file_name?: string | null;
  document_type?: string | null;
  mime_type?: string | null;
}

/** Documento ya resuelto, listo para consumir desde la UI. */
export interface ResolvedDocument {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  document_type: string | null;
  file_name: string;
  file_path: string;
  file_url: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  description: string | null;
  uploaded_by: string | null;
  created_at: string | null;
  /** URL navegable resuelta (file_url directa o construida contra el VPS). */
  url: string | null;
  is_image: boolean;
  label: string;
  size_label: string;
}

/** Extrae la extensión en minúsculas de un nombre de archivo ("" si no tiene). */
function getFileExtension(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  if (idx <= 0 || idx === fileName.length - 1) return "";
  return fileName.slice(idx + 1).toLowerCase();
}

/**
 * Indica si un documento debe renderizarse como imagen.
 * Criterio: extensión de archivo conocida O document_type de imagen clínica
 * (foto_clinica / radiografia).
 */
export function isImageDocument(doc: DocumentLikeInput): boolean {
  if (doc.document_type === "foto_clinica" || doc.document_type === "radiografia") {
    return true;
  }
  return IMAGE_EXTENSIONS.includes(getFileExtension(doc.file_name ?? ""));
}

/**
 * Formatea un tamaño en bytes a unidad legible ("2.4 MB", "512 KB", "0 B").
 * Devuelve "0 B" para valores nulos, no finitos o menores o iguales a cero.
 */
export function formatBytes(bytes?: number | null): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, unitIndex);

  if (unitIndex === 0) return `${Math.round(value)} ${units[unitIndex]}`;

  const formatted = value.toFixed(1).replace(/\.0$/, "");
  return `${formatted} ${units[unitIndex]}`;
}

/** Base pública del servidor de ficheros del VPS (NEXT_PUBLIC_VPS_FILES_BASE). */
function getDefaultVpsBase(): string | undefined {
  return process.env.NEXT_PUBLIC_VPS_FILES_BASE || undefined;
}

/**
 * Resuelve la URL navegable de un documento:
 * 1) Devuelve file_url tal cual si existe.
 * 2) Si hay base del VPS y file_path, normaliza la ruta quitando el prefijo
 *    "melosmile.com/" (si está presente) y devuelve `${vpsBase}/${ruta}`.
 * 3) En cualquier otro caso devuelve null.
 *
 * @param doc     Objeto con file_url y/o file_path procedente de Supabase.
 * @param vpsBase Base opcional del VPS; por defecto usa NEXT_PUBLIC_VPS_FILES_BASE.
 */
export function resolveDocumentUrl(
  doc: { file_url?: string | null; file_path?: string | null },
  vpsBase?: string
): string | null {
  const directUrl = doc.file_url?.trim();
  // Solo se aceptan esquemas http/https: bloquea javascript:, data:, etc.
  if (directUrl && /^https?:\/\//i.test(directUrl)) return directUrl;
  if (directUrl) return null;

  const basePath = vpsBase ?? getDefaultVpsBase();
  const filePath = doc.file_path?.trim();
  if (!basePath || !filePath) return null;

  const normalizedPath = filePath
    .replace(/^melosmile\.com\//i, "")
    .replace(/^\/+/, "");
  if (!normalizedPath) return null;

  return `${basePath.replace(/\/+$/, "")}/${normalizedPath}`;
}
