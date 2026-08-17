import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    // 1. Check Vercel Cron authorization
    const authHeader = request.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Ping the database to keep it active
    // We do a simple limit(1) query to avoid payload issues
    const { data, error } = await supabaseAdmin
      .from("clinics")
      .select("id")
      .limit(1);

    if (error) {
      console.error("Keepalive DB Ping Error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Supabase keepalive ping successful",
      pingedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Keepalive Endpoint Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
