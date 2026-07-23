import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawQ = searchParams.get("q")?.trim();

  if (!rawQ) {
    return NextResponse.json({ error: "Missing query parameter 'q'" }, { status: 400 });
  }

  try {
    const terms = rawQ.split(/\s+/).filter(Boolean);

    const orConditions = terms
      .flatMap((term) => [
        `first_name.ilike.%${term}%`,
        `last_name.ilike.%${term}%`,
        `phone.ilike.%${term}%`,
        `historia_id.ilike.%${term}%`,
      ])
      .join(",");

    const { data, error } = await (supabase as any)
      .from("patients")
      .select("id, first_name, last_name, historia_id, dob, phone, email, allergies, current_medication")
      .or(orConditions)
      .limit(5);

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
