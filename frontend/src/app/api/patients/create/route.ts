import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { first_name, last_name, phone, email, dob, historia_id } = body;

    if (!first_name || !last_name) {
      return NextResponse.json({ error: "first_name and last_name are required" }, { status: 400 });
    }

    const generatedHistoriaId = historia_id || `PAC-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data, error } = await (supabase as any).from("patients").insert({
      first_name,
      last_name,
      phone: phone || "600000000",
      email: email || `${first_name.toLowerCase()}.${last_name.toLowerCase()}@example.com`,
      dob: dob || "1990-01-01",
      historia_id: generatedHistoriaId
    }).select().single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
