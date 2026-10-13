import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/server";

export const maxDuration = 60; // This route can run for up to 60 seconds

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const { session_id, intent, summary, entities } = b;

    if (!session_id || !summary) {
      return NextResponse.json({ error: "session_id and summary are required" }, { status: 400 });
    }

    const { error } = await supabase.from("ai_conversation_history").insert({
      session_id,
      role: "assistant",
      content: String(summary),
      intent: intent || "general_query",
      entities: entities || {},

    });

    if (error) {
      console.warn("Error inserting into ai_conversation_history:", error);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error in callback route:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
