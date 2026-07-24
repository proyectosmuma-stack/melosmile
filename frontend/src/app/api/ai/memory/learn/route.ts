import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Admin client with service role key to bypass RLS policies
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://amhfdzfcmpastmlsosou.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

/**
 * POST /api/ai/memory/learn
 * Saves or updates a learned phrase, vocabulary, or preference rule for the agent.
 * Body: { expression: string, meaning: string, category?: string, notes?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { expression, meaning, category = "vocabulary", notes = "" } = body;

    if (!expression || !expression.trim()) {
      return NextResponse.json(
        { success: false, error: "La expresión (palabra/modismo) es requerida." },
        { status: 400 }
      );
    }

    if (!meaning || !meaning.trim()) {
      return NextResponse.json(
        { success: false, error: "La interpretación o significado es requerido." },
        { status: 400 }
      );
    }

    const cleanExpression = expression.trim().toLowerCase();
    const cleanMeaning = meaning.trim();

    // Check if learning expression already exists
    const { data: existing } = await (supabaseAdmin as any)
      .from("agent_learnings")
      .select("id, usage_count")
      .eq("expression", cleanExpression)
      .maybeSingle();

    let resultData = null;

    if (existing && existing.id) {
      // Update existing record
      const { data, error } = await (supabaseAdmin as any)
        .from("agent_learnings")
        .update({
          meaning: cleanMeaning,
          category,
          notes: notes || "Actualizado por interacción con el usuario",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      resultData = data;
    } else {
      // Insert new record
      const { data, error } = await (supabaseAdmin as any)
        .from("agent_learnings")
        .insert({
          category,
          expression: cleanExpression,
          meaning: cleanMeaning,
          notes: notes || "Aprendido autónomamente por interacción",
          usage_count: 1,
        })
        .select()
        .single();

      if (error) throw error;
      resultData = data;
    }

    return NextResponse.json({
      success: true,
      message: `Aprendizaje guardado correctamente para "${cleanExpression}".`,
      learning: resultData,
    });
  } catch (error: any) {
    console.error("Error in /api/ai/memory/learn:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al guardar el aprendizaje del agente." },
      { status: 500 }
    );
  }
}
