import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/server';
import { processBillingLine, calculateSessionTotals, RawLineInput } from '@/lib/billing/calculator';
import { getNextHistoriaId } from '@/lib/utils/patient-id';
import * as XLSX from 'xlsx';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      clinic_id,
      session_date,
      month: inputMonth,
      year: inputYear,
      source_type = 'excel',
      raw_text,
      file_base64,
      lines: inputLines = []
    } = body;

    // 1. Mandatory Clinic check
    if (!clinic_id) {
      return NextResponse.json(
        {
          error: 'Debe especificar la clínica para realizar el cálculo contable.',
          requires_clarification: true,
          missing_field: 'clinic_id'
        },
        { status: 400 }
      );
    }

    // 2. Determine month and year
    let month = inputMonth;
    let year = inputYear;

    if (!month || !year) {
      if (session_date) {
        const d = new Date(session_date);
        if (!isNaN(d.getTime())) {
          month = month || d.getMonth() + 1;
          year = year || d.getFullYear();
        }
      }
    }

    const now = new Date();
    month = month || now.getMonth() + 1;
    year = year || now.getFullYear();

    // 3. Fetch Clinic details
    const { data: clinic, error: clinicErr } = await supabase
      .from('clinics')
      .select('id, name, base_commission_pct, lab_discount_pct, tracks_payments')
      .eq('id', clinic_id)
      .single();

    if (clinicErr || !clinic) {
      return NextResponse.json({ error: `Clínica no encontrada (${clinic_id}).` }, { status: 404 });
    }

    // 4. Parse file if Base64 Excel was provided
    let rawLines: RawLineInput[] = [...inputLines];

    if (file_base64 && (source_type === 'excel' || rawLines.length === 0)) {
      try {
        const buffer = Buffer.from(file_base64, 'base64');
        const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        let headerIdx = -1;
        for (let i = 0; i < Math.min(10, rows.length); i++) {
          const rowStr = JSON.stringify(rows[i] || []).toLowerCase();
          if (rowStr.includes('nombre') || rowStr.includes('tratamiento')) {
            headerIdx = i;
            break;
          }
        }

        if (headerIdx !== -1) {
          const headers = (rows[headerIdx] as any[]).map(h => h ? String(h).trim().toLowerCase() : '');
          const dateCol = headers.findIndex(h => h && h.includes('fecha'));
          const nameCol = headers.findIndex(h => h && h.includes('nombre'));
          const lastNameCol = headers.findIndex(h => h && h.includes('apellido'));
          const treatmentCol = headers.findIndex(h => h && (h.includes('tratamiento') || h.includes('tratmiento')));
          const obsCol = headers.findIndex(h => h && (h.includes('observaci') || h.includes('obs')));
          const qtyCol = headers.findIndex(h => h && h.includes('cant'));
          const priceCol = headers.findIndex(h => h === 'precio');
          const altPriceCol = headers.findIndex(h => h && h.includes('otro precio'));

          for (let i = headerIdx + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            const nameVal = nameCol !== -1 ? String(row[nameCol] || '').trim() : '';
            const lastNameVal = lastNameCol !== -1 ? String(row[lastNameCol] || '').trim() : '';

            if (!nameVal && !lastNameVal) continue;

            const fullName = `${nameVal} ${lastNameVal}`.trim();
            if (fullName.toUpperCase().includes('#N/A #N/A')) continue;

            let rowDateStr = null;
            if (dateCol !== -1 && row[dateCol]) {
              const d = new Date(row[dateCol]);
              if (!isNaN(d.getTime())) {
                rowDateStr = d.toISOString().split('T')[0];
              }
            }

            rawLines.push({
              session_date: rowDateStr || `${year}-${String(month).padStart(2, '0')}-01`,
              patient_name: fullName,
              treatment_name: treatmentCol !== -1 ? String(row[treatmentCol] || '').trim() : 'Tratamiento',
              observation: obsCol !== -1 ? String(row[obsCol] || '').trim() : '',
              quantity: qtyCol !== -1 && row[qtyCol] !== undefined ? parseFloat(row[qtyCol]) || 0 : 1,
              unit_price: priceCol !== -1 && row[priceCol] !== undefined ? parseFloat(row[priceCol]) || 0 : 0,
              alt_price: altPriceCol !== -1 && row[altPriceCol] !== undefined ? parseFloat(row[altPriceCol]) || 0 : 0
            });
          }
        }
      } catch (err) {
        console.error('Error parsing Excel file Base64:', err);
      }
    }

    // 5. Fetch Treatment catalog with default_price & typical_lab_cost
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

    const { data: profMelo } = await supabase
      .from('professionals')
      .select('id')
      .or('first_name.ilike.%Osly%,last_name.ilike.%Melo%')
      .limit(1)
      .maybeSingle();

    const defaultProfessionalId = profMelo?.id || 'd7e5e2bb-a7c4-44f6-9ef8-ba453e7dc477';

    // 6. Process lines, auto-create patients (PAC-00X) and auto-create appointments
    const commPct = clinic.base_commission_pct ?? 60;
    const labDiscPct = clinic.lab_discount_pct ?? 50;

    const processedLines = [];
    const processedPatientNameSet = new Set<string>();
    let createdPatientsCount = 0;
    let createdAppointmentsCount = 0;

    for (let idx = 0; idx < rawLines.length; idx++) {
      const l = rawLines[idx];
      let matchedPatientId = l.patient_id || null;
      const rawPatientName = (l.patient_name || '').trim();

      if (rawPatientName && rawPatientName.toUpperCase() !== '#N/A' && !rawPatientName.toUpperCase().includes('#N/A')) {
        processedPatientNameSet.add(rawPatientName.toLowerCase());
        const terms = rawPatientName.split(/\s+/).filter(Boolean);
        const firstName = terms[0] || rawPatientName;
        const lastName = terms.slice(1).join(' ') || 'Sin Apellido';

        // Search patient in DB
        let { data: matchedP } = await supabase
          .from('patients')
          .select('id')
          .ilike('first_name', firstName)
          .ilike('last_name', lastName)
          .limit(1)
          .maybeSingle();

        if (!matchedP) {
          const { data: fuzzyP } = await supabase
            .from('patients')
            .select('id')
            .eq('first_name', firstName)
            .limit(1)
            .maybeSingle();

          if (fuzzyP) {
            matchedP = fuzzyP;
          }
        }

        if (!matchedP && firstName.length >= 2) {
          // Auto-create patient with sequential PAC-XXX code
          const nextHistoriaId = await getNextHistoriaId();
          const { data: newP, error: newPErr } = await supabase
            .from('patients')
            .insert({
              first_name: firstName,
              last_name: lastName,
              historia_id: nextHistoriaId
            })
            .select('id')
            .single();

          if (newP) {
            matchedP = newP;
            createdPatientsCount++;
          } else {
            console.error('Error auto-creating patient:', newPErr);
          }
        }

        if (matchedP) {
          matchedPatientId = matchedP.id;
        }
      }

      const processed = processBillingLine(
        {
          ...l,
          patient_id: matchedPatientId,
          sort_order: l.sort_order ?? idx,
          session_date: l.session_date || `${year}-${String(month).padStart(2, '0')}-01`
        },
        l.commission_pct ?? commPct,
        l.lab_discount_pct ?? labDiscPct,
        catalogMap
      );

      // Auto-create or link appointment for patient clinical history
      if (matchedPatientId) {
        const apptDate = l.session_date || `${year}-${String(month).padStart(2, '0')}-01`;
        const { data: existingAppt } = await supabase
          .from('appointments')
          .select('id')
          .eq('patient_id', matchedPatientId)
          .eq('clinic_id', clinic_id)
          .gte('appointment_date', `${apptDate}T00:00:00Z`)
          .lte('appointment_date', `${apptDate}T23:59:59Z`)
          .maybeSingle();

        if (!existingAppt && defaultProfessionalId) {
          const procedureNote = l.observation 
            ? `[Procedimientos: ["${processed.treatment_name || 'Tratamiento'}"]] - ${l.observation}`
            : `[Procedimientos: ["${processed.treatment_name || 'Tratamiento'}"]]`;

          const { error: apptErr } = await supabase.from('appointments').insert({
            patient_id: matchedPatientId,
            clinic_id: clinic_id,
            professional_id: defaultProfessionalId,
            appointment_date: `${apptDate}T10:00:00Z`,
            reason: processed.treatment_name || 'Consulta Contable',
            treatment_id: processed.treatment_id || null,
            notes: procedureNote,
            status: 'Realizada'
          });

          if (!apptErr) {
            createdAppointmentsCount++;
          } else {
            console.error('Error auto-creating appointment:', apptErr);
          }
        }
      }

      processedLines.push(processed);
    }

    // 7. Cross-check monthly appointments for the clinic and assign them to session
    const startDateISO = `${year}-${String(month).padStart(2, '0')}-01T00:00:00Z`;
    const endDay = new Date(year, month, 0).getDate();
    const endDateISO = `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}T23:59:59Z`;

    const { data: monthAppointments } = await supabase
      .from('appointments')
      .select('id, appointment_date, reason, notes, status, patient:patients(id, first_name, last_name)')
      .eq('clinic_id', clinic_id)
      .gte('appointment_date', startDateISO)
      .lte('appointment_date', endDateISO)
      .neq('status', 'Cancelada');

    if (monthAppointments) {
      for (const appt of monthAppointments) {
        const pObj = (appt.patient as any);
        if (!pObj) continue;

        const pFullName = `${pObj.first_name || ''} ${pObj.last_name || ''}`.trim();
        const pKey = pFullName.toLowerCase();

        if (!processedPatientNameSet.has(pKey)) {
          processedPatientNameSet.add(pKey);
          const treatmentName = appt.reason || 'Consulta Médica';

          const processedApptLine = processBillingLine(
            {
              session_date: appt.appointment_date ? appt.appointment_date.split('T')[0] : `${year}-${String(month).padStart(2, '0')}-01`,
              patient_name: pFullName,
              patient_id: pObj.id,
              treatment_name: treatmentName,
              observation: appt.notes || 'Visita agendada en clínica',
              quantity: 1,
              unit_price: 0,
              alt_price: 0,
              sort_order: processedLines.length
            },
            commPct,
            labDiscPct,
            catalogMap
          );

          processedLines.push(processedApptLine);
        }
      }
    }

    const totals = calculateSessionTotals(processedLines);

    // 8. Upsert Session for clinic_id, year, month
    const sessionPayload = {
      clinic_id,
      clinic_name: clinic.name,
      month,
      year,
      model_type: 'albacete',
      commission_pct: commPct,
      lab_discount_pct: labDiscPct,
      status: 'draft',
      created_by: 'IA Extractor & Auto-Sync',
      source_type,
      raw_input: { raw_text: raw_text || null, extracted_at: new Date().toISOString() },
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
      return NextResponse.json({ error: sessionErr?.message || 'Error al guardar la sesión borrador.' }, { status: 500 });
    }

    // 9. Save lines to database
    if (processedLines.length > 0) {
      await supabase.from('billing_session_lines').delete().eq('session_id', session.id);

      const dbLinesPayload = processedLines.map(l => ({
        session_id: session.id,
        session_date: l.session_date,
        patient_name: l.patient_name,
        patient_id: l.patient_id,
        treatment_name: l.treatment_name,
        treatment_id: l.treatment_id,
        observation: l.observation || null,
        quantity: l.quantity,
        unit_price: l.unit_price,
        alt_price: l.alt_price,
        effective_price: l.effective_price,
        discount: l.discount,
        subtotal: l.subtotal,
        commission_pct: l.commission_pct,
        commission_amount: l.commission_amount,
        lab_name: l.lab_name || null,
        lab_quantity: l.lab_quantity,
        lab_unit_cost: l.lab_unit_cost,
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
        sort_order: l.sort_order
      }));

      await supabase.from('billing_session_lines').insert(dbLinesPayload);
    }

    return NextResponse.json({
      success: true,
      session,
      lines: processedLines,
      totals,
      created_patients_count: createdPatientsCount,
      created_appointments_count: createdAppointmentsCount,
      review_url: `/billing/${session.id}`
    });
  } catch (err: any) {
    console.error('Error in /api/billing/extract:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
