import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { processBillingLine, calculateSessionTotals, RawLineInput } from '@/lib/billing/calculator';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

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
      return new NextResponse('<html><body><h1>Sesión no encontrada</h1></body></html>', {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // 2. Fetch Session Lines
    const { data: rawLines } = await supabase
      .from('billing_session_lines')
      .select('*')
      .eq('session_id', id)
      .order('sort_order', { ascending: true })
      .order('session_date', { ascending: true });

    // 3. Fetch Treatment catalog for live validation comparison
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

    const lines = (rawLines || []).map(l =>
      processBillingLine(l as RawLineInput, l.commission_pct ?? defaultComm, l.lab_discount_pct ?? defaultLabDisc, catalogMap)
    );

    const totals = calculateSessionTotals(lines);
    const monthName = MONTH_NAMES[(session.month || 1) - 1] || 'Mes';
    const periodTitle = `${monthName.toUpperCase()} ${session.year}`;
    const clinicName = session.clinic_name || session.clinic?.name || 'Clínica Melosmile';
    const tracksPayments = session.clinic?.tracks_payments ?? false;

    // Build Resumen per Service
    const servicesMap = new Map<string, { qty: number; subtotal: number; commission: number }>();
    const labMap = new Map<string, { qty: number; subtotal: number; discounted: number }>();

    for (const l of lines) {
      if (l.treatment_name) {
        const sKey = l.treatment_name.trim();
        const curr = servicesMap.get(sKey) || { qty: 0, subtotal: 0, commission: 0 };
        servicesMap.set(sKey, {
          qty: curr.qty + (l.quantity || 1),
          subtotal: curr.subtotal + l.subtotal,
          commission: curr.commission + l.commission_amount
        });
      }

      if (l.lab_name && l.lab_name.trim() !== '') {
        const lKey = l.lab_name.trim();
        const curr = labMap.get(lKey) || { qty: 0, subtotal: 0, discounted: 0 };
        labMap.set(lKey, {
          qty: curr.qty + (l.lab_quantity || 1),
          subtotal: curr.subtotal + l.lab_subtotal,
          discounted: curr.discounted + l.lab_total_discounted
        });
      }
    }

    // Build Pivot per Patient
    const pivotMap = new Map<string, { totalPrice: number; totalLab: number; neto: number }>();
    for (const l of lines) {
      const pName = l.patient_name || 'Sin nombre';
      const curr = pivotMap.get(pName) || { totalPrice: 0, totalLab: 0, neto: 0 };
      pivotMap.set(pName, {
        totalPrice: curr.totalPrice + l.subtotal,
        totalLab: curr.totalLab + l.lab_total_discounted,
        neto: curr.neto + l.net_amount
      });
    }

    // Render HTML Document
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Resumen Contable — ${clinicName} (${periodTitle})</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: #1e293b; background: #fff; margin: 0; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 16px; }
    .logo { font-size: 20px; font-weight: 800; color: #0f766e; letter-spacing: -0.5px; }
    .subtitle { font-size: 12px; color: #64748b; margin-top: 2px; }
    .meta-box { text-align: right; font-size: 11px; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-weight: 600; font-size: 10px; text-transform: uppercase; }
    .badge-approved { background: #dcfce7; color: #166534; }
    .badge-draft { background: #f1f5f9; color: #475569; }
    .badge-pending { background: #fef3c7; color: #92400e; }
    
    .section-title { font-size: 13px; font-weight: 700; color: #0f766e; margin: 18px 0 8px 0; border-left: 3px solid #0f766e; padding-left: 8px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 10px; }
    th { background: #f8fafc; color: #334155; font-weight: 700; text-align: left; padding: 6px 8px; border-bottom: 2px solid #cbd5e1; }
    td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
    tr:nth-child(even) { background: #f8fafc; }
    tr.row-warning { background: #fefce8; }
    tr.row-error { background: #fef2f2; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .bold { font-weight: 700; }
    
    .totales-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
    .card-total { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center; }
    .card-total .lbl { font-size: 10px; color: #64748b; text-transform: uppercase; }
    .card-total .val { font-size: 16px; font-weight: 800; color: #0f766e; margin-top: 4px; }
    .card-total.neto { background: #f0fdf4; border-color: #bbf7d0; }
    .card-total.neto .val { color: #15803d; }
    
    .twocol { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .footer-approval { margin-top: 24px; padding-top: 16px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; font-size: 11px; color: #475569; }
    .signature-box { border: 1px dashed #94a3b8; border-radius: 6px; padding: 12px; width: 220px; text-align: center; margin-top: 8px; }
    
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="no-print" style="margin-bottom: 12px; text-align: right;">
      <button onclick="window.print()" style="background: #0f766e; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">
        🖨️ Imprimir / Guardar en PDF
      </button>
    </div>

    <!-- 1. Cabecera -->
    <div class="header">
      <div>
        <div class="logo">MELOSMILE — CONTABILIDAD CLÍNICA</div>
        <div class="subtitle">Sede: <strong>${clinicName}</strong> | Período: <strong>${periodTitle}</strong></div>
      </div>
      <div class="meta-box">
        <div>Estado: <span class="badge badge-${session.status || 'draft'}">${(session.status || 'draft').toUpperCase()}</span></div>
        <div style="margin-top: 4px;">Comisión Clínica: <strong>${session.commission_pct}%</strong> | Dto. Lab: <strong>${session.lab_discount_pct}%</strong></div>
        <div style="color: #94a3b8; font-size: 9px; margin-top: 2px;">Generado el ${new Date().toLocaleDateString('es-ES')}</div>
      </div>
    </div>

    <!-- 2. Tabla de Detalle de Citas -->
    <div class="section-title">1. Detalle por Sesión y Tratamiento</div>
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Paciente</th>
          <th>Tratamiento</th>
          <th>Obs.</th>
          <th class="num">Cant</th>
          <th class="num">Precio</th>
          <th class="num">Subtotal</th>
          <th class="num">Comisión (${session.commission_pct}%)</th>
          <th>Equipo Lab</th>
          <th class="num">Lab Dto. (${session.lab_discount_pct}%)</th>
          <th class="num">NETO</th>
          ${tracksPayments ? '<th class="num">Pago</th>' : ''}
        </tr>
      </thead>
      <tbody>
        ${lines.map(l => `
          <tr class="${l.needs_review ? 'row-error' : l.is_negative ? 'row-warning' : ''}">
            <td>${l.session_date ? new Date(l.session_date).toLocaleDateString('es-ES') : '-'}</td>
            <td class="bold">${l.patient_name}</td>
            <td>${l.treatment_name}</td>
            <td style="color: #64748b; font-size: 9px;">${l.observation || ''}</td>
            <td class="num">${l.quantity}</td>
            <td class="num">${l.effective_price.toFixed(2)} €</td>
            <td class="num">${l.subtotal.toFixed(2)} €</td>
            <td class="num">${l.commission_amount.toFixed(2)} €</td>
            <td>${l.lab_name || '-'}</td>
            <td class="num">${l.lab_total_discounted.toFixed(2)} €</td>
            <td class="num bold ${l.net_amount < 0 ? 'color: #dc2626' : ''}">${l.net_amount.toFixed(2)} €</td>
            ${tracksPayments ? `<td class="num">${l.payment_status === 'paid' ? '✅' : '🟡'} ${l.payment_amount?.toFixed(2) || '0'} €</td>` : ''}
          </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr class="bold" style="background: #e2e8f0;">
          <td colspan="4">TOTALES (${lines.length} registros)</td>
          <td class="num">${lines.reduce((a, b) => a + (b.quantity || 0), 0)}</td>
          <td></td>
          <td class="num">${totals.total_subtotal.toFixed(2)} €</td>
          <td class="num">${totals.total_commission.toFixed(2)} €</td>
          <td></td>
          <td class="num">${totals.total_lab.toFixed(2)} €</td>
          <td class="num" style="color: #0f766e; font-size: 11px;">${totals.total_neto.toFixed(2)} €</td>
          ${tracksPayments ? '<td></td>' : ''}
        </tr>
      </tfoot>
    </table>

    <!-- 3. Totales Destacados -->
    <div class="totales-grid">
      <div class="card-total">
        <div class="lbl">Total Bruto Tratamientos</div>
        <div class="val">${totals.total_subtotal.toFixed(2)} €</div>
      </div>
      <div class="card-total">
        <div class="lbl">Comisión Clínica (${session.commission_pct}%)</div>
        <div class="val">${totals.total_commission.toFixed(2)} €</div>
      </div>
      <div class="card-total">
        <div class="lbl">Gastos Laboratorio (${session.lab_discount_pct}%)</div>
        <div class="val">${totals.total_lab.toFixed(2)} €</div>
      </div>
      <div class="card-total neto">
        <div class="lbl">NETO FINAL CLÍNICA / DOCTORA</div>
        <div class="val">${totals.total_neto.toFixed(2)} €</div>
      </div>
    </div>

    <!-- 4. Resumen por Servicio & Pivot por Paciente -->
    <div class="twocol">
      <div>
        <div class="section-title">2. Resumen por Tipo de Servicio y Laboratorio</div>
        <table>
          <thead>
            <tr>
              <th>Servicio / Tratamiento</th>
              <th class="num">Cant</th>
              <th class="num">Subtotal</th>
              <th class="num">Comisión</th>
            </tr>
          </thead>
          <tbody>
            ${Array.from(servicesMap.entries()).map(([name, s]) => `
              <tr>
                <td class="bold">${name}</td>
                <td class="num">${s.qty}</td>
                <td class="num">${s.subtotal.toFixed(2)} €</td>
                <td class="num">${s.commission.toFixed(2)} €</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div>
        <div class="section-title">3. Resumen Acumulado por Paciente (Pivot)</div>
        <table>
          <thead>
            <tr>
              <th>Paciente</th>
              <th class="num">Precio Total</th>
              <th class="num">Gasto Lab</th>
              <th class="num">Monto Final</th>
            </tr>
          </thead>
          <tbody>
            ${Array.from(pivotMap.entries()).map(([pName, p]) => `
              <tr>
                <td class="bold">${pName}</td>
                <td class="num">${p.totalPrice.toFixed(2)} €</td>
                <td class="num">${p.totalLab.toFixed(2)} €</td>
                <td class="num bold" style="color: #0f766e;">${p.neto.toFixed(2)} €</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- 5. Firma y Aprobación -->
    <div class="footer-approval">
      <div>
        <div><strong>Firma de Conformidad:</strong></div>
        <div class="signature-box">
          <br><br>
          _______________________________<br>
          ${session.approved_by || 'Dra. Osly Melo'}
        </div>
      </div>
      <div style="text-align: right;">
        <div>Aprobado: <strong>${session.approved_at ? new Date(session.approved_at).toLocaleString('es-ES') : 'Pendiente'}</strong></div>
        <div style="margin-top: 4px;">Notas: <em>${session.notes || 'Sin observaciones.'}</em></div>
      </div>
    </div>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  } catch (err: any) {
    console.error('Error rendering report:', err);
    return new NextResponse(`<html><body><h1>Error al generar reporte: ${err.message}</h1></body></html>`, {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}
