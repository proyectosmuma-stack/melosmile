import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/server";
import { parseRequestBody } from "@/lib/utils/parse-body";

export const dynamic = "force-dynamic";

/**
 * GET /api/ai/suggestions
 * Fetches frequent actions learned and persisted in the `agent_learnings` knowledge base.
 */
export async function GET() {
  try {
    // 1. Fetch from agent_learnings knowledge base (category = 'frequent_action')
    const { data: learnings, error } = await supabase
      .from("agent_learnings")
      .select("expression, usage_count, updated_at")
      .eq("category", "frequent_action")
      .order("usage_count", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(8);

    if (error) {
      console.error("Error fetching agent_learnings suggestions:", error);
    }

    const suggestionsList: Array<{ text: string; count: number; isLearned: boolean }> = [];
    const seen = new Set<string>();

    if (learnings && learnings.length > 0) {
      for (const item of learnings) {
        const text = (item.expression || "").trim();
        if (text && !seen.has(text.toLowerCase())) {
          seen.add(text.toLowerCase());
          suggestionsList.push({
            text,
            count: item.usage_count || 1,
            isLearned: true,
          });
        }
      }
    }

    // 2. If less than 4, supplement with top queries from ai_conversation_history
    if (suggestionsList.length < 4) {
      const { data: history } = await supabase
        .from("ai_conversation_history")
        .select("content")
        .eq("role", "user")
        .order("created_at", { ascending: false })
        .limit(100);

      if (history) {
        const counts: Record<string, number> = {};
        for (const row of history) {
          const text = (row.content || "").trim();
          if (
            text.length >= 8 &&
            text.length <= 65 &&
            !/^(hola|buenas|adios|si|no|ok|gracias|test|prueba)/i.test(text)
          ) {
            counts[text] = (counts[text] || 0) + 1;
          }
        }

        const sorted = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .map(([text, count]) => ({ text, count }));

        for (const s of sorted) {
          if (suggestionsList.length >= 6) break;
          if (!seen.has(s.text.toLowerCase())) {
            seen.add(s.text.toLowerCase());
            suggestionsList.push({
              text: s.text,
              count: s.count,
              isLearned: true,
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      suggestions: suggestionsList,
    });
  } catch (err: any) {
    console.error("Error in GET /api/ai/suggestions:", err);
    return NextResponse.json(
      { success: false, suggestions: [] },
      { status: 200 }
    );
  }
}

/**
 * POST /api/ai/suggestions
 * Persists an action pattern into the `agent_learnings` knowledge base table.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await parseRequestBody(req);
    const { prompt, intent = "frequent_action" } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ success: false, error: "Prompt is required" }, { status: 400 });
    }

    const clean = prompt.trim();
    // Validate prompt sanity
    if (clean.length < 6 || clean.length > 80) {
      return NextResponse.json({ success: false, error: "Prompt length invalid" }, { status: 400 });
    }
    if (/^(hola|buenas|adios|chao|si|no|ok|gracias|prueba|test)$/i.test(clean)) {
      return NextResponse.json({ success: false, error: "Ignored generic prompt" }, { status: 200 });
    }

    // Check if learning expression already exists in agent_learnings
    const { data: existing } = await supabase
      .from("agent_learnings")
      .select("id, usage_count")
      .ilike("expression", clean)
      .maybeSingle();

    if (existing && existing.id) {
      // Increment usage count and update timestamp
      await supabase
        .from("agent_learnings")
        .update({
          usage_count: (existing.usage_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      // Insert new learned action into knowledge base
      await supabase.from("agent_learnings").insert({
        expression: clean,
        meaning: `Acción aprendida (${intent})`,
        category: "frequent_action",
        notes: "Registrado persistentemente por uso del profesional",
        usage_count: 1,
      });
    }

    return NextResponse.json({ success: true, message: "Acción registrada en la base de conocimiento." });
  } catch (err: any) {
    console.error("Error in POST /api/ai/suggestions:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
