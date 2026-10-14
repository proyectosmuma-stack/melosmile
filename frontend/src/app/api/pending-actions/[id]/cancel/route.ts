import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const db = supabaseAdmin as any;

// Cancela una acción pendiente (idempotente; solo pending/confirmed).
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { data, error } = await db
      .from("pending_actions")
      .update({ status: "cancelled" })
      .eq("id", id)
      .in("status", ["pending", "confirmed"])
      .select("id")
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, id, cancelled: !!data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
