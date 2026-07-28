import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/server';
import { generateBillingLinesFromAppointments } from '@/lib/billing/appointments-to-lines';
import { calculateSessionTotals } from '@/lib/billing/calculator';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get('clinic_id');
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');

    if (!clinicId || !yearParam || !monthParam) {
      return NextResponse.json({ error: 'Missing clinic_id, year, or month' }, { status: 400 });
    }

    const year = parseInt(yearParam, 10);
    const month = parseInt(monthParam, 10);

    // 1. Get Clinic info
    const { data: clinic, error: clinicErr } = await supabase
      .from('clinics')
      .select('id, name, base_commission_pct, lab_discount_pct')
      .eq('id', clinicId)
      .single();

    if (clinicErr || !clinic) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
    }

    const commissionPct = clinic.base_commission_pct ?? 60;
    const labDiscountPct = clinic.lab_discount_pct ?? 50;

    // 2. Fetch catalog for price mapping (with custom clinic prices override)
    const { data: treatments } = await supabase
      .from('treatments')
      .select('id, service_name, default_price, typical_lab_cost');

    const { data: clinicPrices } = await supabase
      .from('treatment_clinic_prices')
      .select('treatment_id, price')
      .eq('clinic_id', clinicId);

    const clinicPriceMap = new Map<string, number>();
    if (clinicPrices) {
      for (const cp of clinicPrices) {
        clinicPriceMap.set(cp.treatment_id, Number(cp.price || 0));
      }
    }

    const catalogMap = new Map<string, { price: number; id: string; lab_cost: number }>();
    if (treatments) {
      for (const t of treatments) {
        if (t.service_name) {
          const effectivePrice = clinicPriceMap.has(t.id)
            ? clinicPriceMap.get(t.id)!
            : Number(t.default_price || 0);

          catalogMap.set(t.service_name.trim().toLowerCase(), {
            id: t.id,
            price: effectivePrice,
            lab_cost: Number(t.typical_lab_cost || 0)
          });
        }
      }
    }

    // 3. Fetch Realizada appointments for this clinic and month
    // Determine month bounds
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 1).toISOString(); // first day of next month

    const { data: appointments, error: apptErr } = await supabase
      .from('appointments')
      .select(`
        id, appointment_date, status, reason, notes, treatment_id, patient_id,
        patient:patients(id, first_name, last_name),
        treatment:treatments(id, service_name, default_price, typical_lab_cost)
      `)
      .eq('clinic_id', clinicId)
      .eq('status', 'Realizada')
      .gte('appointment_date', startDate)
      .lt('appointment_date', endDate);

    if (apptErr) {
      throw apptErr;
    }

    // 4. Generate lines from appointments
    const newLines = generateBillingLinesFromAppointments(
      appointments || [], 
      commissionPct, 
      labDiscountPct, 
      catalogMap
    );

    // 5. Fetch existing session to see if we need to merge or create
    const { data: existingSession, error: existingErr } = await supabase
      .from('billing_sessions')
      .select('id, status, commission_pct, lab_discount_pct')
      .eq('clinic_id', clinicId)
      .eq('year', year)
      .eq('month', month)
      .maybeSingle();

    let sessionId = existingSession?.id;

    if (!sessionId) {
      // Create new session
      const totals = calculateSessionTotals(newLines);
      const { data: newSession, error: createErr } = await supabase
        .from('billing_sessions')
        .insert([{
          clinic_id: clinicId,
          clinic_name: clinic.name,
          month,
          year,
          status: 'draft',
          commission_pct: commissionPct,
          lab_discount_pct: labDiscountPct,
          total_subtotal: totals.total_subtotal,
          total_commission: totals.total_commission,
          total_lab: totals.total_lab,
          total_neto: totals.total_neto,
          source_type: 'manual',
          created_by: 'Auto-Generator'
        }])
        .select()
        .single();

      if (createErr) throw createErr;
      sessionId = newSession.id;
    }

    // 6. Fetch existing lines to preserve manual edits
    const { data: existingLines } = await supabase
      .from('billing_session_lines')
      .select('*')
      .eq('session_id', sessionId);

    const existingLinesMap = new Map();
    if (existingLines) {
      existingLines.forEach((l: any) => {
        if (l.appointment_id) {
          existingLinesMap.set(`${l.appointment_id}_${l.procedure_index}`, l);
        } else {
          // Keep manual lines completely
          existingLinesMap.set(`manual_${l.id}`, l);
        }
      });
    }

    // 7. Upsert lines
    const finalLinesToInsert = [];
    
    // Add all manually created lines back
    for (const [key, line] of Array.from(existingLinesMap.entries())) {
      if (key.startsWith('manual_')) {
        finalLinesToInsert.push(line);
      }
    }

    // Add generated lines, preserving overrides if they exist
    newLines.forEach(newLine => {
      const key = `${newLine.appointment_id}_${newLine.procedure_index}`;
      const existing = existingLinesMap.get(key);

      if (existing) {
        // We found an existing line for this appointment/procedure. 
        // We should preserve it because the user might have edited it directly in billing,
        // UNLESS we want to overwrite it. As per option A, we preserve existing edits in billing.
        // Actually, to make it completely robust, we should probably re-calculate based on existing line's unit_price/lab
        // But if we just keep the existing line entirely, it works best for Option A.
        finalLinesToInsert.push(existing);
      } else {
        // It's a new appointment line
        const dbLine = {
          session_id: sessionId,
          session_date: newLine.session_date,
          patient_name: newLine.patient_name,
          patient_id: newLine.patient_id,
          treatment_name: newLine.treatment_name,
          treatment_id: newLine.treatment_id,
          observation: newLine.observation,
          quantity: newLine.quantity,
          unit_price: newLine.unit_price,
          alt_price: newLine.alt_price,
          effective_price: newLine.effective_price,
          discount: newLine.discount,
          subtotal: newLine.subtotal,
          commission_pct: newLine.commission_pct,
          commission_amount: newLine.commission_amount,
          lab_name: newLine.lab_name,
          lab_quantity: newLine.lab_quantity,
          lab_unit_cost: newLine.lab_unit_cost,
          lab_subtotal: newLine.lab_subtotal,
          lab_discount_pct: newLine.lab_discount_pct,
          lab_total_discounted: newLine.lab_total_discounted,
          net_amount: newLine.net_amount,
          pct_dr_main: newLine.pct_dr_main,
          amount_dr_main: newLine.amount_dr_main,
          pct_dr_secondary: newLine.pct_dr_secondary,
          amount_dr_secondary: newLine.amount_dr_secondary,
          needs_review: newLine.needs_review,
          is_negative: newLine.is_negative,
          no_price: newLine.no_price,
          zero_quantity: newLine.zero_quantity,
          validation_flags: newLine.validation_flags,
          catalog_price: newLine.catalog_price,
          price_deviation_pct: newLine.price_deviation_pct,
          payment_status: newLine.payment_status,
          payment_amount: newLine.payment_amount,
          appointment_id: newLine.appointment_id,
          procedure_index: newLine.procedure_index,
          source_type: newLine.source_type,
          sort_order: newLine.sort_order
        };
        finalLinesToInsert.push(dbLine);
      }
    });

    // 8. Delete old lines and insert new ones
    await supabase.from('billing_session_lines').delete().eq('session_id', sessionId);
    if (finalLinesToInsert.length > 0) {
      await supabase.from('billing_session_lines').insert(finalLinesToInsert);
    }

    // 9. Recalculate and update session totals
    const finalTotals = calculateSessionTotals(finalLinesToInsert as any);
    await supabase
      .from('billing_sessions')
      .update({
        total_subtotal: finalTotals.total_subtotal,
        total_commission: finalTotals.total_commission,
        total_lab: finalTotals.total_lab,
        total_neto: finalTotals.total_neto,
      })
      .eq('id', sessionId);

    // 10. Mark appointments as billed
    const appointmentIds = newLines.map(l => l.appointment_id).filter((id): id is string => Boolean(id));
    if (appointmentIds.length > 0) {
      await (supabase.from('appointments') as any)
        .update({ billed_at: new Date().toISOString() })
        .in('id', appointmentIds)
        .is('billed_at', null); // Only update those not already billed
    }

    return NextResponse.json({ success: true, session_id: sessionId });
  } catch (err: any) {
    console.error('Error generating billing session from appointments:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
