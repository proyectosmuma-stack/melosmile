import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

const N8N_BASE = process.env.N8N_WEBHOOK_BASE_URL ?? "https://n8n.mumaweb.com";
const DISPATCHER_PATH = "/webhook/melosmile-ai-dispatcher";

function extractCleanText(raw: any): { intent: string; entities: any; summary: string } {
  if (!raw) {
    return { intent: "general_query", entities: {}, summary: "Sin respuesta del servidor." };
  }

  let item = Array.isArray(raw) ? raw[0] : raw;
  let intent = item.intent || "general_query";
  let entities = item.extracted_entities || {};
  let summary = item.summary || item.output || item.message || "";

  // If summary itself is wrapped in ```json ... ``` or is raw JSON string
  if (typeof summary === "string") {
    let str = summary.trim();
    try {
      const match = str.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonContent = match ? match[1] : str;
      if (jsonContent.startsWith("{") && jsonContent.endsWith("}")) {
        const parsed = JSON.parse(jsonContent);
        if (parsed.intent) intent = parsed.intent;
        if (parsed.extracted_entities) entities = parsed.extracted_entities;
        if (parsed.summary) summary = parsed.summary;
      }
    } catch (e) {
      // Keep string as is
    }

    // Strip leftover markdown code fencing
    summary = summary.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  }

  return { intent, entities, summary: summary || "Procesado correctamente." };
}

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
        ...(process.env.N8N_API_KEY ? { "X-N8N-API-KEY": process.env.N8N_API_KEY } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });

    const text = await n8nRes.text();

    let data: any = null;
    if (text.trim()) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { summary: text };
      }
    }

    if (!n8nRes.ok) {
      return NextResponse.json(
        {
          intent: "error",
          summary: `Musly respondió con un error (${n8nRes.status}). Inténtalo en unos segundos.`,
          error: text,
        },
        { status: n8nRes.status }
      );
    }

    const cleaned = extractCleanText(data);

    // Log assistant message asynchronously
    if (session_id && cleaned.summary) {
      (supabase as any).from("ai_conversation_history").insert({
        session_id,
        role: "assistant",
        content: cleaned.summary,
        intent: cleaned.intent,
        entities: cleaned.entities
      }).then();
    }

    return NextResponse.json({
      intent: cleaned.intent,
      extracted_entities: cleaned.entities,
      summary: cleaned.summary
    });
  } catch (err: unknown) {
    const isTimeout = err instanceof Error && err.name === "TimeoutError";

    return NextResponse.json(
      {
        intent: "error",
        summary: isTimeout
          ? "Musly tardó demasiado en responder (>30s). Es posible que la API de Gemini esté saturada."
          : "No se pudo conectar con Musly. Verifica la conexión a n8n.",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}
