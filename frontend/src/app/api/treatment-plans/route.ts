export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://amhfdzfcmpastmlsosou.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaGZkemZjbXBhc3RtbHNvc291Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDczNTM3NCwiZXhwIjoyMTAwMzExMzc0fQ.yPLQaV1xbfnuJJcNktxqbneP9Yb5UGlWfXA1tKYx6ZM";

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patient_id");
    const status = searchParams.get("status");

    let query = supabaseAdmin.from("treatment_plans").select("*, patients(id, first_name, last_name, historia_id)");

    if (patientId) {
      query = query.eq("patient_id", patientId);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, patient_id, treatment_type, total_cost, initial_payment, final_payment, monthly_fee, total_installments, paid_installments_count, already_paid_amount, status } = body;

    if (!patient_id) {
      return NextResponse.json({ error: "patient_id is required" }, { status: 400 });
    }

    const payload = {
      patient_id,
      treatment_type: treatment_type || "Ortodoncia",
      total_cost: Number(total_cost || 0),
      initial_payment: Number(initial_payment || 0),
      final_payment: Number(final_payment || 0),
      monthly_fee: Number(monthly_fee || 0),
      total_installments: Number(total_installments || 0),
      paid_installments_count: Number(paid_installments_count || 0),
      already_paid_amount: Number(already_paid_amount || 0),
      status: status || "activo",
      updated_at: new Date().toISOString(),
    };

    let result;
    if (id) {
      result = await supabaseAdmin
        .from("treatment_plans")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
    } else {
      result = await supabaseAdmin
        .from("treatment_plans")
        .insert(payload)
        .select()
        .single();
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required for deletion" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("treatment_plans")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Plan eliminado correctamente" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
