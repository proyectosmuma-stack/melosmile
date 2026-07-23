import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const patient_id = searchParams.get("patient_id");

  if (!patient_id) {
    return NextResponse.json({ error: "Missing query parameter 'patient_id'" }, { status: 400 });
  }

  try {
    const { data, error } = await (supabase as any)
      .from("billing_records")
      .select("id, appointment_reason, total_amount, custom_price, status, created_at")
      .eq("patient_id", patient_id)
      .neq("status", "Facturado Odoo")
      .is("odoo_invoice_id", null);

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
