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

function toTitleCase(text: string): string {
  if (!text) return "";
  const lowercaseWords = new Set(["de", "del", "la", "las", "los", "y", "e", "o"]);
  return text
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word, idx) => {
      if (!word) return "";
      if (word.startsWith("(") && word.length > 1) {
        return "(" + word.charAt(1).toUpperCase() + word.slice(2);
      }
      if (idx > 0 && lowercaseWords.has(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

    let patientAmbiguous = false;

    // Resolve patient name to UUID if not a valid UUID
    if (!UUID_REGEX.test(resolvedPatientId)) {
      const cleanName = resolvedPatientId.trim();
      const parts = cleanName.split(/\s+/);
      const firstName = toTitleCase(parts[0] || "Paciente");
      const hasExplicitLastName = parts.length > 1;
      const lastName = toTitleCase(parts.slice(1).join(" ") || "General");

      // 1. Search by exact first_name & last_name match if full name provided
      let searchRes = await dbFetch(
        `patients?select=id,first_name,last_name&first_name=ilike.${encodeURIComponent(firstName)}&last_name=ilike.${encodeURIComponent(lastName)}&limit=10`
      );

      // 2. If no full match (or only first_name was provided), search by first_name alone
      if ((!searchRes.ok || !searchRes.data || searchRes.data.length === 0) && (!hasExplicitLastName || lastName === "General")) {
        searchRes = await dbFetch(
          `patients?select=id,first_name,last_name&first_name=ilike.${encodeURIComponent(firstName)}&limit=10`
        );
      }

      if (searchRes.ok && searchRes.data && searchRes.data.length === 1) {
        // EXACTLY 1 MATCH -> Bind directly to existing patient (context match)
        resolvedPatientId = searchRes.data[0].id;
      } else if (searchRes.ok && searchRes.data && searchRes.data.length > 1) {
        // MULTIPLE MATCHES -> Flag for review, associate with first patient so record is created
        resolvedPatientId = searchRes.data[0].id;
        patientAmbiguous = true;
      } else {
        // NO MATCH -> Create new patient with exact extracted names
        let nextNum = 2;
        const maxPacRes = await dbFetch(`patients?select=historia_id&historia_id=like.PAC-*&order=historia_id.desc&limit=100`);
        if (maxPacRes.ok && maxPacRes.data) {
          let highest = 0;
          for (const p of maxPacRes.data) {
            const match = (p.historia_id || "").match(/PAC-(\d+)/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > highest) highest = num;
            }
          }
          if (highest > 0) nextNum = highest + 1;
        }
        const generatedHistoriaId = `PAC-${String(nextNum).padStart(3, "0")}`;

        const cleanEmail = `${firstName.toLowerCase().replace(/[^a-z0-9]/gi, '')}.${lastName.toLowerCase().replace(/[^a-z0-9]/gi, '')}.${Math.floor(Math.random() * 10000)}@melosmile.local`;

        const createRes = await dbFetch(`patients`, {
          method: "POST",
          headers: { "Prefer": "return=representation" },
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            phone: "+34 600 000 000",
            email: cleanEmail,
            dob: "1990-01-01",
            historia_id: generatedHistoriaId,
          })
        });

        if (createRes.ok && createRes.data && createRes.data.length > 0) {
          resolvedPatientId = createRes.data[0].id;
        } else {
          const fetchByHist = await dbFetch(`patients?select=id&historia_id=eq.${generatedHistoriaId}&limit=1`);
          if (fetchByHist.ok && fetchByHist.data && fetchByHist.data.length > 0) {
            resolvedPatientId = fetchByHist.data[0].id;
          }
        }
      }
    }

    let activeTreatmentPlans: any[] = [];
    if (resolvedPatientId && UUID_REGEX.test(resolvedPatientId)) {
      const planRes = await dbFetch(`treatment_plans?select=id,monthly_fee,treatment_type&patient_id=eq.${resolvedPatientId}&status=eq.activo`);
      if (planRes.ok && planRes.data) {
        activeTreatmentPlans = planRes.data;
      }
    }

    let c_id = body.clinic_id;
    let p_id = body.professional_id;

    if (rawClinic && (!c_id || !UUID_REGEX.test(c_id))) {
      const cleanWords = String(rawClinic)
        .replace(/[^a-záéíóúñ0-9\s]/gi, "")
        .split(/\s+/)
        .filter(w => w.length > 2 && w.toLowerCase() !== "clinica" && w.toLowerCase() !== "clínica");
      
      if (cleanWords.length > 0) {
        const orClause = cleanWords.map(w => `name.ilike.%${encodeURIComponent(w)}%`).join(",");
        const clinicSearch = await dbFetch(`clinics?select=id&or=(${orClause})&limit=1`);
        if (clinicSearch.ok && clinicSearch.data?.[0]?.id) c_id = clinicSearch.data[0].id;
      }
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
      const oslySearch = await dbFetch(`professionals?select=id&or=(first_name.ilike.%Osly%,last_name.ilike.%Melo%)&order=created_at.asc&limit=1`);
      if (oslySearch.ok && oslySearch.data?.[0]?.id) {
        p_id = oslySearch.data[0].id;
      } else {
        const fallbackProf = await dbFetch(`professionals?select=id&order=created_at.asc&limit=1`);
        if (fallbackProf.data?.[0]?.id) p_id = fallbackProf.data[0].id;
      }
    }

    // Treatment Matching
    const rawTreatments = Array.isArray(body.treatments) ? body.treatments : (rawReason ? [rawReason] : ["Consulta General"]);
    
    const initialProcedures: any[] = [];
    let first_t_id: string | null = null;
    let combinedReason = "";
    let totalDbPrice = 0;
    let totalDbLabCost = 0;

    for (let i = 0; i < rawTreatments.length; i++) {
      let rawClean = String(rawTreatments[i]).trim();
      if (!rawClean) continue;
      
      let p_t_id = null;
      let p_reason = rawClean;
      let p_price = 0;
      let p_lab = 0;

      const exactSearch = await dbFetch(`treatments?select=id,service_name,default_price,lab_cost&service_name=ilike.${encodeURIComponent(rawClean)}&limit=1`);
      if (exactSearch.ok && exactSearch.data?.[0]) {
        p_t_id = exactSearch.data[0].id;
        p_reason = exactSearch.data[0].service_name;
        p_price = Number(exactSearch.data[0].default_price) || 0;
        p_lab = Number(exactSearch.data[0].lab_cost) || 0;
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
            p_t_id = fuzzySearch.data[0].id;
            p_reason = fuzzySearch.data[0].service_name;
            p_price = Number(fuzzySearch.data[0].default_price) || 0;
            p_lab = Number(fuzzySearch.data[0].lab_cost) || 0;
          }
        }
      }

      if (p_t_id && c_id) {
        const cpSearch = await dbFetch(`treatment_clinic_prices?select=price&treatment_id=eq.${p_t_id}&clinic_id=eq.${c_id}&limit=1`);
        if (cpSearch.ok && cpSearch.data?.[0]?.price !== undefined && cpSearch.data?.[0]?.price !== null) {
          p_price = Number(cpSearch.data[0].price);
        }
      }

      // Check if it is a Control/Mensualidad treatment and apply treatment plan's monthly fee
      const isControlTreatment = /control|mensualidad/i.test(p_reason) || /control|mensualidad/i.test(rawClean);
      if (isControlTreatment && activeTreatmentPlans.length > 0) {
        let matchedPlan = activeTreatmentPlans.find((plan) => {
          const typeName = (plan.treatment_type || "").toLowerCase();
          return typeName && (
            p_reason.toLowerCase().includes(typeName) ||
            rawClean.toLowerCase().includes(typeName)
          );
        });
        if (!matchedPlan) {
          matchedPlan = activeTreatmentPlans[0];
        }
        if (matchedPlan && matchedPlan.monthly_fee !== undefined && matchedPlan.monthly_fee !== null) {
          p_price = Number(matchedPlan.monthly_fee);
        }
      }

      if (!first_t_id) first_t_id = p_t_id;
      combinedReason += (combinedReason ? " + " : "") + p_reason;
      totalDbPrice += p_price;
      totalDbLabCost += p_lab;

      initialProcedures.push({
        id: Date.now().toString() + i,
        treatmentId: p_t_id || "",
        serviceName: p_reason,
        toothRef: "",
        dbPrice: p_price,
        dbCommission: 60,
        dbLabCost: p_lab,
        overridePrice: null,
        overrideCommission: null,
        overrideLabCost: null,
        showOverride: false,
      });
    }

    if (initialProcedures.length === 0) {
      combinedReason = "Consulta General";
      initialProcedures.push({
        id: Date.now().toString(),
        treatmentId: "",
        serviceName: "Consulta General",
        toothRef: "",
        dbPrice: 0,
        dbCommission: 60,
        dbLabCost: 0,
        overridePrice: null,
        overrideCommission: null,
        overrideLabCost: null,
        showOverride: false,
      });
    }

    let t_id = first_t_id;
    let finalReason = combinedReason;
    let matchedPrice = totalDbPrice;
    let matchedLabCost = totalDbLabCost;

    // RULE 1: Explicit Custom Price Override from document/agent
    const explicitPrice = body.price ?? body.price_eur;
    if (explicitPrice !== undefined && explicitPrice !== null && !isNaN(Number(explicitPrice))) {
      matchedPrice = Number(explicitPrice);
      if (initialProcedures.length > 0) {
         initialProcedures[0].overridePrice = matchedPrice;
         initialProcedures[0].showOverride = true;
         for (let i = 1; i < initialProcedures.length; i++) {
             initialProcedures[i].overridePrice = 0;
             initialProcedures[i].showOverride = true;
         }
      }
    }

    const isoDate = parseAppointmentDate(rawDate, rawTime);

    let initialNotes = rawClinic
      ? `Agendada por Asistente IA (${rawClinic})`
      : "Agendada por Asistente IA";
    if (patientAmbiguous) {
      initialNotes += `\n[REVISIÓN REQUERIDA: Múltiples pacientes con el mismo nombre en la clínica]`;
    }
    
    const incomingNotes = body.notes || body.observations || body.observation;
    if (incomingNotes) {
      initialNotes += `\n\n${incomingNotes}`;
    }
    
    initialNotes += `\n\n[Procedimientos: ${JSON.stringify(initialProcedures)}]`;

    const finalStatus = patientAmbiguous && body.status !== "Cancelada" ? "Pendiente de Revisión" : (body.status || "Pendiente");

    // Anti-duplication check: verify if an identical appointment already exists for this patient, clinic, date & reason
    const skipDupCheck = body.force_create === true || body.allow_duplicates === true;
    if (!skipDupCheck) {
      const datePart = isoDate.substring(0, 10);
      const startOfDay = `${datePart}T00:00:00.000Z`;
      const endOfDay = `${datePart}T23:59:59.999Z`;

      const dupQuery = `appointments?select=id,patient_id,clinic_id,appointment_date,reason&patient_id=eq.${resolvedPatientId}&clinic_id=eq.${c_id}&appointment_date=gte.${startOfDay}&appointment_date=lte.${endOfDay}&reason=eq.${encodeURIComponent(finalReason)}&limit=1`;
      const dupCheck = await dbFetch(dupQuery);

      if (dupCheck.ok && dupCheck.data && dupCheck.data.length > 0) {
        console.log(`[Anti-Dup] Skipping duplicate appointment creation for patient ${resolvedPatientId} on ${datePart} (${finalReason})`);
        return NextResponse.json({
          success: true,
          duplicated: true,
          skipped: true,
          message: "Cita omitida por existir ya un registro idéntico para este paciente en la misma fecha.",
          data: dupCheck.data[0],
          version: BUILD_VERSION
        });
      }
    }

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
        status: finalStatus,
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
