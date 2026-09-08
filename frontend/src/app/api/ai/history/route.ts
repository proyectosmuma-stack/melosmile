import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const session_id = searchParams.get("session_id");

    if (!session_id) {
      return NextResponse.json({ success: false, error: "session_id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("ai_conversation_history")
      .select("role, content, intent, created_at")
      .eq("session_id", session_id)
      .order("created_at", { ascending: true })
      .limit(20);

    if (error) {
      console.error("Error fetching conversation history:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, history: data });
  } catch (err: any) {
    console.error("Unexpected error in AI history API:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
