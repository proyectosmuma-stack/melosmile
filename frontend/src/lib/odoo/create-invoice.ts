import {
  upsertOdooPartner,
  createOdooInvoice,
  confirmOdooInvoice,
  getOdooInvoice,
  registerOdooPayment,
} from "./client";
import { supabase } from "@/lib/supabase/client";

export type PatientDetails = {
  nifCif?: string | null;
  billingName?: string | null;
  billingAddress?: string | null;
  billingAddress2?: string | null;
  billingCity?: string | null;
  billingPostalCode?: string | null;
  billingProvince?: string | null;
  billingCountry?: string | null;
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  historiaId?: string | null;
};

export type CreateInvoiceParams = {
  patientId: string;
  patientDetails: PatientDetails;
  billingRecordIds?: string[];
  items?: Array<{
    id?: string;
    name?: string;
    appointment_reason?: string;
    price?: number;
    custom_price?: number;
  }>;
  billingRecordId?: string;
  treatmentName?: string;
  price?: number;
};

export type CreateInvoiceResult = {
  success: true;
  invoiceId: number;
  invoiceNumber: string;
  partnerId: number;
  updatedCount: number;
};

/**
 * Emite una factura en Odoo para un paciente a partir de cobros (billing_records)
 * o de items/treatmentName. Extraido de /api/odoo/invoice sin cambios de comportamiento.
 */
export async function createInvoiceFromBilling(
  params: CreateInvoiceParams
): Promise<CreateInvoiceResult> {
  const { patientId, patientDetails, billingRecordIds, items, billingRecordId, treatmentName, price } = params;

  if (!patientId || !patientDetails) {
    throw new Error("patientId y patientDetails son requeridos");
  }
  if (!patientDetails.nifCif) {
    throw new Error(
      "Faltan datos fiscales obligatorios (NIF/CIF). Por favor, actualiza la ficha del paciente o usa los datos de un representante para poder facturar en Odoo."
    );
  }

  // 1. Upsert Partner in Odoo (target already-mapped partner when present)
  let mappedPartnerId: number | null = null;
  const { data: patientRow } = await (supabase as any)
    .from("patients")
    .select("odoo_partner_id")
    .eq("id", patientId)
    .maybeSingle();
  if (patientRow?.odoo_partner_id) mappedPartnerId = patientRow.odoo_partner_id;

  const partnerId: number = await upsertOdooPartner({
    full_name: (patientDetails.firstName || "") + " " + (patientDetails.lastName || ""),
    nif_cif: patientDetails.nifCif,
    billing_name: patientDetails.billingName ?? undefined,
    billing_address: patientDetails.billingAddress ?? undefined,
    billing_address_2: patientDetails.billingAddress2 ?? undefined,
    billing_city: patientDetails.billingCity ?? undefined,
    billing_postal_code: patientDetails.billingPostalCode ?? undefined,
    billing_province: patientDetails.billingProvince ?? undefined,
    billing_country: patientDetails.billingCountry ?? undefined,
    email: patientDetails.email ?? undefined,
    phone: patientDetails.phone ?? undefined,
    odoo_partner_id: mappedPartnerId || undefined,
    patient_id: patientId,
    force_create: true,
  });

  // 2. Prepare invoice lines & references
  let invoiceLines: { name: string; quantity: number; price_unit: number }[] = [];
  let recordIdsToUpdate: string[] = [];
  let refText = `Melosmile: ${patientDetails.historiaId || "PAC"}`;

  if (items && Array.isArray(items) && items.length > 0) {
    invoiceLines = items.map((it) => ({
      name: it.name || it.appointment_reason || "Servicio Odontológico",
      quantity: 1,
      price_unit: parseFloat(String(it.price ?? it.custom_price ?? 0)),
    }));
    recordIdsToUpdate = items.map((it) => it.id).filter(Boolean) as string[];
    refText += ` - ${items.length} cobros agrupados`;
  } else if (billingRecordIds && Array.isArray(billingRecordIds) && billingRecordIds.length > 0) {
    recordIdsToUpdate = billingRecordIds;
    const { data: records } = await (supabase as any)
      .from("billing_records")
      .select("id, custom_price, calculated_total, appointments(reason)")
      .in("id", billingRecordIds);

    if (records && records.length > 0) {
      invoiceLines = records.map((r: any) => ({
        name: r.appointments?.reason || "Servicio Odontológico",
        quantity: 1,
        price_unit: parseFloat(String(r.custom_price || r.calculated_total || 0)),
      }));
    }
    refText += ` - ${billingRecordIds.length} cobros`;
  } else {
    const singlePrice = parseFloat(String(price || 0));
    const singleName = treatmentName || "Tratamiento Dental";
    invoiceLines = [{ name: singleName, quantity: 1, price_unit: singlePrice }];
    if (billingRecordId) recordIdsToUpdate = [billingRecordId];
    refText += ` - ${singleName}`;
  }

  if (invoiceLines.length === 0) {
    throw new Error("No se encontraron cobros para facturar.");
  }

  // 3. Create draft invoice in Odoo
  const invoiceId: number = await createOdooInvoice({
    partner_id: partnerId,
    ref: refText,
    invoice_lines: invoiceLines,
  });

  // 4. Confirm the invoice to generate a real invoice number
  await confirmOdooInvoice(invoiceId);

  // 5. Fetch the confirmed invoice details
  const odooInv = await getOdooInvoice(invoiceId);
  if (!odooInv || odooInv.state !== "posted") {
    throw new Error("Odoo no pudo confirmar la factura. Verifica que los datos fiscales en Odoo estén correctos.");
  }
  const odooInvoiceNumber: string = odooInv.name;

  // 6. Register payment if the billing records are already paid
  if (recordIdsToUpdate.length > 0) {
    const { data: bRecs } = await (supabase as any)
      .from("billing_records")
      .select("status")
      .in("id", recordIdsToUpdate);
    const hasPaid = bRecs && bRecs.some((b: any) => b.status === "Pagado" || b.status === "Aconto");
    if (hasPaid) {
      await registerOdooPayment(invoiceId);
    }
  }

  // 7. Update Supabase billing records & patient with Odoo references
  if (recordIdsToUpdate.length > 0) {
    const { error: billingErr } = await (supabase as any)
      .from("billing_records")
      .update({
        odoo_invoice_id: invoiceId,
        odoo_invoice_number: odooInvoiceNumber,
        status: "Facturado Odoo",
      })
      .in("id", recordIdsToUpdate);
    if (billingErr) console.error("Error updating billing records:", billingErr);
  }

  const { error: patientErr } = await (supabase as any)
    .from("patients")
    .update({ odoo_partner_id: partnerId })
    .eq("id", patientId);
  if (patientErr) console.error("Error updating patient partner_id:", patientErr);

  return {
    success: true,
    invoiceId,
    invoiceNumber: odooInvoiceNumber,
    partnerId,
    updatedCount: recordIdsToUpdate.length,
  };
}
