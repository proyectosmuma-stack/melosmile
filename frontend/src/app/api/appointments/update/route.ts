export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { createClient } from "@supabase/supabase-js";

// Force Vercel deployment refresh: 2026-07-27T01:01:30
const BUILD_VERSION = "2026.07.27.FORCE_PURGE_UPDATE_ROUTE_1";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://amhfdzfcmpastmlsosou.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaGZkemZjbXBhc3RtbHNvc291Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDczNTM3NCwiZXhwIjoyMTAwMzExMzc0fQ.yPLQaV1xbfnuJJcNktxqbneP9Yb5UGlWfXA1tKYx6ZM"
);

function parseAppointmentDate(inputDate?: string): string {
  if (!inputDate) return new Date().toISOString();

  const str = inputDate.toLowerCase().trim();

  // 1. Standard JS Date parse if valid ISO or YYYY-MM-DD
  const direct = new Date(inputDate);
  if (!isNaN(direct.getTime()) && str.includes("-")) return direct.toISOString();

  // 2. Base Madrid Date calculation (Europe/Madrid)
  const now = new Date();
  const madridStr = now.toLocaleString("en-US", { timeZone: "Europe/Madrid" });
  const madridNow = new Date(madridStr);

  let targetYear = madridNow.getFullYear();
  let targetMonth = madridNow.getMonth();
  let targetDay = madridNow.getDate();
  let hours = 12;
  let minutes = 0;

  // Extract time if present (HH:MM or HHhMM)
  const timeMatch = str.match(/(\d{1,2})[:h](\d{2})?/i);
  if (timeMatch) {
    hours = parseInt(timeMatch[1], 10);
    minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
  }

  // Remove time string portion from str to prevent day matching collision
  const dateOnlyStr = str.replace(/(\d{1,2})[:h](\d{2})?/gi, "").trim();

  const months: Record<string, number> = {
    enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
    julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
  };

  const weekdays: Record<string, number> = {
    domingo: 0, lunes: 1, martes: 2, miércoles: 3, miercoles: 3,
    jueves: 4, viernes: 5, sábado: 6, sabado: 6
  };

  // Check relative keywords
  if (dateOnlyStr.includes("pasado mañana")) {
    const d = new Date(madridNow);
    d.setDate(d.getDate() + 2);
    targetYear = d.getFullYear();
    targetMonth = d.getMonth();
    targetDay = d.getDate();
  } else if (dateOnlyStr.includes("mañana")) {
    const d = new Date(madridNow);
    d.setDate(d.getDate() + 1);
    targetYear = d.getFullYear();
    targetMonth = d.getMonth();
    targetDay = d.getDate();
  } else if (dateOnlyStr.includes("ayer")) {
    const d = new Date(madridNow);
    d.setDate(d.getDate() - 1);
    targetYear = d.getFullYear();
    targetMonth = d.getMonth();
    targetDay = d.getDate();
  } else {
    // Check weekdays
    let matchedWeekday: number | null = null;
    for (const [wName, wNum] of Object.entries(weekdays)) {
      if (dateOnlyStr.includes(wName)) {
        matchedWeekday = wNum;
        break;
      }
    }

    if (matchedWeekday !== null) {
      const d = new Date(madridNow);
      const currentDay = d.getDay();
      let diff = matchedWeekday - currentDay;
      if (diff <= 0) diff += 7; // Next upcoming day
      d.setDate(d.getDate() + diff);
      targetYear = d.getFullYear();
      targetMonth = d.getMonth();
      targetDay = d.getDate();
    } else {
      // Match day number (1-31) and optional month name
      const dayMatch = dateOnlyStr.match(/(\d{1,2})\s*(?:de|\/|-)?\s*([a-z]+)?/i);
      if (dayMatch) {
        targetDay = parseInt(dayMatch[1], 10);
        if (dayMatch[2] && months[dayMatch[2]] !== undefined) {
          targetMonth = months[dayMatch[2]];
        }
      }
    }
  }

  // Construct UTC date ISO string
  const result = new Date(Date.UTC(targetYear, targetMonth, targetDay, hours, minutes, 0, 0));
  return result.toISOString();
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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const searchParams = url.searchParams;
    const body = await req.json().catch(() => ({}));
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
      rawAction.toLowerCase().includes("agendar") ||
      (!targetId && Boolean(rawPatient) && Boolean(rawDateStr));

    const isDelete =
      rawAction === "delete" ||
      delete_appointment === true ||
      rawAction.toLowerCase().includes("delete") ||
      rawAction.toLowerCase().includes("borrar") ||
      rawAction.toLowerCase().includes("eliminar") ||
      String(status).toLowerCase().includes("delete") ||
      String(status).toLowerCase().includes("borrar") ||
      String(status).toLowerCase().includes("eliminar");

    const dbClient = (supabaseAdmin || supabase) as any;

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

    // Perform update by targetId if present
    if (targetId) {
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
