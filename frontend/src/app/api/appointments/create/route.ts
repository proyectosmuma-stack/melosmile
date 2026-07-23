import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

function parseAppointmentDate(inputDate?: string, inputTime?: string): string {
  let combined = inputDate || "";
  if (inputTime && !combined.includes(inputTime)) {
    combined += ` ${inputTime}`;
  }

  const now = new Date();
  let target = new Date(now);

  if (combined.trim()) {
    const parsed = new Date(combined);
    if (!isNaN(parsed.getTime())) {
      target = parsed;
    } else {
      const lower = combined.toLowerCase();
      if (lower.includes("mañana")) {
        target.setDate(target.getDate() + 1);
      } else if (lower.includes("pasado mañana")) {
        target.setDate(target.getDate() + 2);
      }

      const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1], 10);
        const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        target.setHours(hours, minutes, 0, 0);
      } else {
        target.setHours(10, 0, 0, 0);
      }
    }
  } else {
    target.setHours(10, 0, 0, 0);
  }

  // Round minutes to nearest 15-min slot and clear seconds/ms
  const roundedMins = Math.round(target.getMinutes() / 15) * 15;
  if (roundedMins === 60) {
    target.setHours(target.getHours() + 1, 0, 0, 0);
  } else {
    target.setMinutes(roundedMins, 0, 0);
  }

  return target.toISOString();
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STOP_WORDS = new Set([
  "de", "del", "la", "el", "los", "las", "en", "para", "con", "sin", "por",
  "cita", "manana", "mañana", "hoy", "revision", "revisión", "control", "consulta", "ajuste"
]);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Accept multiple naming conventions passed by different LLM tool calls
    const rawPatient = body.patient_id || body.patient_name || body.patient || body.name || "Paciente General";
    const rawDate = body.appointment_date || body.date;
    const rawTime = body.time;
    const rawReason = body.reason || body.treatment || body.appointment_type || body.concept;
    const rawClinic = body.clinic || body.clinic_name || body.location;
    const rawDoctor = body.professional || body.doctor || body.professional_id;

    let resolvedPatientId = String(rawPatient);

    // Resolve patient name to UUID if not a valid UUID
    if (!UUID_REGEX.test(resolvedPatientId)) {
      const terms = resolvedPatientId.split(/\s+/).filter(Boolean);
      const orConditions = terms
        .flatMap((term) => [
          `first_name.ilike.%${term}%`,
          `last_name.ilike.%${term}%`,
          `phone.ilike.%${term}%`,
        ])
        .join(",");

      const { data: found } = await (supabase as any)
        .from("patients")
        .select("id")
        .or(orConditions)
        .limit(1)
        .maybeSingle();

      if (found) {
        resolvedPatientId = found.id;
      } else {
        // Create patient on the fly if not found
        const parts = resolvedPatientId.trim().split(/\s+/);
        const firstName = parts[0] || "Paciente";
        const lastName = parts.slice(1).join(" ") || "General";
        const generatedHistoriaId = `PAC-${Math.floor(1000 + Math.random() * 9000)}`;

        const { data: created, error: createErr } = await (supabase as any)
          .from("patients")
          .insert({
            first_name: firstName,
            last_name: lastName,
            phone: "+34 600 000 000",
            email: `${firstName.toLowerCase()}@melosmile.local`,
            dob: "1990-01-01",
            historia_id: generatedHistoriaId,
          })
          .select("id")
          .single();

        if (createErr || !created) {
          const { data: fallback } = await (supabase as any).from("patients").select("id").limit(1).single();
          resolvedPatientId = fallback?.id;
        } else {
          resolvedPatientId = created.id;
        }
      }
    }

    let c_id = body.clinic_id;
    let p_id = body.professional_id;

    if (rawClinic && (!c_id || !UUID_REGEX.test(c_id))) {
      const { data: matchedClinic } = await (supabase as any)
        .from("clinics")
        .select("id")
        .or(`name.ilike.%${rawClinic}%,address.ilike.%${rawClinic}%`)
        .limit(1)
        .maybeSingle();
      if (matchedClinic) c_id = matchedClinic.id;
    }

    if (!c_id || !UUID_REGEX.test(c_id)) {
      const { data: clinics } = await (supabase as any).from("clinics").select("id").limit(1).single();
      if (clinics) c_id = clinics.id;
    }

    // Default professional is ALWAYS Dra. Osly Melo unless explicitly requested otherwise
    if (rawDoctor && UUID_REGEX.test(rawDoctor)) {
      p_id = rawDoctor;
    } else if (rawDoctor && typeof rawDoctor === "string" && rawDoctor.trim().length > 0) {
      const { data: matchedDoctor } = await (supabase as any)
        .from("professionals")
        .select("id")
        .or(`first_name.ilike.%${rawDoctor}%,last_name.ilike.%${rawDoctor}%`)
        .limit(1)
        .maybeSingle();
      if (matchedDoctor) p_id = matchedDoctor.id;
    }

    if (!p_id || !UUID_REGEX.test(p_id)) {
      const { data: osly } = await (supabase as any)
        .from("professionals")
        .select("id")
        .or("first_name.ilike.%Osly%,last_name.ilike.%Melo%")
        .limit(1)
        .maybeSingle();

      if (osly) {
        p_id = osly.id;
      } else {
        const { data: profs } = await (supabase as any).from("professionals").select("id").limit(1).single();
        if (profs) p_id = profs.id;
      }
    }

    // Smart Treatment & Procedure Catalog Matching
    let t_id: string | null = null;
    let finalReason = rawReason || "Consulta General";
    let matchedPrice = 0;
    let matchedLabCost = 0;

    if (rawReason && typeof rawReason === "string") {
      const rawClean = rawReason.trim();
      
      // 1. Try exact match first
      const { data: exactMatch } = await (supabase as any)
        .from("treatments")
        .select("id, service_name, default_price, lab_cost")
        .ilike("service_name", rawClean)
        .limit(1)
        .maybeSingle();

      if (exactMatch) {
        t_id = exactMatch.id;
        finalReason = exactMatch.service_name;
        matchedPrice = Number(exactMatch.default_price) || 0;
        matchedLabCost = Number(exactMatch.lab_cost) || 0;
      } else {
        // 2. Filter terms without stop words
        const filteredTerms = rawClean
          .toLowerCase()
          .replace(/[^a-záéíóúñ0-9\s]/gi, "")
          .split(/\s+/)
          .filter((term) => term.length > 2 && !STOP_WORDS.has(term));

        if (filteredTerms.length > 0) {
          const orConditions = filteredTerms
            .flatMap((t) => [`service_name.ilike.%${t}%`, `abbreviation.ilike.%${t}%`])
            .join(",");

          const { data: fuzzyMatch } = await (supabase as any)
            .from("treatments")
            .select("id, service_name, default_price, lab_cost")
            .or(orConditions)
            .limit(1)
            .maybeSingle();

          if (fuzzyMatch) {
            t_id = fuzzyMatch.id;
            finalReason = fuzzyMatch.service_name;
            matchedPrice = Number(fuzzyMatch.default_price) || 0;
            matchedLabCost = Number(fuzzyMatch.lab_cost) || 0;
          }
        }
      }
    }

    const isoDate = parseAppointmentDate(rawDate, rawTime);

    // Initial Procedures Structure
    const initialProcedures = [
      {
        id: Date.now().toString(),
        treatmentId: t_id || "",
        serviceName: finalReason,
        toothRef: "",
        dbPrice: matchedPrice,
        dbCommission: 60,
        dbLabCost: matchedLabCost,
        overridePrice: null,
        overrideCommission: null,
        overrideLabCost: null,
        showOverride: false,
      },
    ];

    let initialNotes = rawClinic
      ? `Agendada por Asistente IA (${rawClinic})`
      : "Agendada por Asistente IA";
    initialNotes += `\n[Procedimientos: ${JSON.stringify(initialProcedures)}]`;

    const { data, error } = await (supabase as any)
      .from("appointments")
      .insert({
        patient_id: resolvedPatientId,
        clinic_id: c_id,
        professional_id: p_id,
        treatment_id: t_id,
        appointment_date: isoDate,
        reason: finalReason,
        status: body.status || "Confirmada",
        notes: initialNotes,
      })
      .select()
      .single();

    if (error) throw error;

    // Create billing record asynchronously so price & lab cost are immediately available
    if (data?.id) {
      const netTotal = matchedPrice * 0.6 - matchedLabCost * 0.5;
      await (supabase as any).from("billing_records").insert({
        appointment_id: data.id,
        custom_price: matchedPrice,
        applied_commission_rate: 60,
        applied_lab_discount_rate: 50,
        calculated_total: netTotal,
        billing_month: isoDate.substring(0, 10),
        status: "Pendiente",
      }).catch((bErr: any) => console.warn("Billing record insert notice:", bErr));
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error creando cita:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
