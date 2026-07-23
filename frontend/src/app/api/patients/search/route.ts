import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

function cleanSearchTerm(term: string): string {
  if (!term) return "";
  let clean = term;
  try { clean = decodeURIComponent(clean); } catch (e) {}
  clean = clean.replace(/^["']|["']$/g, "").trim();

  // Strip conversational stop-words from patient search
  const stopPattern = /\b(c[oó]mo|se|llama|qu[ií]en|es|el|la|los|las|paciente|buscar|ver|de|para|con)\b/gi;
  let cleaned = clean.replace(stopPattern, "").replace(/[?¿!¡]/g, "").replace(/\s+/g, " ").trim();

  return cleaned.length > 0 ? cleaned : clean;
}

async function handleSearch(rawQ: string | null | undefined) {
  if (!rawQ?.trim()) {
    return NextResponse.json({ error: "Missing query parameter 'q'" }, { status: 400 });
  }

  try {
    const sanitized = cleanSearchTerm(rawQ);
    const terms = sanitized.split(/\s+/).filter(Boolean);

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

    const patients = data || [];
    const summary = patients.length > 0
      ? patients.map((p: any) => `Paciente: ${p.first_name} ${p.last_name} | ID Historia: ${p.historia_id} | Tel: ${p.phone || 'N/A'} | Email: ${p.email || 'N/A'}`).join("\n")
      : "No se encontraron pacientes con ese término de búsqueda.";

    return NextResponse.json({
      success: true,
      patients,
      summary,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return handleSearch(searchParams.get("q"));
}

export async function POST(request: Request) {
  let body: any = {};
  try {
    body = await request.json();
  } catch {}
  return handleSearch(body.q || body.query);
}
