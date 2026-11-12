import { createInvoiceFromBilling } from "@/lib/odoo/create-invoice";
import { NextResponse } from "next/server";

export const maxDuration = 60; // This can be increased if needed

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { patientId, patientDetails, billingRecordIds, items, billingRecordId, treatmentName, price } = body;

    if (!patientId) {
      return NextResponse.json({ success: false, error: "patientId es requerido" }, { status: 400 });
    }

    if (!patientDetails || !patientDetails.nifCif) {
      return NextResponse.json({ success: false, error: "patientDetails.nifCif es requerido" }, { status: 400 });
    }

    const result = await createInvoiceFromBilling({
      patientId,
      patientDetails,
      billingRecordIds,
      items,
      billingRecordId,
      treatmentName,
      price,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("Error creating Odoo invoice:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}