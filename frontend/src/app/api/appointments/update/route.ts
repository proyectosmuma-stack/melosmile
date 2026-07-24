import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://amhfdzfcmpastmlsosou.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_kN-3hlqUxOni9onF1CDmhg_03EOCXG6"
);

function parseAppointmentDate(inputDate?: string): string {
  if (!inputDate) return new Date().toISOString();

  const str = inputDate.toLowerCase().trim();

  // Standard JS Date parse if valid (ISO, YYYY-MM-DD)
  const direct = new Date(inputDate);
  if (!isNaN(direct.getTime()) && str.includes("-")) return direct.toISOString();

  const now = new Date();
  let targetYear = now.getFullYear();
  let targetMonth = now.getMonth();
  let targetDay = now.getDate();
  let hours = 12;
  let minutes = 0;

  const months: Record<string, number> = {
    enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
    julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
  };

  if (str.includes("mañana") && !str.includes("pasado")) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    targetYear = d.getFullYear();
    targetMonth = d.getMonth();
    targetDay = d.getDate();
  } else if (str.includes("pasado mañana")) {
    const d = new Date(now);
    d.setDate(d.getDate() + 2);
    targetYear = d.getFullYear();
    targetMonth = d.getMonth();
    targetDay = d.getDate();
  } else if (str.includes("sábado") || str.includes("sabado")) {
    const d = new Date(now);
    const currentDay = d.getDay();
    const distance = (6 - currentDay + 7) % 7 || 7;
    d.setDate(d.getDate() + distance);
    targetYear = d.getFullYear();
    targetMonth = d.getMonth();
    targetDay = d.getDate();
  } else if (str.includes("domingo")) {
    const d = new Date(now);
    const currentDay = d.getDay();
    const distance = (0 - currentDay + 7) % 7 || 7;
    d.setDate(d.getDate() + distance);
    targetYear = d.getFullYear();
    targetMonth = d.getMonth();
    targetDay = d.getDate();
  } else if (str.includes("ayer")) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    targetYear = d.getFullYear();
    targetMonth = d.getMonth();
    targetDay = d.getDate();
  } else {
    // Match day number and optional month name (e.g. 23 de julio, 23/07)
    const dayMatch = str.match(/(\d{1,2})\s*(?:de|\/|-)?\s*([a-z]+)?/);
    if (dayMatch) {
      targetDay = parseInt(dayMatch[1], 10);
      if (dayMatch[2] && months[dayMatch[2]] !== undefined) {
        targetMonth = months[dayMatch[2]];
      }
    }
  }

  const timeMatch = str.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    hours = parseInt(timeMatch[1], 10);
    minutes = parseInt(timeMatch[2], 10);
  }

  // Construct UTC date
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
    const body = await req.json();
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
      action,
      delete_appointment,
    } = body;

    let targetId = appointment_id || id;
    let rawPatient = patient_id || patient_name || patient;
    let rawDate = appointment_date || date;
    let resolvedPatientId = null;

    const isDelete =
      action === "delete" ||
      delete_appointment === true ||
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

      // If no date was provided and no rows were updated, update the most recent appointment
      if ((!data || data.length === 0) && !rawDate) {
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

      return NextResponse.json({ success: true, action: "updated", count: data?.length || 0, data });
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
