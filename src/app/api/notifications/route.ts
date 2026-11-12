export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://xylqytpudbdcsbuuwqpi.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("system_notifications")
      .select("id, title, message, type, read, link, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching system notifications:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error: any) {
    console.error("Unexpected error in GET /api/notifications:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, read, link, title, message, type } = body;

    if (!id) {
      return NextResponse.json({ error: "Notification ID is required" }, { status: 400 });
    }

    const updateData: Record<string, any> = {};
    if (typeof read !== "undefined") updateData.read = read;
    if (typeof link !== "undefined") updateData.link = link;
    if (typeof title !== "undefined") updateData.title = title;
    if (typeof message !== "undefined") updateData.message = message;
    if (typeof type !== "undefined") updateData.type = type;

    const { error } = await supabase
      .from("system_notifications")
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error("Error updating system notification:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Unexpected error in PATCH /api/notifications:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
