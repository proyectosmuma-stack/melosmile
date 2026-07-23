import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

const N8N_BASE = process.env.N8N_WEBHOOK_BASE_URL ?? "https://n8n.mumaweb.com";
const DISPATCHER_PATH = "/webhook/melosmile-ai-dispatcher";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, message } = body;

    // Log user message asynchronously
    if (session_id && message) {
      (supabase as any).from("ai_conversation_history").insert({
        session_id,
        role: "user",
        content: message
      }).then();
    }

    const n8nRes = await fetch(`${N8N_BASE}${DISPATCHER_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // forward n8n key if available (for internal workflows that check it)
        ...(process.env.N8N_API_KEY
          ? { "X-N8N-API-KEY": process.env.N8N_API_KEY }
          : {}),
      },
      body: JSON.stringify(body),
      // give n8n up to 30s to process the AI agent call
      signal: AbortSignal.timeout(30_000),
    });

    const text = await n8nRes.text();

    // n8n may return empty body (200 OK with no content) or JSON
    let data: any = null;
    if (text.trim()) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }

    if (!n8nRes.ok) {
      return NextResponse.json(
        {
          intent: "error",
          summary: `El Dispatcher respondió con error ${n8nRes.status}. Inténtalo en unos segundos.`,
          error: text,
        },
        { status: n8nRes.status }
      );
    }

    // Normalize array vs object
    const normalized = Array.isArray(data) ? data[0] : data;

    // Log assistant message asynchronously
    if (session_id && normalized && (normalized.summary || normalized.output || normalized.message)) {
      (supabase as any).from("ai_conversation_history").insert({
        session_id,
        role: "assistant",
        content: normalized.summary || normalized.output || normalized.message || "Sin respuesta legible",
        intent: normalized.intent,
        entities: normalized.extracted_entities
      }).then();
    }

    if (!data) {
      return NextResponse.json({
        intent: "general_query",
        summary: "Instrucción enviada al Dispatcher. Respuesta pendiente (workflow sin salida configurada).",
        extracted_entities: {},
      });
    }

    return NextResponse.json(normalized);
  } catch (err: unknown) {
    const isTimeout =
      err instanceof Error && err.name === "TimeoutError";

    return NextResponse.json(
      {
        intent: "error",
        summary: isTimeout
          ? "El Dispatcher tardó demasiado en responder (>30s). Es posible que la API de Gemini esté saturada."
          : "No se pudo conectar con el Dispatcher. Verifica la conexión a n8n.",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}
