import { createInvoiceFromBilling } from "@/lib/odoo/create-invoice";
import { supabase } from "@/lib/supabase/client";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { patientId, billingRecordIds } = body;

    if (!patientId) {
      return NextResponse.json({ success: false, error: "patientId es requerido" }, { status: 400 });
    }

    if (!billingRecordIds || billingRecordIds.length === 0) {
      return NextResponse.json({ success: false, error: "billingRecordIds es requerido" }, { status: 400 });
    }

    const { data: patient, error: patientError } = await (supabase as any)
      .from("patients")
      .select(
        `
          id,
          first_name,
          last_name,
          historia_id,
          nif_cif,
          billing_name,
          billing_address,
          billing_address_2,
          billing_city,
          billing_postal_code,
          billing_province,
          billing_country,
          email,
          phone
        `
      )
      .eq("id", patientId)
      .single();

    if (patientError) {
      if (patientError.code === "PGRST116") { // No rows found
        return NextResponse.json({ success: false, error: "Paciente no encontrado" }, { status: 404 });
      }
      throw new Error(`Error al buscar paciente: ${patientError.message}`);
    }

    if (!patient || !patient.nif_cif) {
      return NextResponse.json(
        { success: false, error: "Faltan datos fiscales (NIF/CIF) del paciente. Actualiza su ficha antes de facturar." },
        { status: 400 }
      );
    }

    const patientDetails = {
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
    };

    const result = await createInvoiceFromBilling({
      patientId,
      patientDetails,
      billingRecordIds,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("Error creating Odoo invoice from billing records:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}