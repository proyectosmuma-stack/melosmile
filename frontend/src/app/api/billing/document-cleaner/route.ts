import { NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import { supabaseAdmin } from '@/lib/supabase/server';

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://n8nv2.mumaweb.com/webhook/document-cleaner';

const INTERNAL_BASE_URL = process.env.NEXT_PUBLIC_APP_URL
  ? (process.env.NEXT_PUBLIC_APP_URL.startsWith('http') ? process.env.NEXT_PUBLIC_APP_URL : `https://${process.env.NEXT_PUBLIC_APP_URL}`)
  : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3028');

function parseApptDate(rawDate: string | undefined, defaultMonth: number, defaultYear: number, defaultDay?: number): string {
  const targetYear = defaultYear || new Date().getFullYear();
  const targetMonth = String(defaultMonth || 1).padStart(2, '0');
  const fallbackDayStr = defaultDay ? String(defaultDay).padStart(2, '0') : '15';

  if (!rawDate) return `${targetYear}-${targetMonth}-${fallbackDayStr}`;

  // Extract day number (1-31) from rawDate if present
  let dayStr = '';
  if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
    dayStr = rawDate.substring(8, 10);
  } else {
    const match = rawDate.match(/(\d{1,2})/);
    if (match) {
      const dayNum = parseInt(match[1], 10);
      if (dayNum >= 1 && dayNum <= 31) {
        dayStr = String(dayNum).padStart(2, '0');
      }
    }
  }

  if (!dayStr) {
    dayStr = fallbackDayStr;
  }

  return `${targetYear}-${targetMonth}-${dayStr}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clinic_id, month, year, day, content, source_type, filename, clear_existing } = body;

    // 0. Optional: Clear existing appointments for this clinic and month if requested
    if (clear_existing && clinic_id && month && year) {
      try {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`;

        const apptsRes = await (supabaseAdmin as any)
          .from('appointments')
          .select('id')
          .eq('clinic_id', clinic_id)
          .gte('appointment_date', startDate)
          .lte('appointment_date', endDate);

        if (apptsRes.data && apptsRes.data.length > 0) {
          const apptIds = apptsRes.data.map((a: any) => a.id);
          await (supabaseAdmin as any).from('billing_records').delete().in('appointment_id', apptIds);
          await (supabaseAdmin as any).from('appointments').delete().in('id', apptIds);
        }
      } catch (clearErr) {
        console.warn('Notice clearing existing month appointments:', clearErr);
      }
    }

    let contentToForward = content || '';

    const isExcel = source_type === 'excel' || filename?.match(/\.(xlsx|xls|csv)$/i);
    const isImage = source_type === 'image' || filename?.match(/\.(jpg|jpeg|png|webp|gif)$/i);

    // 1. Process Excel files into clean CSV text representation
    if (isExcel && typeof content === 'string' && content.length > 0) {
      try {
        const cleanBase64 = content.replace(/^data:.*;base64,/, '');
        const buffer = Buffer.from(cleanBase64, 'base64');
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        let csvCombined = '';
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const csv = xlsx.utils.sheet_to_csv(sheet);
          if (csv && csv.trim()) {
            csvCombined += `\n--- Hoja: ${sheetName} ---\n${csv}\n`;
          }
        }
        if (csvCombined.trim()) {
          contentToForward = csvCombined;
        }
      } catch (err) {
        console.warn('Notice parsing Excel buffer into CSV, sending raw content:', err);
      }
    } else if (isImage && typeof content === 'string' && content.length > 0) {
      // 2. Process Image files: Ensure valid Data URI schema so OpenRouter/Gemini Vision recognizes image content!
      if (!content.startsWith('data:')) {
        const ext = (filename || '').toLowerCase();
        let mime = 'image/jpeg';
        if (ext.endsWith('.png')) mime = 'image/png';
        else if (ext.endsWith('.webp')) mime = 'image/webp';
        contentToForward = `data:${mime};base64,${content}`;
      }
    }

    // 3. Forward payload to n8n Document Cleaner agent
    const res = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: contentToForward,
        source_type: isImage ? 'image' : (isExcel ? 'excel' : source_type),
        clinic_id,
        month,
        year
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error('N8N agent error: ' + errText);
    }

    const n8nData = await res.json();
    let appointmentsList: any[] = [];

    if (Array.isArray(n8nData.appointments)) {
      appointmentsList = n8nData.appointments;
    } else if (n8nData.appointments && Array.isArray(n8nData.appointments.appointments)) {
      appointmentsList = n8nData.appointments.appointments;
    } else if (n8nData.data && Array.isArray(n8nData.data.appointments)) {
      appointmentsList = n8nData.data.appointments;
    } else if (Array.isArray(n8nData.data)) {
      appointmentsList = n8nData.data;
    } else if (Array.isArray(n8nData)) {
      appointmentsList = n8nData;
    }

    const incomingCookie = request.headers.get('cookie') || '';
    const createdAppointments = [];

    // 4. Automatically create each appointment returned by the Agent
    for (const appt of appointmentsList) {
      try {
        const patientName = appt.patient_name || appt.patient;
        if (!patientName || patientName === 'No especificado') continue;

        const resolvedDate = parseApptDate(appt.date, month, year, day ? parseInt(day, 10) : undefined);
        const createRes = await fetch(`${INTERNAL_BASE_URL}/api/appointments/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': incomingCookie
          },
          body: JSON.stringify({
            patient: patientName,
            clinic_id: clinic_id,
            reason: Array.isArray(appt.treatments) ? appt.treatments.join(' + ') : (appt.treatment || appt.reason || 'Consulta'),
            treatments: appt.treatments,
            notes: appt.notes || appt.observations || appt.observation,
            date: resolvedDate,
            time: appt.time || '12:00',
            price: appt.price_eur,
            status: appt.cancelled ? 'Cancelada' : 'Realizada'
          })
        });

        if (createRes.ok) {
          const apptData = await createRes.json();
          createdAppointments.push(apptData);
        }
      } catch (err: any) {
        console.warn('Notice creating individual appointment:', err?.message);
      }
    }

    // ─── Auto-Generate Billing Session ─────────────────────────────────────────
    // After importing appointments, automatically generate / refresh the billing
    // session for this clinic + month so it shows immediately in the Billing Hub.
    let billingSession: any = null;
    if (createdAppointments.length > 0 && clinic_id && month && year) {
      try {
        const generateUrl = `${INTERNAL_BASE_URL}/api/billing/sessions/generate?clinic_id=${clinic_id}&month=${month}&year=${year}`;
        const genRes = await fetch(generateUrl, {
          headers: { 'Cookie': incomingCookie }
        });
        if (genRes.ok) {
          billingSession = await genRes.json();
          console.log(`✅ Billing session auto-generated for clinic ${clinic_id} ${month}/${year}:`, billingSession?.session_id);
        } else {
          console.warn('Notice: billing session auto-generation returned non-OK status:', genRes.status);
        }
      } catch (genErr: any) {
        console.warn('Notice: could not auto-generate billing session:', genErr?.message);
      }
    }

    return NextResponse.json({
      success: true,
      count: createdAppointments.length,
      appointments: createdAppointments,
      billing_session: billingSession,
      data: n8nData
    });

  } catch (err: any) {
    console.error('Error in document-cleaner proxy:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
