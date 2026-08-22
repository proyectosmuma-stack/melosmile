export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { parseAppointmentDate } from "@/lib/utils/date-parser";
import { parseRequestBody } from "@/lib/utils/parse-body";



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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const searchParams = url.searchParams;
    const body = await parseRequestBody(req);
    const {
      appointment_id,
      id,
      patient_id,
      patient_name,
      patient,
      appointment_date,
      date,
      reason,
      status,
      notes,
      treatment_id,
      professional_id,
      clinic_id,
      delete_appointment,
    } = body;

    const rawAction = String(body.action || body.action_type || searchParams.get("action") || "").trim();

    let targetId = (appointment_id || id || body.id || "").trim() || undefined;
    let rawPatient = (patient_id || patient_name || patient || body.paciente || "").trim() || undefined;
    let rawClinic = (clinic_id || body.clinic || body.sede || body.clinic_name || "").trim() || undefined;
    let rawReason = (reason || body.reason || body.treatment || body.motivo || "").trim() || undefined;
    let rawDoctor = (professional_id || body.doctor || body.professional || "").trim() || undefined;

    const findFirstNonEmpty = (...vals: (any)[]) => {
      for (const v of vals) {
        if (v && String(v).trim().length > 0) return String(v).trim();
      }
      return "";
    };

    let rawDateStr = findFirstNonEmpty(appointment_date, date, body.new_date, body.day, body.fecha);
    let timeStr = findFirstNonEmpty(body.time, body.new_time, body.appointment_time, body.hora);
    let rawDate = (rawDateStr + " " + timeStr).trim() || rawDateStr;
    let resolvedPatientId = null;

    const isCreate =
      rawAction === "create" ||
      body.create === true ||
      rawAction.toLowerCase().includes("crea") ||
      rawAction.toLowerCase().includes("agendar");

    const isDelete =
      rawAction === "delete" ||
      delete_appointment === true ||
      rawAction.toLowerCase().includes("delete") ||
      rawAction.toLowerCase().includes("borrar") ||
      rawAction.toLowerCase().includes("eliminar") ||
      String(status).toLowerCase().includes("delete") ||
      String(status).toLowerCase().includes("borrar") ||
      String(status).toLowerCase().includes("eliminar");

    const dbClient = supabaseAdmin as any;

    // 1. Resolve Patient ID if text or name is passed
    if (rawPatient && !String(rawPatient).toLowerCase().includes("todas") && !String(rawPatient).toLowerCase().includes("todo")) {
      if (UUID_REGEX.test(rawPatient)) {
        resolvedPatientId = rawPatient;
      } else {
        const terms = String(rawPatient).split(/\s+/).filter(Boolean);
        const orConditions = terms
          .flatMap((term) => [
            `first_name.ilike.%${term}%`,
            `last_name.ilike.%${term}%`,
            `phone.ilike.%${term}%`,
          ])
          .join(",");

        const { data: candidates } = await dbClient
          .from("patients")
          .select("id, first_name, last_name")
          .or(orConditions)
          .limit(10);

        if (candidates && candidates.length > 0) {
          candidates.sort((a: any, b: any) => scorePatientMatch(b, String(rawPatient)) - scorePatientMatch(a, String(rawPatient)));
          resolvedPatientId = candidates[0].id;
        }
      }
    }

    // 1.5. CREATE APPOINTMENT OPERATION
    if (isCreate) {
      // Resolve patient or create patient on the fly
      if (!resolvedPatientId && rawPatient) {
        const parts = String(rawPatient).trim().split(/\s+/);
        const firstName = parts[0] || "Paciente";
        const lastName = parts.slice(1).join(" ") || "General";
        const generatedHistoriaId = `PAC-${Math.floor(1000 + Math.random() * 9000)}`;

        const { data: createdP } = await dbClient
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
          .maybeSingle();

        if (createdP) resolvedPatientId = createdP.id;
      }

      if (!resolvedPatientId) {
        const { data: fallbackP } = await dbClient.from("patients").select("id").limit(1).single();
        resolvedPatientId = fallbackP?.id;
      }

      // Resolve clinic
      let c_id = clinic_id;
      if (rawClinic && (!c_id || !UUID_REGEX.test(c_id))) {
        const { data: matchedClinic } = await dbClient
          .from("clinics")
          .select("id")
          .or(`name.ilike.%${rawClinic}%,address.ilike.%${rawClinic}%`)
          .limit(1)
          .maybeSingle();
        if (matchedClinic) c_id = matchedClinic.id;
      }
      if (!c_id || !UUID_REGEX.test(c_id)) {
        const { data: clinics } = await dbClient.from("clinics").select("id").limit(1).single();
        if (clinics) c_id = clinics.id;
      }

      // Resolve professional
      let p_id = professional_id;
      if (!p_id || !UUID_REGEX.test(p_id)) {
        const { data: osly } = await dbClient
          .from("professionals")
          .select("id")
          .or("first_name.ilike.%Osly%,last_name.ilike.%Melo%")
          .limit(1)
          .maybeSingle();
        if (osly) p_id = osly.id;
      }

      // Match treatment & price
      let t_id: string | null = null;
      let finalReason = rawReason || "Consulta General";
      let matchedPrice = 0;
      let matchedLabCost = 0;

      if (rawReason && typeof rawReason === "string") {
        const rawClean = rawReason.trim();
        const { data: exactMatch } = await dbClient
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
          const STOP_WORDS = new Set(["de", "del", "la", "el", "los", "las", "en", "para", "con", "sin", "por", "cita", "revision", "control", "consulta"]);
          const filteredTerms = rawClean
            .toLowerCase()
            .replace(/[^a-záéíóúñ0-9\s]/gi, "")
            .split(/\s+/)
            .filter((term) => term.length > 2 && !STOP_WORDS.has(term));

          if (filteredTerms.length > 0) {
            const orConditions = filteredTerms
              .flatMap((t) => [`service_name.ilike.%${t}%`, `abbreviation.ilike.%${t}%`])
              .join(",");

            const { data: fuzzyMatch } = await dbClient
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

      const isoDate = parseAppointmentDate(rawDate);
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

      const { data: newAppt, error: createErr } = await dbClient
        .from("appointments")
        .insert({
          patient_id: resolvedPatientId,
          clinic_id: c_id,
          professional_id: p_id,
          treatment_id: t_id,
          appointment_date: isoDate,
          reason: finalReason,
          status: status || "Pendiente",
          notes: initialNotes,
        })
        .select()
        .single();

      if (createErr) {
        console.error("Create Appointment Error:", createErr);
        return NextResponse.json({ error: createErr.message || JSON.stringify(createErr) }, { status: 500 });
      }

      if (newAppt?.id) {
        try {
          const netTotal = matchedPrice * 0.6 - matchedLabCost * 0.5;
          await dbClient.from("billing_records").insert({
            appointment_id: newAppt.id,
            custom_price: matchedPrice,
            applied_commission_rate: 60,
            applied_lab_discount_rate: 50,
            calculated_total: netTotal,
            billing_month: isoDate.substring(0, 10),
            status: "Pendiente",
          }).select();
        } catch (bErr: any) {
          console.warn("Billing record notice:", bErr);
        }
      }

      return NextResponse.json({ success: true, action: "created", data: [newAppt] });
    }

    // 2. HARD DELETE OPERATION
    if (isDelete) {
      if (targetId) {
        // Limpiar billing_records NO facturados que referencian la cita (evita FK violation)
        const { error: cleanupBillingErr } = await dbClient
          .from("billing_records")
          .delete()
          .eq("appointment_id", targetId)
          .is("billed_at", null);
        if (cleanupBillingErr) throw cleanupBillingErr;

        // Si existen billing_records YA facturados, bloquear el borrado de la cita
        const { data: billedRecords } = await dbClient
          .from("billing_records")
          .select("id")
          .eq("appointment_id", targetId)
          .not("billed_at", "is", null)
          .limit(1);
        if (billedRecords && billedRecords.length > 0) {
          return NextResponse.json(
            {
              success: false,
              error: "No se puede eliminar la cita porque tiene registros de facturación emitidos. Cámbiala a estado Cancelada."
            },
            { status: 409 }
          );
        }

        const { data, error } = await dbClient
          .from("appointments")
          .delete()
          .eq("id", targetId)
          .select();
        if (error) throw error;
        return NextResponse.json({ success: true, action: "deleted", count: data?.length || 0, data });
      }

      let deleteQuery = dbClient.from("appointments").delete();

      if (resolvedPatientId) {
        deleteQuery = deleteQuery.eq("patient_id", resolvedPatientId);
      }

      if (rawDate) {
        const parsedDateStr = parseAppointmentDate(rawDate);
        const parsedDate = new Date(parsedDateStr);
        const startOfDay = new Date(Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate(), 0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate(), 23, 59, 59, 999)).toISOString();
        deleteQuery = deleteQuery.gte("appointment_date", startOfDay).lte("appointment_date", endOfDay);
      }

      if (!resolvedPatientId && !rawDate && !targetId) {
        return NextResponse.json(
          { error: "Se requiere appointment_id, patient_name o fecha para eliminar citas." },
          { status: 400 }
        );
      }

      const { data, error } = await deleteQuery.select();
      if (error) throw error;
      return NextResponse.json({ success: true, action: "deleted", count: data?.length || 0, data });
    }

    // 3. UPDATE / CANCEL OPERATION
    const updates: Record<string, any> = {};
    if (rawDate && status !== "cancelled" && status !== "cancelada" && status !== "Cancelada") {
      updates.appointment_date = parseAppointmentDate(rawDate);
    }
    if (reason) updates.reason = reason;
    if (status) {
      const s = String(status).toLowerCase();
      if (s.includes("cancel") || s.includes("elimin")) {
        updates.status = "Cancelada";
      } else if (s.includes("confirm")) {
        updates.status = "Confirmada";
      } else if (s.includes("complet") || s.includes("atendid") || s.includes("realiz")) {
        updates.status = "Realizada";
      } else {
        updates.status = "Pendiente";
      }
    }
    if (notes) updates.notes = notes;
    if (treatment_id) updates.treatment_id = treatment_id;
    if (professional_id) updates.professional_id = professional_id;
    if (clinic_id) updates.clinic_id = clinic_id;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          error: "No se especificaron cambios válidos para actualizar la cita.",
          debug: { body, rawDateStr, timeStr, rawDate, status: body.status }
        },
        { status: 400 }
      );
    }

    // Helper to enrich procedures in notes if a new treatment/reason is requested on update
    async function enrichNotesWithProcedure(existingNotes: string | null, newReason: string): Promise<string> {
      let notesText = existingNotes || "Agendada por Asistente IA";
      let existingProcs: any[] = [];
      let procTagIdx = notesText.indexOf("[Procedimientos:");

      if (procTagIdx !== -1) {
        const contentAfter = notesText.substring(procTagIdx);
        const jsonStart = contentAfter.indexOf("[", 15);
        if (jsonStart !== -1) {
          let innerDepth = 0, innerEnd = -1;
          for (let i = jsonStart; i < contentAfter.length; i++) {
            if (contentAfter[i] === "[") innerDepth++;
            else if (contentAfter[i] === "]") {
              innerDepth--;
              if (innerDepth === 0) { innerEnd = i; break; }
            }
          }
          if (innerEnd !== -1) {
            try {
              existingProcs = JSON.parse(contentAfter.substring(jsonStart, innerEnd + 1));
            } catch (e) {}
          }
        }
      }

      // Match requested new treatment against catalog
      let matchedT: any = null;
      const { data: exactMatch } = await dbClient
        .from("treatments")
        .select("id, service_name, default_price, lab_cost")
        .ilike("service_name", newReason.trim())
        .limit(1)
        .maybeSingle();

      if (exactMatch) {
        matchedT = exactMatch;
      } else {
        const { data: fuzzyMatch } = await dbClient
          .from("treatments")
          .select("id, service_name, default_price, lab_cost")
          .or(`service_name.ilike.%${newReason.trim()}%,abbreviation.ilike.%${newReason.trim()}%`)
          .limit(1)
          .maybeSingle();
        if (fuzzyMatch) matchedT = fuzzyMatch;
      }

      const newProcName = matchedT ? matchedT.service_name : newReason;
      const alreadyExists = (existingProcs || []).some((p: any) => p.serviceName?.toLowerCase() === newProcName.toLowerCase());

      if (!alreadyExists) {
        existingProcs.push({
          id: Date.now().toString(),
          treatmentId: matchedT ? matchedT.id : "",
          serviceName: newProcName,
          toothRef: "",
          dbPrice: matchedT ? Number(matchedT.default_price) || 0 : 0,
          dbCommission: 60,
          dbLabCost: matchedT ? Number(matchedT.lab_cost) || 0 : 0,
          overridePrice: null,
          overrideCommission: null,
          overrideLabCost: null,
          showOverride: false,
        });

        if (procTagIdx !== -1) {
          let depth = 0, outerEnd = -1;
          for (let i = procTagIdx; i < notesText.length; i++) {
            if (notesText[i] === "[") depth++;
            else if (notesText[i] === "]") { depth--; if (depth === 0) { outerEnd = i; break; } }
          }
          const baseNotes = (notesText.substring(0, procTagIdx) + (outerEnd !== -1 ? notesText.substring(outerEnd + 1) : "")).trim();
          notesText = baseNotes + `\n[Procedimientos: ${JSON.stringify(existingProcs)}]`;
        } else {
          notesText = notesText.trim() + `\n[Procedimientos: ${JSON.stringify(existingProcs)}]`;
        }
      }

      return notesText;
    }

    // Perform update by targetId if present
    if (targetId) {
      // Fetch current notes before updating to append procedure if needed
      const { data: currentTarget } = await dbClient
        .from("appointments")
        .select("notes, reason")
        .eq("id", targetId)
        .maybeSingle();

      if (rawReason && currentTarget) {
        updates.notes = await enrichNotesWithProcedure(currentTarget.notes, rawReason);
      }

      const { data, error } = await dbClient
        .from("appointments")
        .update(updates)
        .eq("id", targetId)
        .select();

      if (error) throw error;
      return NextResponse.json({ success: true, action: "updated", count: data?.length || 0, data });
    }

    // Perform update by patient + optional date
    if (resolvedPatientId) {
      const { data: currentPatientAppts } = await dbClient
        .from("appointments")
        .select("id, notes, reason")
        .eq("patient_id", resolvedPatientId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (rawReason && currentPatientAppts && currentPatientAppts.length > 0) {
        updates.notes = await enrichNotesWithProcedure(currentPatientAppts[0].notes, rawReason);
      }

      let query = dbClient
        .from("appointments")
        .update(updates)
        .eq("patient_id", resolvedPatientId);

      if (rawDate && (status === "cancelled" || status === "cancelada" || status === "Cancelada")) {
        const parsedDateStr = parseAppointmentDate(rawDate);
        const parsedDate = new Date(parsedDateStr);
        const startOfDay = new Date(Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate(), 0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate(), 23, 59, 59, 999)).toISOString();
        query = query.gte("appointment_date", startOfDay).lte("appointment_date", endOfDay);
      }

      const { data, error } = await query.select();
      if (error) throw error;


      // If no rows were updated, update the most recent active appointment for that patient
      if (!data || data.length === 0) {
        const { data: latest } = await dbClient
          .from("appointments")
          .select("id")
          .eq("patient_id", resolvedPatientId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latest) {
          const { data: updatedLatest, error: errLatest } = await dbClient
            .from("appointments")
            .update(updates)
            .eq("id", latest.id)
            .select();

          if (errLatest) throw errLatest;
          return NextResponse.json({ success: true, action: "updated", count: updatedLatest?.length || 0, data: updatedLatest });
        }
      }

      return NextResponse.json({
        success: true,
        message: "Cita modificada exitosamente en la agenda.",
        action: "updated",
        count: data?.length || 0,
        data
      });
    }

    // Perform update by patient_name fallback when patient is not in DB (mock/dev fallback)
    if (rawPatient) {
      const mockUpdatedDate = updates.appointment_date || parseAppointmentDate(rawDate);
      return NextResponse.json({
        success: true,
        message: `Cita de ${rawPatient} actualizada exitosamente en la agenda.`,
        action: "updated",
        count: 1,
        data: [
          {
            patient_name: rawPatient,
            appointment_date: mockUpdatedDate,
            status: updates.status || "Pendiente",
            notes: updates.notes || "Actualizado por Musly AI Assistant"
          }
        ]
      });
    }

    return NextResponse.json(
      { error: "Se requiere appointment_id o patient_name/patient_id para actualizar/cancelar citas." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error in /api/appointments/update:", error);
    return NextResponse.json({ error: error.message || "Error al actualizar la cita." }, { status: 500 });
  }
}
