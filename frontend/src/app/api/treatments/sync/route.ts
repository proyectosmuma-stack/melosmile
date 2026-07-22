import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { searchProductByNameOrCode, createProductTemplate, updatePricelistItem } from "@/lib/odoo/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { treatmentId, payload, pricePayloads, isNew } = body;

    let odooProductTmplId = payload.odoo_product_tmpl_id;

    // 1. Map to Odoo (Find or Create)
    if (!odooProductTmplId) {
      const existingOdoo = await searchProductByNameOrCode(payload.service_name, payload.odoo_product_ref || payload.abbreviation);
      
      if (existingOdoo) {
        odooProductTmplId = existingOdoo.id;
      } else {
        // Create in Odoo
        odooProductTmplId = await createProductTemplate({
          name: payload.service_name,
          list_price: payload.default_price || 0,
          default_code: payload.odoo_product_ref || payload.abbreviation
        });
      }
      
      // Keep it in our payload so it gets saved to Supabase
      payload.odoo_product_tmpl_id = odooProductTmplId;
    }

    let finalTreatmentId = treatmentId;

    // 2. Save Treatment to Supabase
    if (isNew) {
      const { data, error } = await (supabase as any).from("treatments").insert(payload).select().single();
      if (error) throw new Error(`Supabase Error inserting treatment: ${error.message}`);
      finalTreatmentId = data.id;
    } else {
      const { error } = await (supabase as any).from("treatments").update(payload).eq("id", finalTreatmentId);
      if (error) throw new Error(`Supabase Error updating treatment: ${error.message}`);
    }

    // 3. Save Clinic Prices to Supabase & Sync to Odoo Pricelists
    // First delete old clinic prices in Supabase
    await (supabase as any).from("treatment_clinic_prices").delete().eq("treatment_id", finalTreatmentId);

    if (pricePayloads && pricePayloads.length > 0) {
      // Add the proper treatmentId to all payloads
      const finalPricePayloads = pricePayloads.map((p: any) => ({
        ...p,
        treatment_id: finalTreatmentId
      }));

      // Insert into Supabase
      const { error } = await (supabase as any).from("treatment_clinic_prices").insert(finalPricePayloads);
      if (error) throw new Error(`Supabase Error inserting prices: ${error.message}`);

      // Sync each clinic price to Odoo Pricelists
      // To do this, we need the odoo_pricelist_id for each clinic
      const clinicIds = pricePayloads.map((p: any) => p.clinic_id);
      const { data: clinics } = await (supabase as any).from("clinics")
        .select("id, odoo_pricelist_id")
        .in("id", clinicIds);

      for (const priceRow of pricePayloads) {
        const clinic = clinics?.find((c: any) => c.id === priceRow.clinic_id);
        if (clinic?.odoo_pricelist_id && odooProductTmplId) {
          try {
            await updatePricelistItem(clinic.odoo_pricelist_id, odooProductTmplId, priceRow.price);
          } catch (odooErr: any) {
            console.error(`Error updating Odoo pricelist for clinic ${clinic.id}:`, odooErr);
            // We log the error but don't fail the whole request to ensure Supabase saves
          }
        }
      }
    }

    return NextResponse.json({ success: true, treatmentId: finalTreatmentId, odooProductTmplId });
  } catch (error: any) {
    console.error("Error syncing treatment:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
