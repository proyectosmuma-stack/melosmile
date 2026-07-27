export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;
export const runtime = "nodejs";

import { NextResponse } from "next/server";

const BUILD_VERSION = "2026-07-27T05:59:00-pure-rest-v2-force-redeploy";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaGZkemZjbXBhc3RtbHNvc291Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDczNTM3NCwiZXhwIjoyMTAwMzExMzc0fQ.yPLQaV1xbfnuJJcNktxqbneP9Yb5UGlWfXA1tKYx6ZM";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://amhfdzfcmpastmlsosou.supabase.co";

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

async function dbFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      "apikey": SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

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

      const searchRes = await dbFetch(`patients?select=id&or=(${encodeURIComponent(orConditions)})&limit=1`);
      if (searchRes.ok && searchRes.data && searchRes.data.length > 0) {
        resolvedPatientId = searchRes.data[0].id;
      } else {
        const parts = (rawPatient || "Paciente General").trim().split(/\s+/);
        const firstName = parts[0] || "Paciente";
        const lastName = parts.slice(1).join(" ") || "General";
        const generatedHistoriaId = `PAC-${Math.floor(1000 + Math.random() * 9000)}`;

        const createRes = await dbFetch(`patients`, {
          method: "POST",
          headers: { "Prefer": "return=representation" },
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            phone: "+34 600 000 000",
            email: `${firstName.toLowerCase()}@melosmile.local`,
            dob: "1990-01-01",
            historia_id: generatedHistoriaId,
          })
        });

        if (createRes.ok && createRes.data && createRes.data.length > 0) {
          resolvedPatientId = createRes.data[0].id;
        } else {
          const fallbackRes = await dbFetch(`patients?select=id&limit=1`);
          resolvedPatientId = fallbackRes.data?.[0]?.id;
        }
      }
    }

    let c_id = body.clinic_id;
    let p_id = body.professional_id;

    if (rawClinic && (!c_id || !UUID_REGEX.test(c_id))) {
      const clinicSearch = await dbFetch(`clinics?select=id&or=(name.ilike.%${encodeURIComponent(rawClinic)}%,address.ilike.%${encodeURIComponent(rawClinic)}%)&limit=1`);
      if (clinicSearch.ok && clinicSearch.data?.[0]?.id) c_id = clinicSearch.data[0].id;
    }

    if (!c_id || !UUID_REGEX.test(c_id)) {
      const defaultClinic = await dbFetch(`clinics?select=id&limit=1`);
      if (defaultClinic.data?.[0]?.id) c_id = defaultClinic.data[0].id;
    }

    if (rawDoctor && UUID_REGEX.test(rawDoctor)) {
      p_id = rawDoctor;
    } else if (rawDoctor && typeof rawDoctor === "string" && rawDoctor.trim().length > 0) {
      const docSearch = await dbFetch(`professionals?select=id&or=(first_name.ilike.%${encodeURIComponent(rawDoctor)}%,last_name.ilike.%${encodeURIComponent(rawDoctor)}%)&limit=1`);
      if (docSearch.ok && docSearch.data?.[0]?.id) p_id = docSearch.data[0].id;
    }

    if (!p_id || !UUID_REGEX.test(p_id)) {
      const oslySearch = await dbFetch(`professionals?select=id&or=(first_name.ilike.%Osly%,last_name.ilike.%Melo%)&limit=1`);
      if (oslySearch.ok && oslySearch.data?.[0]?.id) {
        p_id = oslySearch.data[0].id;
      } else {
        const fallbackProf = await dbFetch(`professionals?select=id&limit=1`);
        if (fallbackProf.data?.[0]?.id) p_id = fallbackProf.data[0].id;
      }
    }

    // Treatment Matching
    let t_id: string | null = null;
    let finalReason = rawReason || "Consulta General";
    let matchedPrice = 0;
    let matchedLabCost = 0;

    if (rawReason && typeof rawReason === "string") {
      const rawClean = rawReason.trim();
      const exactSearch = await dbFetch(`treatments?select=id,service_name,default_price,lab_cost&service_name=ilike.${encodeURIComponent(rawClean)}&limit=1`);
      if (exactSearch.ok && exactSearch.data?.[0]) {
        t_id = exactSearch.data[0].id;
        finalReason = exactSearch.data[0].service_name;
        matchedPrice = Number(exactSearch.data[0].default_price) || 0;
        matchedLabCost = Number(exactSearch.data[0].lab_cost) || 0;
      } else {
        const filteredTerms = rawClean
          .toLowerCase()
          .replace(/[^a-záéíóúñ0-9\s]/gi, "")
          .split(/\s+/)
          .filter((term) => term.length > 2 && !STOP_WORDS.has(term));

        if (filteredTerms.length > 0) {
          const orConditions = filteredTerms
            .flatMap((t) => [`service_name.ilike.%${t}%`, `abbreviation.ilike.%${t}%`])
            .join(",");

          const fuzzySearch = await dbFetch(`treatments?select=id,service_name,default_price,lab_cost&or=(${encodeURIComponent(orConditions)})&limit=1`);
          if (fuzzySearch.ok && fuzzySearch.data?.[0]) {
            t_id = fuzzySearch.data[0].id;
            finalReason = fuzzySearch.data[0].service_name;
            matchedPrice = Number(fuzzySearch.data[0].default_price) || 0;
            matchedLabCost = Number(fuzzySearch.data[0].lab_cost) || 0;
          }
        }
      }
    }

    const isoDate = parseAppointmentDate(rawDate, rawTime);
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

    const insertApptRes = await dbFetch(`appointments`, {
      method: "POST",
      headers: { "Prefer": "return=representation" },
      body: JSON.stringify({
        patient_id: resolvedPatientId,
        clinic_id: c_id,
        professional_id: p_id,
        treatment_id: t_id,
        appointment_date: isoDate,
        reason: finalReason,
        status: body.status || "Pendiente",
        notes: initialNotes,
      })
    });

    if (!insertApptRes.ok || !insertApptRes.data) {
      return NextResponse.json({ error: insertApptRes.data?.message || JSON.stringify(insertApptRes.data) }, { status: 500 });
    }

    const newAppt = Array.isArray(insertApptRes.data) ? insertApptRes.data[0] : insertApptRes.data;

    // Create billing record so price & lab cost are immediately available
    if (newAppt?.id) {
      try {
        const netTotal = matchedPrice * 0.6 - matchedLabCost * 0.5;
        await dbFetch(`billing_records`, {
          method: "POST",
          headers: { "Prefer": "return=minimal" },
          body: JSON.stringify({
            appointment_id: newAppt.id,
            custom_price: matchedPrice,
            applied_commission_rate: 60,
            applied_lab_discount_rate: 50,
            calculated_total: netTotal,
            billing_month: isoDate.substring(0, 10),
            status: "Pendiente",
          })
        });
      } catch (bErr: any) {
        console.warn("Billing record insert notice:", bErr);
      }
    }

    return NextResponse.json({ success: true, data: newAppt, version: BUILD_VERSION });
  } catch (error: any) {
    console.error("Error creando cita:", error);
    return NextResponse.json({ error: error.message, version: BUILD_VERSION }, { status: 500 });
  }
}
