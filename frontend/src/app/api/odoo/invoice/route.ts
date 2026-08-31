import { NextResponse } from "next/server";
import { upsertOdooPartner, createOdooInvoice, confirmOdooInvoice, getOdooInvoice, registerOdooPayment } from "@/lib/odoo/client";
import { supabase } from "@/lib/supabase/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      patientId,
      billingRecordId,
      billingRecordIds,
      items,
      patientDetails,
      treatmentName,
      price,
    } = body;

    if (!patientId || !patientDetails) {
      return NextResponse.json(
        { success: false, error: "patientId y patientDetails son requeridos" },
        { status: 400 }
      );
    }

    if (!patientDetails.nifCif || !patientDetails.billingAddress) {
      return NextResponse.json(
        { success: false, error: "Faltan datos fiscales obligatorios (NIF/CIF o Dirección). Por favor, actualiza la ficha del paciente para poder facturar en Odoo." },
        { status: 400 }
      );
    }

    // 1. Upsert Partner in Odoo
    const partnerId = await upsertOdooPartner({
      full_name: (patientDetails.firstName || "") + " " + (patientDetails.lastName || ""),
      nif_cif: patientDetails.nifCif,
      billing_name: patientDetails.billingName,
      billing_address: patientDetails.billingAddress,
      billing_city: patientDetails.billingCity,
      billing_postal_code: patientDetails.billingPostalCode,
      email: patientDetails.email,
      phone: patientDetails.phone,
    });

    // 2. Prepare Invoice Lines & References
    let invoiceLines: { name: string; quantity: number; price_unit: number }[] = [];
    let recordIdsToUpdate: string[] = [];
    let refText = `Melosmile: ${patientDetails.historiaId || "PAC"}`;

    if (items && Array.isArray(items) && items.length > 0) {
      invoiceLines = items.map((it: any) => ({
        name: it.name || it.appointment_reason || "Servicio Odontológico",
        quantity: 1,
        price_unit: parseFloat(it.price || it.custom_price || 0),
      }));
      recordIdsToUpdate = items.map((it: any) => it.id).filter(Boolean);
      refText += ` - ${items.length} cobros agrupados`;
    } else if (billingRecordIds && Array.isArray(billingRecordIds) && billingRecordIds.length > 0) {
      recordIdsToUpdate = billingRecordIds;
      // Fetch details from DB
      // El motivo del tratamiento llega por join anidado (billing_records no tiene
      // appointment_reason ni total_amount; el importe real es calculated_total).
      const { data: records } = await (supabase as any)
        .from("billing_records")
        .select("id, custom_price, calculated_total, appointments(reason)")
        .in("id", billingRecordIds);

      if (records && records.length > 0) {
        invoiceLines = records.map((r: any) => ({
          name: r.appointments?.reason || "Servicio Odontológico",
          quantity: 1,
          price_unit: parseFloat(r.custom_price || r.calculated_total || 0),
        }));
      }
      refText += ` - ${billingRecordIds.length} cobros`;
    } else {
      // Single item fallback
      const singlePrice = parseFloat(price || 0);
      const singleName = treatmentName || "Tratamiento Dental";
      invoiceLines = [{ name: singleName, quantity: 1, price_unit: singlePrice }];
      if (billingRecordId) recordIdsToUpdate = [billingRecordId];
      refText += ` - ${singleName}`;
    }

    // 3. Create Draft Invoice in Odoo
    const invoiceId = await createOdooInvoice({
      partner_id: partnerId,
      ref: refText,
      invoice_lines: invoiceLines,
    });

    // 4. Confirm the invoice to generate a real invoice number
    await confirmOdooInvoice(invoiceId);
    
    // 5. Fetch the confirmed invoice details
    const odooInv = await getOdooInvoice(invoiceId);
    
    if (!odooInv || odooInv.state !== 'posted') {
      throw new Error("Odoo no pudo confirmar la factura. Verifica que los datos fiscales en Odoo estén correctos.");
    }
    const odooInvoiceNumber = odooInv.name;

    // 6. Check if billing records are "Pagado" or "Aconto" to register payment
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

    // 7. Update Supabase billing record(s) & patient with Odoo references
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
      .update({
        odoo_partner_id: partnerId,
      })
      .eq("id", patientId);

    if (patientErr) console.error("Error updating patient partner_id:", patientErr);

    return NextResponse.json({
      success: true,
      invoiceId,
      invoiceNumber: odooInvoiceNumber,
      partnerId,
      updatedCount: recordIdsToUpdate.length,
    });
  } catch (error: any) {
    console.error("Error creating Odoo invoice:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al conectar con Odoo" },
      { status: 500 }
    );
  }
}
