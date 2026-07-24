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

function scorePatientMatch(patient: any, targetQuery: string): number {
  const fullName = `${patient.first_name || ""} ${patient.last_name || ""}`.toLowerCase().trim();
  const target = targetQuery.toLowerCase().trim();

  if (fullName === target) return 100;
  if (fullName.startsWith(target)) return 90;
  if (fullName.includes(target)) return 80;

  const terms = target.split(/\s+/).filter(Boolean);
  let matchedCount = 0;
  for (const t of terms) {
    if (fullName.includes(t)) matchedCount++;
  }

  return matchedCount * 20;
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
      .limit(10);

    if (error) throw error;

    let patients = data || [];

    // Sort patients by exactness/relevance match to sanitized search term
    patients.sort((a: any, b: any) => scorePatientMatch(b, sanitized) - scorePatientMatch(a, sanitized));
    patients = patients.slice(0, 5);

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
