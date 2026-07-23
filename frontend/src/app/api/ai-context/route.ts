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
 * - Generate billing & payment status reports (Facturados vs Por Facturar)
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
      { data: billingRecords },
    ] = await Promise.all([
      (supabase as any).from("clinics").select("id, name, address, phone, email, base_commission_pct, color_hex, odoo_pricelist_id"),
      supabase.from("professionals").select("id, first_name, last_name, specialty, base_commission_percentage, clinic_id"),
      (supabase as any).from("treatment_families").select("id, name, description, color_hex, sort_order").order("sort_order"),
      (supabase as any).from("treatments").select("id, service_name, abbreviation, service_type, default_price, lab_cost, typical_lab_cost, family_id, is_active").eq("is_active", true),
      (supabase as any).from("clinic_commission_rules").select("id, clinic_id, family_id, commission_pct, lab_discount_pct"),
      (supabase as any).from("clinic_treatments").select("clinic_id, treatment_id, price"),
      (supabase as any).from("billing_records").select("id, patient_id, appointment_reason, total_amount, custom_price, status, odoo_invoice_id, odoo_invoice_number, payment_method, created_at").order("created_at", { ascending: false }).limit(100),
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

    // Categorize billing records into Invoiced (Facturado Odoo) vs Pending Invoicing (Por Facturar)
    const billingInvoiced: any[] = [];
    const billingPendingInvoice: any[] = [];
    let totalInvoicedEur = 0;
    let totalPendingInvoiceEur = 0;

    (billingRecords || []).forEach((rec: any) => {
      const isFacturado = !!rec.odoo_invoice_id || rec.status === "Facturado Odoo" || !!rec.odoo_invoice_number;
      const amt = Number(rec.custom_price || rec.total_amount || 0);

      const recordItem = {
        id: rec.id,
        patient_id: rec.patient_id,
        concept: rec.appointment_reason || "Servicio Dental",
        amount: amt,
        payment_method: rec.payment_method || "No especificado",
        status: rec.status,
        odoo_invoice_number: rec.odoo_invoice_number || (rec.odoo_invoice_id ? `INV/#${rec.odoo_invoice_id}` : null),
        date: rec.created_at,
      };

      if (isFacturado) {
        billingInvoiced.push(recordItem);
        totalInvoicedEur += amt;
      } else {
        billingPendingInvoice.push(recordItem);
        totalPendingInvoiceEur += amt;
      }
    });

    const context = {
      generated_at: new Date().toISOString(),
      summary: {
        clinics_count: (clinics || []).length,
        professionals_count: (professionals || []).length,
        treatment_families_count: (families || []).length,
        treatments_count: (treatments || []).length,
        total_billing_records_recent: (billingRecords || []).length,
        invoiced_records_count: billingInvoiced.length,
        pending_invoice_records_count: billingPendingInvoice.length,
        total_invoiced_eur: totalInvoicedEur,
        total_pending_invoice_eur: totalPendingInvoiceEur,
      },
      billing_summary: {
        facturados_odoo: billingInvoiced,
        por_facturar: billingPendingInvoice,
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
        invoicing_status: "Check billing_summary.facturados_odoo for already invoiced records and billing_summary.por_facturar for items awaiting Odoo invoice generation.",
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
