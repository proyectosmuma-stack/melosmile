import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Fetch last 100 user messages from conversation history
    const { data: messages, error } = await supabase
      .from("ai_conversation_history")
      .select("content, created_at")
      .eq("role", "user")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ success: false, suggestions: [] });
    }

    // Count and rank queries that make good action suggestions
    const counts: Record<string, number> = {};
    for (const row of messages || []) {
      const text = (row.content || "").trim();
      // Only keep realistic prompt commands
      if (
        text.length >= 8 &&
        text.length <= 65 &&
        !/^(hola|buenas|adios|si|no|ok|gracias|test|prueba)/i.test(text)
      ) {
        counts[text] = (counts[text] || 0) + 1;
      }
    }

    // Sort by frequency
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([text]) => text)
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      suggestions: sorted,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, suggestions: [] },
      { status: 200 }
    );
  }
}
