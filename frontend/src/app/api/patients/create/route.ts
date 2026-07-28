import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { first_name, last_name, phone, email, dob, historia_id } = body;

    const rawName = body.name || body.full_name || body.patient_name;
    if (rawName && (!first_name || !last_name)) {
      const parts = String(rawName).trim().split(/\s+/);
      first_name = parts[0];
      last_name = parts.slice(1).join(" ") || "Registrado";
    }

    if (!first_name) {
      return NextResponse.json({ error: "Nombre del paciente es requerido" }, { status: 400 });
    }

    let generatedHistoriaId = historia_id;
    if (!generatedHistoriaId) {
      const { data: maxPac } = await (supabase as any)
        .from("patients")
        .select("historia_id")
        .like("historia_id", "PAC-%")
        .order("historia_id", { ascending: false })
        .limit(50);
      let highest = 0;
      if (maxPac) {
        for (const p of maxPac) {
          const match = (p.historia_id || "").match(/PAC-(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > highest) highest = num;
          }
        }
      }
      generatedHistoriaId = `PAC-${String(highest + 1).padStart(3, "0")}`;
    }

    const { data, error } = await (supabase as any).from("patients").insert({
      first_name,
      last_name: last_name || "Sin Apellido",
      phone: phone || "+34 600 000 000",
      email: email || `${first_name.toLowerCase()}@melosmile.local`,
      dob: dob || "1990-01-01",
      historia_id: generatedHistoriaId
    }).select().single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
