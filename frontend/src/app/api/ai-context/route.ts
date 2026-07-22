import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * GET /api/ai-context
 * Returns the full context the AI agent needs to:
 * - Calculate profitability and commissions
 * - Suggest treatment prices per clinic
 * - Generate billing reports
 */
export async function GET() {
  try {
    const [
      { data: clinics },
      { data: professionals },
      { data: families },
      { data: treatments },
      { data: commissionRules },
      { data: clinicTreatments },
    ] = await Promise.all([
      (supabase as any).from("clinics").select("id, name, address, phone, email, base_commission_pct, color_hex"),
      supabase.from("professionals").select("id, first_name, last_name, specialty, base_commission_percentage, clinic_id"),
      (supabase as any).from("treatment_families").select("id, name, description, color_hex, sort_order").order("sort_order"),
      (supabase as any).from("treatments").select("id, service_name, abbreviation, service_type, default_price, lab_cost, typical_lab_cost, family_id, is_active").eq("is_active", true),
      (supabase as any).from("clinic_commission_rules").select("id, clinic_id, family_id, commission_pct, lab_discount_pct"),
      (supabase as any).from("clinic_treatments").select("clinic_id, treatment_id, price"),
    ]);

    // Build enriched treatments with family names
    const familyMap = new Map((families || []).map((f: any) => [f.id, f as { id: string; name: string; color_hex: string; }]));
    const enrichedTreatments = (treatments || []).map((t: any) => ({
      ...t,
      family_name: t.family_id ? (familyMap.get(t.family_id) as any)?.name ?? null : null,
    }));

    // Build commission rules map: clinicId -> familyId -> rule
    const rulesMap: Record<string, Record<string, any>> = {};
    (commissionRules || []).forEach((r: any) => {
      if (!rulesMap[r.clinic_id]) rulesMap[r.clinic_id] = {};
      rulesMap[r.clinic_id][r.family_id] = r;
    });

    // Build clinic-specific prices map: clinicId -> treatmentId -> price
    const clinicPricesMap: Record<string, Record<string, number>> = {};
    (clinicTreatments || []).forEach((ct: any) => {
      if (!clinicPricesMap[ct.clinic_id]) clinicPricesMap[ct.clinic_id] = {};
      clinicPricesMap[ct.clinic_id][ct.treatment_id] = ct.price;
    });

    // Enrich clinics with their commission rules and treatment prices
    const enrichedClinics = (clinics || []).map((clinic: any) => ({
      ...clinic,
      commission_rules: Object.values(rulesMap[clinic.id] || {}).map((rule: any) => ({
        ...rule,
        family_name: (familyMap.get(rule.family_id) as any)?.name ?? null,
      })),
      treatment_prices: Object.entries(clinicPricesMap[clinic.id] || {}).map(([treatmentId, price]) => ({
        treatment_id: treatmentId,
        price,
      })),
    }));

    const context = {
      generated_at: new Date().toISOString(),
      summary: {
        clinics_count: (clinics || []).length,
        professionals_count: (professionals || []).length,
        treatment_families_count: (families || []).length,
        treatments_count: (treatments || []).length,
      },
      clinics: enrichedClinics,
      professionals: (professionals || []).map((p: any) => ({
        ...p,
        full_name: `${p.first_name} ${p.last_name}`,
      })),
      treatment_families: families || [],
      treatments: enrichedTreatments,
      usage_instructions: {
        calculate_net: "net = (price * commission_pct / 100) - (actual_lab_cost * lab_discount_pct / 100)",
        profitability: "loss: net < 0 | warning: net/price < 0.15 | ok: otherwise",
        clinic_price: "Use clinic_treatments[clinic_id][treatment_id] if exists, otherwise treatment.default_price",
        commission_priority: "Use clinic_commission_rules if exists for the family, otherwise use clinic.base_commission_pct",
      },
    };

    return NextResponse.json(context, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to load AI context", details: error.message },
      { status: 500 }
    );
  }
}
