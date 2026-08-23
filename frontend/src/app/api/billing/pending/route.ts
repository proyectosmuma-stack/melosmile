import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const patient_id = searchParams.get("patient_id");

  if (!patient_id) {
    return NextResponse.json({ error: "Missing query parameter 'patient_id'" }, { status: 400 });
  }

  try {
    // El paciente y el motivo llegan por el join con appointments
    // (billing_records NO tiene columnas patient_id ni appointment_reason).
    const { data, error } = await (supabase as any)
      .from("billing_records")
      .select("id, custom_price, calculated_total, status, created_at, appointments!inner(patient_id, reason)")
      .eq("appointments.patient_id", patient_id)
      .neq("status", "Facturado Odoo")
      .is("odoo_invoice_id", null)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Mapeo al contrato externo que consumen los clientes actuales
    // (claves appointment_reason y total_amount se mantienen por compatibilidad).
    const mapped = (data || []).map((row: any) => ({
      id: row.id,
      appointment_reason: row.appointments?.reason ?? null,
      total_amount: row.calculated_total ?? row.custom_price,
      custom_price: row.custom_price,
      status: row.status,
      created_at: row.created_at,
    }));

    return NextResponse.json(mapped);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
