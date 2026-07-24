import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Admin client with service role key to bypass RLS policies
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://amhfdzfcmpastmlsosou.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

/**
 * GET /api/ai/memory/search?query=...&category=...
 * Searches agent_learnings table for rules or vocabulary matching user input.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryStr = searchParams.get("query") || searchParams.get("q") || "";
    const category = searchParams.get("category") || "vocabulary";

    // 1. Fetch learnings from Supabase using supabaseAdmin
    let dbQuery = (supabaseAdmin as any)
      .from("agent_learnings")
      .select("*")
      .order("usage_count", { ascending: false });

    if (category && category !== "all") {
      dbQuery = dbQuery.eq("category", category);
    }

    const { data: allLearnings, error } = await dbQuery;

    if (error) {
      console.error("Error fetching agent learnings:", error);
      throw error;
    }

    if (!allLearnings || allLearnings.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        learnings: [],
        prompt_context: "",
      });
    }

    // 2. Perform fuzzy/semantic matching against query string
    const normalizedQuery = queryStr.toLowerCase().trim();
    const matchedLearnings = allLearnings.filter((item: any) => {
      if (!normalizedQuery) return true; // Return all if query is empty
      const expr = (item.expression || "").toLowerCase();
      
      // Match if query contains phrase, phrase contains query, or overlap of key terms
      return (
        normalizedQuery.includes(expr) ||
        expr.includes(normalizedQuery) ||
        normalizedQuery.split(" ").some((word) => word.length > 3 && expr.includes(word))
      );
    });

    // 3. Increment usage_count asynchronously for matched items
    if (matchedLearnings.length > 0 && normalizedQuery) {
      const idsToIncrement = matchedLearnings.map((m: any) => m.id);
      Promise.all(
        idsToIncrement.map((id: string) => {
          const item = matchedLearnings.find((m: any) => m.id === id);
          return (supabaseAdmin as any)
            .from("agent_learnings")
            .update({ usage_count: (item?.usage_count || 0) + 1, updated_at: new Date().toISOString() })
            .eq("id", id);
        })
      ).catch((err) => console.error("Error updating usage count:", err));
    }

    return NextResponse.json({
      success: true,
      count: matchedLearnings.length,
      learnings: matchedLearnings,
      // Helper string ready for insertion into AI system prompt:
      prompt_context: matchedLearnings
        .map((m: any) => `- "${m.expression}" => ${m.meaning}`)
        .join("\n"),
    });
  } catch (error: any) {
    console.error("Error in /api/ai/memory/search:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al buscar memorias del agente." },
      { status: 500 }
    );
  }
}
