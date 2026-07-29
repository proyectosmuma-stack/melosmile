import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/server';
import { processBillingLine, calculateSessionTotals, RawLineInput } from '@/lib/billing/calculator';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Fetch Session with Clinic
    const { data: session, error: sessionErr } = await supabase
      .from('billing_sessions')
      .select(`
        *,
        clinic:clinics(id, name, color_hex, base_commission_pct, lab_discount_pct, tracks_payments, address, phone, email)
      `)
      .eq('id', id)
      .single();

    if (sessionErr || !session) {
      return NextResponse.json({ error: 'Sesión de cálculo no encontrada.' }, { status: 404 });
    }

    // 2. Fetch Session Lines
    const { data: rawLines, error: linesErr } = await supabase
      .from('billing_session_lines')
      .select('*')
      .eq('session_id', id)
      .order('sort_order', { ascending: true })
      .order('session_date', { ascending: true });

    if (linesErr) {
      return NextResponse.json({ error: linesErr.message }, { status: 500 });
    }

    // 3. Fetch Treatment catalog for live validation comparison
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

    // 4. Process lines & calculate totals live
    const defaultComm = session.commission_pct ?? session.clinic?.base_commission_pct ?? 60;
    const defaultLabDisc = session.lab_discount_pct ?? session.clinic?.lab_discount_pct ?? 50;

    const lines = (rawLines || []).map(l =>
      processBillingLine(
        l as RawLineInput,
        l.commission_pct ?? defaultComm,
        l.lab_discount_pct ?? defaultLabDisc,
        catalogMap
      )
    );

    const totals = calculateSessionTotals(lines);

    return NextResponse.json({
      session,
      lines,
      totals
    });
  } catch (err: any) {
    console.error('Unexpected error in GET /api/billing/sessions/[id]:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { commission_pct, lab_discount_pct, notes, status, lines: inputLines } = body;

    // Fetch existing session & clinic
    const { data: existingSession, error: fetchErr } = await supabase
      .from('billing_sessions')
      .select('*, clinic:clinics(id, name, tracks_payments, base_commission_pct, lab_discount_pct)')
      .eq('id', id)
      .single();

    if (fetchErr || !existingSession) {
      return NextResponse.json({ error: 'Sesión de cálculo no encontrada.' }, { status: 404 });
    }

    const finalCommPct = commission_pct ?? existingSession.commission_pct ?? 60;
    const finalLabDiscPct = lab_discount_pct ?? existingSession.lab_discount_pct ?? 50;

    // Fetch treatments for validation
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

    let processedLines = [];

    // If lines array is provided, replace or re-process all lines
    if (Array.isArray(inputLines)) {
      processedLines = inputLines.map((l: RawLineInput, idx: number) => {
        return processBillingLine(
          { ...l, sort_order: l.sort_order ?? idx },
          l.commission_pct ?? finalCommPct,
          l.lab_discount_pct ?? finalLabDiscPct,
          catalogMap
        );
      });

      // Delete existing lines and re-insert
      await supabase.from('billing_session_lines').delete().eq('session_id', id);

      const dbLinesPayload = processedLines.map(l => ({
        session_id: id,
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
        payment_status: existingSession.clinic?.tracks_payments ? (l.payment_status || 'pending') : 'not_tracked',
        payment_amount: l.payment_amount ?? 0,
        sort_order: l.sort_order ?? 0
      }));

      if (dbLinesPayload.length > 0) {
        await supabase.from('billing_session_lines').insert(dbLinesPayload);
      }
    } else {
      // Re-fetch existing lines to calculate totals
      const { data: existingLines } = await supabase
        .from('billing_session_lines')
        .select('*')
        .eq('session_id', id);

      processedLines = (existingLines || []).map(l =>
        processBillingLine(
          l as RawLineInput,
          finalCommPct,
          finalLabDiscPct,
          catalogMap
        )
      );
    }

    const totals = calculateSessionTotals(processedLines);

    // Update Session
    const updatePayload: any = {
      total_subtotal: totals.total_subtotal,
      total_commission: totals.total_commission,
      total_lab: totals.total_lab,
      total_neto: totals.total_neto
    };

    if (commission_pct !== undefined) updatePayload.commission_pct = commission_pct;
    if (lab_discount_pct !== undefined) updatePayload.lab_discount_pct = lab_discount_pct;
    if (notes !== undefined) updatePayload.notes = notes;
    if (status !== undefined) updatePayload.status = status;

    const { data: updatedSession, error: updateErr } = await supabase
      .from('billing_sessions')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      session: updatedSession,
      lines: processedLines,
      totals
    });
  } catch (err: any) {
    console.error('Unexpected error in PATCH /api/billing/sessions/[id]:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: session } = await supabase
      .from('billing_sessions')
      .select('status')
      .eq('id', id)
      .single();

    if (session && session.status === 'approved') {
      return NextResponse.json(
        { error: 'No se puede eliminar una sesión de contabilidad que ya ha sido Aprobada.' },
        { status: 400 }
      );
    }

    const { error: delErr } = await supabase
      .from('billing_sessions')
      .delete()
      .eq('id', id);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Sesión eliminada correctamente.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
