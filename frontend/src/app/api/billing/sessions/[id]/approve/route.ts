import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { processBillingLine, calculateSessionTotals, RawLineInput } from '@/lib/billing/calculator';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { approved_by = 'Dra. Osly Melo' } = body;

    // 1. Fetch session & lines
    const { data: session, error: sessionErr } = await supabase
      .from('billing_sessions')
      .select('*, clinic:clinics(id, name, base_commission_pct, lab_discount_pct)')
      .eq('id', id)
      .single();

    if (sessionErr || !session) {
      return NextResponse.json({ error: 'Sesión de cálculo no encontrada.' }, { status: 404 });
    }

    const { data: rawLines } = await supabase
      .from('billing_session_lines')
      .select('*')
      .eq('session_id', id);

    // 2. Fetch catalog for live validation check
    const { data: treatments } = await supabase.from('treatments').select('id, service_name, default_price, typical_lab_cost');
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

    const defaultComm = session.commission_pct ?? session.clinic?.base_commission_pct ?? 60;
    const defaultLabDisc = session.lab_discount_pct ?? session.clinic?.lab_discount_pct ?? 50;

    const processedLines = (rawLines || []).map(l =>
      processBillingLine(l as RawLineInput, l.commission_pct ?? defaultComm, l.lab_discount_pct ?? defaultLabDisc, catalogMap)
    );

    const totals = calculateSessionTotals(processedLines);

    // 3. Blocking check for ERROR level issues
    if (totals.has_blocking_errors) {
      const errorLines = processedLines.filter(l => l.needs_review || l.validation_flags.some(f => f.level === 'ERROR'));
      return NextResponse.json(
        {
          error: 'No se puede aprobar la contabilidad porque existen errores críticos pendientes de revisión (pacientes sin nombre o tratamientos sin importe).',
          error_count: totals.error_count,
          blocking_lines: errorLines.map(l => ({
            patient_name: l.patient_name,
            treatment_name: l.treatment_name,
            flags: l.validation_flags.filter(f => f.level === 'ERROR')
          }))
        },
        { status: 400 }
      );
    }

    // 4. Update status to approved
    const { data: approvedSession, error: appErr } = await supabase
      .from('billing_sessions')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by
      })
      .eq('id', id)
      .select()
      .single();

    if (appErr) {
      return NextResponse.json({ error: appErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Contabilidad aprobada correctamente.',
      session: approvedSession,
      approved_at: approvedSession.approved_at,
      approved_by: approvedSession.approved_by
    });
  } catch (err: any) {
    console.error('Unexpected error in POST /api/billing/sessions/[id]/approve:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
