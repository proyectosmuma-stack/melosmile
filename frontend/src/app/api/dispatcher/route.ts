import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/server";

export const maxDuration = 60;

const N8N_BASE = process.env.N8N_WEBHOOK_BASE_URL ?? "https://n8nv2.mumaweb.com";
const DISPATCHER_PATH = "/webhook/melosmile-dispatcher";

function extractCleanText(raw: any): { intent: string; entities: any; summary: string } {
  if (!raw) {
    return { intent: "general_query", entities: {}, summary: "Musly no devolvio respuesta (cuerpo vacio). Revisa el workflow [MELOSMILE] AI Dispatcher en n8n." };
  }

  let item = Array.isArray(raw) ? raw[0] : raw;
  let intent = item.intent || "general_query";
  let extracted_entities = item.extracted_entities || {};
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
        if (parsed.entities) extracted_entities = parsed.entities;
        if (parsed.summary) summary = parsed.summary;
      }
    } catch (e) {
      // Keep string as is
    }

    // Strip leftover markdown code fencing
    summary = summary.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  }

  return { intent, entities: extracted_entities, summary: summary || "Procesado correctamente." };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, message, active_context } = body;
    
    // Historial reciente de la conversación (para que el LLM resuelva referencias sin re-preguntar)
    const historyArr: Array<{ role?: string; content?: string }> = Array.isArray(body.history) ? body.history : [];
    const historyText = historyArr
      .filter((h) => h && typeof h.content === "string" && h.content.trim().length > 0)
      .slice(-8)
      .map((h) => `${h.role === "assistant" ? "Musly" : "Usuario"}: ${String(h.content).trim()}`)
      .join("\n");

    // Inject Context & Guardrail
    let finalMessage = message;
    if (historyText) {
      finalMessage = `${finalMessage}\n\n[HISTORIAL RECIENTE DE LA CONVERSACIÓN (úsalo para resolver a qué paciente y, solo si el usuario ya lo mencionó, a qué clínica se refiere, SIN volver a preguntar):\n${historyText}]`;
    }
    if (active_context?.patient_id) {
       finalMessage = `${finalMessage}\n\n[SYSTEM CONTEXT INVISIBLE: El usuario está viendo actualmente la ficha del paciente con ID de base de datos: ${active_context.patient_id}. Si el usuario pide resumir, buscar, facturar o gestionar algo y no menciona un nombre, asume implícitamente que se refiere a este paciente y filtra tus búsquedas con este patient_id.]`;
    } else {
       finalMessage = `${finalMessage}\n\n[SYSTEM GUARDRAIL ESTRICTO: El usuario NO está en la ficha de ningún paciente (está en el menú global). ANTES de pedir el nombre del paciente, revisa el mensaje actual y el HISTORIAL RECIENTE. Si el paciente ya está identificado en cualquiera de los dos, NO vuelvas a preguntar su nombre: actúa o confirma directamente (la clínica, si no consta en el hilo, confírmala aparte). Solo si NO puedes identificar al paciente, y la solicitud implica leer historiales, buscar documentos, generar facturas o acceder a datos personales, detente y pregunta: '¿De qué paciente estamos hablando?']`;
    }

    // Log user message asynchronously (keep the original visual message for the UI logs)
    if (session_id && message) {
      try {
        await (supabase as any).from("ai_conversation_history").insert({
          session_id,
          role: "user",
          content: message,
          is_test: String(session_id || "").startsWith("test-")
        }).select();
      } catch (err: any) {
        console.warn("User conversation history log warning:", err?.message);
      }
    }

    const reqStart = new Date(Date.now() - 1000).toISOString(); // Margen de reloj de 1 segundo

    const n8nRes = await fetch(`${N8N_BASE}${DISPATCHER_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.N8N_API_KEY ? { "X-N8N-API-KEY": process.env.N8N_API_KEY } : {}),
      },
      body: JSON.stringify({ ...body, message: finalMessage, chatInput: finalMessage }), // Send the injected message to Musly
      signal: AbortSignal.timeout(55_000),
    });

    const text = await n8nRes.text();

    let data: any = null;
    let cleaned: { intent: string; entities: any; summary: string };
    let pollingResult: { content: string, intent: string | null, entities: any } | null = null;



    // --- Polling logic starts here, for both initial non-blocking responses or actual responses ---
    console.warn("[dispatcher] n8n initial responded (ok: %s, text_len: %d). Initiating polling...", n8nRes.ok, text.length);

    const pollingAttempts = 30; // Approx 50 seconds (30 * 1.5s)

    for (let i = 0; i < pollingAttempts; i++) {
      await new Promise(r => setTimeout(r, 1500)); // Esperar 1.5 segundos

      const { data, error: pollError } = await supabase
        .from("ai_conversation_history")
        .select("content,intent,entities")
        .eq("session_id", session_id)
        .eq("role", "assistant")
        .gte("created_at", reqStart)
        .order("created_at", { ascending: false })
        .limit(1);

      if (pollError) {
        console.error("Error during polling for conversation history:", pollError);
      }

      if (data && data.length > 0 && data[0].content) {
        pollingResult = data[0];
        break;
      }
    }

    if (pollingResult) {
      cleaned = {
        intent: pollingResult.intent || "general_query",
        entities: pollingResult.entities || {},
        summary: pollingResult.content,
      };

      // Log assistant message asynchronously (only if it wasn't already logged by n8n callback)
      // This is a safeguard if n8n webhook somehow fails to insert
      if (session_id && cleaned.summary) {
        try {
          const { data: existing, error: fetchError } = await (supabase as any).from("ai_conversation_history")
            .select("id")
            .eq("session_id", session_id)
            .eq("role", "assistant")
            .eq("content", cleaned.summary)
            .gte("created_at", reqStart)
            .limit(1);

          if (!fetchError && (!existing || existing.length === 0)) {
            await (supabase as any).from("ai_conversation_history").insert({
              session_id,
              role: "assistant",
              content: cleaned.summary,
              intent: cleaned.intent,
              entities: cleaned.entities,
              is_test: String(session_id || "").startsWith("test-")
            }).select();
          }
        } catch (err: any) {
          console.warn("Assistant conversation history log warning (polling fallback):", err?.message);
        }
      }

      return NextResponse.json({
        intent: cleaned.intent,
        extracted_entities: cleaned.entities,
        summary: cleaned.summary
      });
    } else if (n8nRes.ok && text.trim() && !text.includes("Workflow was started")) {
      // Fallback: If polling times out but n8n had a synchronous, non-ack response
      try {
        data = JSON.parse(text);
      } catch {
        data = { summary: text };
      }
      cleaned = extractCleanText(data);
      return NextResponse.json({
        intent: cleaned.intent,
        extracted_entities: cleaned.entities,
        summary: cleaned.summary
      });
    } else if (!n8nRes.ok) {
      return NextResponse.json(
        {
          intent: "error",
          summary: `Musly respondió con un error (${n8nRes.status}). Inténtalo en unos segundos.`,
          error: text,
        },
        { status: n8nRes.status }
      );
    } // Cierra el else del polling
  } catch (err: unknown) { // Este catch debe cerrar el try de la linea 43
    const isTimeout = err instanceof Error && err.name === "TimeoutError";

    return NextResponse.json(
      {
        intent: "error",
        summary: isTimeout
          ? "Musly tardó demasiado en responder (>55s). Es posible que la API de Gemini esté saturada o n8n no procesó la solicitud a tiempo."
          : "No se pudo conectar con Musly. Verifica la conexión a n8n.",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}
