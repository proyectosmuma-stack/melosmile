import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const ALLOWED = ["emitir_factura", "crear_cita", "reagendar_cita", "cancelar_cita", "programar_recordatorios"];

const db = supabaseAdmin as any;

// Crea una acción pendiente de confirmación (la invoca el sub-agente de n8n vía Tool_Propose_*).
// Acepta JSON body o query string (las tools n8n declaran sus args como query params).
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const url = new URL(req.url);

    const session_id = body.session_id ?? url.searchParams.get("session_id");
    const action_type = body.action_type ?? url.searchParams.get("action_type");
    const patient_id = body.patient_id ?? body.patientId ?? url.searchParams.get("patient_id") ?? url.searchParams.get("patientId");
    const rawIds = body.billingRecordIds ?? body.billing_record_ids ?? url.searchParams.get("billingRecordIds") ?? url.searchParams.get("billing_record_ids");

    if (!session_id || !action_type) {
      return NextResponse.json({ error: "session_id y action_type son requeridos" }, { status: 400 });
    }
    if (!ALLOWED.includes(action_type)) {
      return NextResponse.json({ error: "action_type inválido" }, { status: 400 });
    }

    // Normalizar billingRecordIds (CSV / array / string) -> array de UUIDs
    const billingRecordIds: string[] = Array.isArray(rawIds)
      ? rawIds
      : String(rawIds ?? "").split(",").map((s) => String(s).replace(/[[\]"' ]/g, "")).filter(Boolean);

    const payload: any = { ...(body.payload || {}) };
    if (action_type === "emitir_factura" && billingRecordIds.length) {
      payload.billingRecordIds = billingRecordIds;
    }

    const { data, error } = await db
      .from("pending_actions")
      .insert({
        session_id,
        action_type,
        patient_id: patient_id || null,
        payload,
      })
      .select("id, expires_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ id: data.id, expires_at: data.expires_at });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Lista las acciones pendientes de una sesión (para que el frontend muestre el botón).
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const session_id = url.searchParams.get("session_id");
    const status = url.searchParams.get("status");

    if (!session_id) {
      return NextResponse.json({ error: "session_id es requerido" }, { status: 400 });
    }

    let query = db
      .from("pending_actions")
      .select("id, action_type, patient_id, payload, status, created_at")
      .eq("session_id", session_id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ actions: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
