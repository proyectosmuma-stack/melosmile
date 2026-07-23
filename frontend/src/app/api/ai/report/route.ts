import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { supabase } from "@/lib/supabase/client";

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

    // 1. Save to Supabase ai_agent_reports table
    let dbSuccess = false;
    try {
      const { error: dbErr } = await (supabase as any).from("ai_agent_reports").insert({
        session_id,
        user_comment: user_comment.trim(),
        participating_agents,
        conversation_history,
        created_at: timestamp,
      });
      if (dbErr) {
        console.error("Error al guardar reporte en Supabase:", dbErr);
      } else {
        dbSuccess = true;
      }
    } catch (err: any) {
      console.error("Excepción guardando reporte en Supabase:", err);
    }

    // 2. Safe file log append (works in local environment and Vercel /tmp)
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
        // Ignore read-only filesystem errors in production Vercel root
      }
    }

    return NextResponse.json({
      success: true,
      db_saved: dbSuccess,
      message: "Reporte de error guardado con éxito.",
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
