import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/server";

export const maxDuration = 60; // This function can run for a maximum of 60 seconds

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const session_id = searchParams.get("session_id");
    const before = searchParams.get("before"); // Optional: ISO date string

    if (!session_id) {
      return NextResponse.json({ success: false, error: "session_id is required" }, { status: 400 });
    }

    let query = supabase.from("ai_conversation_history").delete().eq("session_id", session_id);

    if (before) {
      query = query.lt("created_at", before);
    }

    const { error, count } = await query.then(({ error, count }) => ({ error, count }));

    if (error) {
      console.error("Error deleting conversation history:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: count });

  } catch (error: any) {
    console.error("Unhandled error in DELETE /api/ai/history/session:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
