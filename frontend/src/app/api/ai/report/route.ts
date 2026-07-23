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

    // Ensure logs directory exists in project root and frontend root
    const projectRootLogs = path.join(process.cwd(), "..", "logs");
    const frontendLogs = path.join(process.cwd(), "logs");

    [projectRootLogs, frontendLogs].forEach((dirPath) => {
      try {
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
        const logFilePath = path.join(dirPath, "agent_reports.log");
        fs.appendFileSync(logFilePath, fullLogEntry, "utf-8");
      } catch (fileErr) {
        console.error(`Error escribiendo log en ${dirPath}:`, fileErr);
      }
    });

    // Optionally attempt saving to Supabase if table exists
    try {
      await (supabase as any).from("ai_agent_reports").insert({
        session_id,
        user_comment: user_comment.trim(),
        participating_agents,
        conversation_history,
        created_at: timestamp,
      });
    } catch (dbErr) {
      // Table might not exist yet, log to file is primary
      console.warn("Notice: ai_agent_reports DB table skip/notice:", dbErr);
    }

    return NextResponse.json({
      success: true,
      message: "Reporte registrado correctamente en logs/agent_reports.log",
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
