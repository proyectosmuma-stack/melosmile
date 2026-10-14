import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createInvoiceFromBilling } from "@/lib/odoo/create-invoice";

export const maxDuration = 60;

// pending_actions aún no está en los tipos generados de Supabase; se castea a any.
const db = supabaseAdmin as any;

// Confirma y ejecuta DETERMINISTA la acción pendiente (sin LLM).
// Idempotente: solo una transición pending -> confirmed es posible (claim atómico).
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    // 1) Claim atómico: pending -> confirmed. Si 0 filas, ya fue reclamada/cancelada/expired.
    const { data: claimed, error: claimErr } = await db
      .from("pending_actions")
      .update({ status: "confirmed" })
      .eq("id", id)
      .eq("status", "pending")
      .select("*")
      .single();

    if (claimErr || !claimed) {
      const { data: existing } = await db.from("pending_actions").select("*").eq("id", id).single();
      if (existing?.status === "executed") {
        return NextResponse.json({ success: true, id, already_executed: true, result: existing.result });
      }
      if (existing?.status === "cancelled") {
        return NextResponse.json({ success: false, error: "La acción fue cancelada" }, { status: 409 });
      }
      if (existing?.status === "expired") {
        return NextResponse.json({ success: false, error: "La propuesta caducó. Vuelve a pedirla." }, { status: 410 });
      }
      return NextResponse.json({ success: false, error: "La acción ya está en curso o no existe" }, { status: 409 });
    }

    // 2) Caducidad
    if (claimed.expires_at && new Date(claimed.expires_at).getTime() < Date.now()) {
      await db.from("pending_actions").update({ status: "expired" }).eq("id", id);
      return NextResponse.json({ success: false, error: "La propuesta caducó. Vuelve a pedirla." }, { status: 410 });
    }

    // 3) Ejecución determinista por tipo
    let result: any;
    try {
      if (claimed.action_type === "emitir_factura") {
        result = await executeInvoice(claimed.patient_id, claimed.payload?.billingRecordIds || []);
      } else {
        await db.from("pending_actions").update({ status: "pending" }).eq("id", id);
        return NextResponse.json({ success: false, error: `Tipo de acción no implementado: ${claimed.action_type}` }, { status: 501 });
      }
    } catch (execErr: any) {
      // Revierte el claim para que el doctor pueda reintentar (la acción no se ejecutó).
      await db.from("pending_actions").update({ status: "pending" }).eq("id", id);
      return NextResponse.json({ success: false, error: execErr.message }, { status: 502 });
    }

    // 4) Marcar ejecutada
    await db.from("pending_actions").update({ status: "executed", result }).eq("id", id);

    return NextResponse.json({ success: true, id, result });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// Réplica de la lógica fiscal de /api/odoo/invoice-from-billing (deriva datos del paciente server-side).
async function executeInvoice(patientId: string, billingRecordIds: string[]) {
  if (!patientId) throw new Error("Falta patient_id en la acción pendiente");
  if (!billingRecordIds || billingRecordIds.length === 0) throw new Error("No hay cobros seleccionados para facturar");

  const { data: patient, error: patientError } = await db
    .from("patients")
    .select(
      "id, first_name, last_name, historia_id, nif_cif, billing_name, billing_address, billing_address_2, billing_city, billing_postal_code, billing_province, billing_country, email, phone"
    )
    .eq("id", patientId)
    .single();

  if (patientError || !patient) throw new Error("Paciente no encontrado");
  if (!patient.nif_cif) throw new Error("Faltan datos fiscales (NIF/CIF) del paciente. Actualiza su ficha antes de facturar.");

  return createInvoiceFromBilling({
    patientId,
    patientDetails: {
      nifCif: patient.nif_cif,
      billingName: patient.billing_name,
      billingAddress: patient.billing_address,
      billingAddress2: patient.billing_address_2,
      billingCity: patient.billing_city,
      billingPostalCode: patient.billing_postal_code,
      billingProvince: patient.billing_province,
      billingCountry: patient.billing_country,
      email: patient.email,
      phone: patient.phone,
      firstName: patient.first_name,
      lastName: patient.last_name,
      historiaId: patient.historia_id,
    },
    billingRecordIds,
  });
}
