import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q) {
    return NextResponse.json({ error: "Missing query parameter 'q'" }, { status: 400 });
  }

  try {
    const { data, error } = await (supabase as any)
      .from("patients")
      .select("id, first_name, last_name, historia_id, dob, phone, email, allergies, current_medication")
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%`)
      .limit(5);

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
