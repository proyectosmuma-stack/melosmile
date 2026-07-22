import { NextResponse } from "next/server";
import { upsertOdooPartner, createOdooInvoice, confirmOdooInvoice } from "@/lib/odoo/client";
import { supabase } from "@/lib/supabase/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      patientId,
      billingRecordId,
      patientDetails,
      treatmentName,
      price,
    } = body;

    // 1. Upsert Partner in Odoo
    const partnerId = await upsertOdooPartner({
      full_name: patientDetails.firstName + " " + patientDetails.lastName,
      nif_cif: patientDetails.nifCif,
      billing_name: patientDetails.billingName,
      billing_address: patientDetails.billingAddress,
      billing_city: patientDetails.billingCity,
      billing_postal_code: patientDetails.billingPostalCode,
      email: patientDetails.email,
      phone: patientDetails.phone,
    });

    // 2. Create Draft Invoice
    const invoiceId = await createOdooInvoice({
      partner_id: partnerId,
      ref: `Melosmile: ${patientDetails.historiaId} - ${treatmentName}`,
      invoice_lines: [
        {
          name: treatmentName,
          quantity: 1,
          price_unit: price,
        },
      ],
    });

    // 3. Confirm Invoice (optional, if you want it posted immediately)
    // await confirmOdooInvoice(invoiceId);

    // 4. Update Supabase billing record & patient with Odoo references
    const { error: billingErr } = await (supabase as any).from("billing_records").update({
      odoo_invoice_id: invoiceId,
      status: "Facturado Odoo",
    }).eq("id", billingRecordId);
    
    if (billingErr) console.error("Error updating billing record:", billingErr);

    const { error: patientErr } = await (supabase as any).from("patients").update({
      odoo_partner_id: partnerId,
    }).eq("id", patientId);

    if (patientErr) console.error("Error updating patient partner_id:", patientErr);

    return NextResponse.json({ success: true, invoiceId, partnerId });
  } catch (error: any) {
    console.error("Error creating Odoo invoice:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
