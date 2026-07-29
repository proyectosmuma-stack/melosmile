import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/server';
import { processBillingLine, calculateSessionTotals, RawLineInput } from '@/lib/billing/calculator';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get('clinic_id');
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');
    const status = searchParams.get('status');

    let query = supabase
      .from('billing_sessions')
      .select(`
        *,
        clinic:clinics(id, name, color_hex, base_commission_pct, lab_discount_pct, tracks_payments),
        lines:billing_session_lines(count)
      `)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }
    if (yearParam) {
      query = query.eq('year', parseInt(yearParam, 10));
    }
    if (monthParam) {
      query = query.eq('month', parseInt(monthParam, 10));
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: sessions, error } = await query;

    if (error) {
      console.error('Error fetching billing sessions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sessions });
  } catch (err: any) {
    console.error('Unexpected error in GET /api/billing/sessions:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      clinic_id,
      month,
      year,
      model_type = 'albacete',
      commission_pct: reqCommissionPct,
      lab_discount_pct: reqLabDiscountPct,
      source_type = 'manual',
      notes,
      raw_input,
      created_by = 'Sistema',
      lines = []
    } = body;

    if (!clinic_id || !month || !year) {
      return NextResponse.json(
        { error: 'Faltan parámetros obligatorios: clinic_id, month, year.' },
        { status: 400 }
      );
    }

    // 1. Get Clinic info to retrieve defaults
    const { data: clinic, error: clinicErr } = await supabase
      .from('clinics')
      .select('id, name, base_commission_pct, lab_discount_pct, tracks_payments')
      .eq('id', clinic_id)
      .single();

    if (clinicErr || !clinic) {
      return NextResponse.json(
        { error: `Clínica no encontrada con ID ${clinic_id}.` },
        { status: 404 }
      );
    }

    const finalCommissionPct = reqCommissionPct ?? clinic.base_commission_pct ?? 60;
    const finalLabDiscountPct = reqLabDiscountPct ?? clinic.lab_discount_pct ?? 50;

    // 2. Fetch Treatments catalog for price validation
    const { data: treatments } = await supabase
      .from('treatments')
      .select('id, service_name, default_price, typical_lab_cost');

    const catalogMap = new Map<string, { price: number; id: string; lab_cost: number }>();
    if (treatments) {
      for (const t of treatments) {
        if (t.service_name) {
          catalogMap.set(t.service_name.trim().toLowerCase(), {
            id: t.id,
            price: Number(t.default_price || 0),
            lab_cost: Number(t.typical_lab_cost || 0)
          });
        }
      }
    }

    // 3. Process raw lines if provided
    const processedLines = (lines as RawLineInput[]).map((l, idx) => {
      return processBillingLine(
        { ...l, sort_order: l.sort_order ?? idx },
        finalCommissionPct,
        finalLabDiscountPct,
        catalogMap
      );
    });

    const totals = calculateSessionTotals(processedLines);

    // 4. Upsert session for (clinic_id, year, month)
    const sessionPayload = {
      clinic_id,
      clinic_name: clinic.name,
      month,
      year,
      model_type,
      commission_pct: finalCommissionPct,
      lab_discount_pct: finalLabDiscountPct,
      status: 'draft',
      created_by,
      source_type,
      notes,
      raw_input,
      total_subtotal: totals.total_subtotal,
      total_commission: totals.total_commission,
      total_lab: totals.total_lab,
      total_neto: totals.total_neto
    };

    const { data: session, error: sessionErr } = await supabase
      .from('billing_sessions')
      .upsert(sessionPayload, { onConflict: 'clinic_id,year,month' })
      .select()
      .single();

    if (sessionErr || !session) {
      console.error('Error upserting billing session:', sessionErr);
      return NextResponse.json({ error: sessionErr?.message || 'Error al guardar la sesión.' }, { status: 500 });
    }

    // 5. Replace session lines if lines were provided
    if (processedLines.length > 0) {
      // Delete existing lines for this session
      await supabase.from('billing_session_lines').delete().eq('session_id', session.id);

      const dbLinesPayload = processedLines.map(l => ({
        session_id: session.id,
        session_date: l.session_date || null,
        patient_name: l.patient_name,
        patient_id: l.patient_id || null,
        treatment_name: l.treatment_name,
        treatment_id: l.treatment_id || null,
        observation: l.observation || null,
        quantity: l.quantity ?? 1,
        unit_price: l.unit_price ?? 0,
        alt_price: l.alt_price ?? 0,
        effective_price: l.effective_price,
        discount: l.discount ?? 0,
        subtotal: l.subtotal,
        commission_pct: l.commission_pct,
        commission_amount: l.commission_amount,
        lab_name: l.lab_name || null,
        lab_quantity: l.lab_quantity ?? 0,
        lab_unit_cost: l.lab_unit_cost ?? 0,
        lab_subtotal: l.lab_subtotal,
        lab_discount_pct: l.lab_discount_pct,
        lab_total_discounted: l.lab_total_discounted,
        net_amount: l.net_amount,
        pct_dr_main: l.pct_dr_main,
        amount_dr_main: l.amount_dr_main,
        pct_dr_secondary: l.pct_dr_secondary,
        amount_dr_secondary: l.amount_dr_secondary,
        needs_review: l.needs_review,
        is_negative: l.is_negative,
        no_price: l.no_price,
        zero_quantity: l.zero_quantity,
        validation_flags: l.validation_flags as any,
        catalog_price: l.catalog_price,
        price_deviation_pct: l.price_deviation_pct,
        payment_status: clinic.tracks_payments ? (l.payment_status || 'pending') : 'not_tracked',
        payment_amount: l.payment_amount ?? 0,
        sort_order: l.sort_order ?? 0
      }));

      const { error: linesErr } = await supabase.from('billing_session_lines').insert(dbLinesPayload);
      if (linesErr) {
        console.error('Error inserting lines:', linesErr);
      }
    }

    return NextResponse.json({
      session,
      totals,
      linesCount: processedLines.length
    });
  } catch (err: any) {
    console.error('Unexpected error in POST /api/billing/sessions:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
