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

    let query = (supabase as any)
      .from("patients")
      .select("id, first_name, last_name, historia_id, dob, phone, email, allergies, current_medication");

    if (terms.length === 1) {
      const term = terms[0];
      query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,phone.ilike.%${term}%,historia_id.ilike.%${term}%`);
    } else {
      // Multi-word search (e.g., "Munir Callaos")
      // Match if all terms are present across first_name, last_name, or phone
      for (const term of terms) {
        query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,phone.ilike.%${term}%`);
      }
    }

    const { data, error } = await query.limit(5);

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
