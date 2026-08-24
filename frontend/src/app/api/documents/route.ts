import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/server";
import { resolveDocumentUrl } from "@/lib/utils/document-utils";
import { signDocumentUrl } from "@/lib/server/storage";

/** Límite por defecto de documentos por petición. */
const DEFAULT_LIMIT = 200;
/** Límite máximo permitido por petición. */
const MAX_LIMIT = 500;

/** Valores válidos del enum document_type (espejo del enum en Supabase). */
const VALID_DOC_TYPES = [
  "foto_clinica",
  "radiografia",
  "consentimiento",
  "presupuesto",
  "plan_tratamiento",
  "informe",
  "otro",
] as const;

type DocTypeValue = (typeof VALID_DOC_TYPES)[number];

/** Fila cruda devuelta por Supabase con la cita embebida vía FK. */
interface RawDocumentRow {
  id: string;
  appointment_id: string | null;
  document_type: string | null;
  file_name: string;
  file_path: string;
  file_url: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  description: string | null;
  created_at: string | null;
  appointments: unknown;
}

/** Documento listo para devolver al frontend. */
interface ApiDocument {
  id: string;
  appointment_id: string | null;
  appointment_date: string | null;
  reason_cita: string | null;
  document_type: string | null;
  file_name: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  description: string | null;
  created_at: string | null;
  resolved_url: string | null;
}

/**
 * Extrae fecha y motivo de la cita embebida.
 * PostgREST puede devolver la relación como objeto o como array de uno,
 * así que se normaliza defensivamente sin asumir ninguna de las dos formas.
 */
function extractAppointmentInfo(raw: unknown): {
  appointment_date: string | null;
  reason_cita: string | null;
} {
  if (!raw) return { appointment_date: null, reason_cita: null };

  const candidate: unknown = Array.isArray(raw) ? raw[0] : raw;
  if (typeof candidate !== "object" || candidate === null) {
    return { appointment_date: null, reason_cita: null };
  }

  const record = candidate as Record<string, unknown>;
  return {
    appointment_date:
      typeof record.appointment_date === "string" ? record.appointment_date : null,
    reason_cita: typeof record.reason === "string" ? record.reason : null,
  };
}

/** Parsea un entero no negativo desde query param, con fallback por defecto. */
function parseIntParam(value: string | null, fallback: number): number {
  if (value === null) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/**
 * GET /api/documents?patientId=...&limit=200&offset=0&type=foto_clinica
 *
 * Lista los documentos de un paciente, ordenados por created_at desc,
 * con la cita asociada embebida (fecha y motivo) y la URL resuelta
 * para cada documento (file_url directa o construida contra el VPS).
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const patientId = searchParams.get("patientId");
    if (!patientId) {
      return NextResponse.json(
        { error: "patientId es requerido" },
        { status: 400 }
      );
    }
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        patientId
      )
    ) {
      return NextResponse.json(
        { error: "patientId debe ser un UUID válido" },
        { status: 400 }
      );
    }

    const limit = Math.min(
      parseIntParam(searchParams.get("limit"), DEFAULT_LIMIT),
      MAX_LIMIT
    );
    const offset = Math.max(parseIntParam(searchParams.get("offset"), 0), 0);
    const typeParam = searchParams.get("type");

    if (typeParam && !(VALID_DOC_TYPES as readonly string[]).includes(typeParam)) {
      return NextResponse.json(
        {
          error: `type inválido. Valores válidos: ${VALID_DOC_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }
    const docTypeFilter = typeParam as DocTypeValue;

    const columns =
      "id, appointment_id, document_type, file_name, file_path, file_url, " +
      "file_size_bytes, mime_type, description, created_at, " +
      "appointments ( id, appointment_date, reason )";

    let query = supabase
      .from("documents")
      .select(columns, { count: "exact" })
      .eq("patient_id", patientId);

    if (docTypeFilter) {
      query = query.eq("document_type", docTypeFilter);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const rows = (data ?? []) as unknown as RawDocumentRow[];
    const total = count ?? 0;

    const documents: ApiDocument[] = await Promise.all(
      rows.map(async (row) => {
        const aptInfo = extractAppointmentInfo(row.appointments);

        let signedUrl: string | null = null;
        const filePath = row.file_path?.trim();

        if (
          filePath &&
          !filePath.toLowerCase().startsWith("http") &&
          !filePath.toLowerCase().startsWith("ftp") &&
          !filePath.includes("..")
        ) {
          signedUrl = await signDocumentUrl(filePath);
        }

        const resolved_url =
          signedUrl ??
          resolveDocumentUrl(
            { file_url: row.file_url, file_path: row.file_path },
            process.env.NEXT_PUBLIC_VPS_FILES_BASE || undefined
          );

        return {
          id: row.id,
          appointment_id: row.appointment_id,
          appointment_date: aptInfo.appointment_date,
          reason_cita: aptInfo.reason_cita,
          document_type: row.document_type,
          file_name: row.file_name,
          file_size_bytes: row.file_size_bytes,
          mime_type: row.mime_type,
          description: row.description,
          created_at: row.created_at,
          resolved_url,
        };
      })
    );

    return NextResponse.json({
      documents,
      total,
      hasMore: offset + documents.length < total,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
