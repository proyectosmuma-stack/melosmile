import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { supabase } from "@/lib/supabase/client";
import { createClient } from "@supabase/supabase-js";

// Admin client with service role key — bypasses RLS for server-side write operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://amhfdzfcmpastmlsosou.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

/**
 * GET /api/ai/report
 * Returns list of agent reports from Supabase.
 * Query param: ?resolved=false|true|all (default: false)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const resolvedFilter = searchParams.get("resolved");

    let query = (supabase as any)
      .from("ai_agent_reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (resolvedFilter === "true") {
      query = query.eq("resolved", true);
    } else if (resolvedFilter !== "all") {
      // Default: show pending/unresolved reports
      query = query.or("resolved.is.null,resolved.eq.false");
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      success: true,
      total: data?.length || 0,
      reports: data || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener los reportes." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/report
 * Creates a new agent error report in Supabase and local/tmp log file.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      user_comment,
      session_id,
      conversation_history = [],
      participating_agents = ["Musly Router"],
      timestamp = new Date().toISOString(),
    } = body;

    if (!user_comment || !user_comment.trim()) {
      return NextResponse.json(
        { error: "El comentario del usuario es requerido para el reporte." },
        { status: 400 }
      );
    }

    const formattedDate = new Date(timestamp).toLocaleString("es-ES", {
      dateStyle: "full",
      timeStyle: "medium",
    });

    // Build log text entry
    const logHeader = `================================================================================\n`;
    const logTitle = `[REPORTE DE ERROR / CONTEXTO IA - ${formattedDate}]\n`;
    const logDetails = [
      `ID Sesión          : ${session_id || "Desconocida"}`,
      `Fecha y Hora       : ${formattedDate} (${timestamp})`,
      `Agentes Involucrados: ${Array.isArray(participating_agents) ? participating_agents.join(", ") : participating_agents}`,
      `Comentario Usuario : "${user_comment.trim()}"`,
      `Estado             : PENDIENTE DE REVISIÓN`,
      `\n------------------- HISTORIAL DE LA CONVERSACIÓN -------------------`,
    ].join("\n");

    const historyText = Array.isArray(conversation_history)
      ? conversation_history
          .map((m: any, idx: number) => {
            const role = m.role === "user" ? "USUARIO" : "ASISTENTE (Musly)";
            const text = m.text || m.content || "";
            const intent = m.intent || m.payload?.intent ? ` [Intención: ${m.intent || m.payload?.intent}]` : "";
            return `[${idx + 1}] ${role}${intent}:\n${text}\n`;
          })
          .join("\n")
      : "No se proporcionó historial.";

    const logFooter = `\n================================================================================\n\n`;
    const fullLogEntry = logHeader + logTitle + logDetails + "\n" + historyText + logFooter;

    // 1. Save to Supabase ai_agent_reports table (Unified for Localhost and Vercel)
    let dbSuccess = false;
    let insertedRecord = null;
    try {
      const { data: dbData, error: dbErr } = await (supabase as any)
        .from("ai_agent_reports")
        .insert({
          session_id,
          user_comment: user_comment.trim(),
          participating_agents,
          conversation_history,
          created_at: timestamp,
          resolved: false,
        })
        .select()
        .single();

      if (dbErr) {
        console.error("Error al guardar reporte en Supabase:", dbErr);
      } else {
        dbSuccess = true;
        insertedRecord = dbData;
      }
    } catch (err: any) {
      console.error("Excepción guardando reporte en Supabase:", err);
    }

    // 2. Safe file log append
    const logDirectories = [
      path.join(process.cwd(), "logs"),
      path.join(process.cwd(), "..", "logs"),
      "/tmp",
    ];

    for (const dirPath of logDirectories) {
      try {
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
        const logFilePath = path.join(dirPath, "agent_reports.log");
        fs.appendFileSync(logFilePath, fullLogEntry, "utf-8");
      } catch (fileErr) {
        // Ignore read-only filesystem errors in Vercel root
      }
    }

    return NextResponse.json({
      success: true,
      db_saved: dbSuccess,
      report: insertedRecord,
      message: "Reporte de error registrado correctamente en Supabase.",
      timestamp,
    });
  } catch (error: any) {
    console.error("Error procesando reporte de agente:", error);
    return NextResponse.json(
      { error: error.message || "Error al registrar el reporte." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/ai/report
 * Marks a report as resolved or deletes it.
 * Body: { id: string, resolution_notes?: string, delete_report?: boolean }
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, resolution_notes = "", delete_report = false } = body;

    if (!id) {
      return NextResponse.json(
        { error: "El campo 'id' del reporte es requerido." },
        { status: 400 }
      );
    }

    if (delete_report) {
      const { error: delErr } = await (supabaseAdmin as any)
        .from("ai_agent_reports")
        .delete()
        .eq("id", id);

      if (delErr) throw delErr;

      return NextResponse.json({
        success: true,
        message: `Reporte ${id} eliminado de la base de datos de Supabase.`,
      });
    }

    // Mark as resolved
    const { data: updatedData, error: updateErr } = await (supabaseAdmin as any)
      .from("ai_agent_reports")
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolution_notes: resolution_notes || "Resuelto por el agente/desarrollador.",
      })
      .eq("id", id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({
      success: true,
      report: updatedData,
      message: `Reporte ${id} marcado como RESUELTO.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar el reporte." },
      { status: 500 }
    );
  }
}
