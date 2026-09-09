
import { NextRequest, NextResponse } from 'next/server';
import { ICalCalendar, ICalEventStatus, ICalAlarmType } from 'ical-generator';
import { createClient } from '@supabase/supabase-js';
import { formatTimeMadrid, formatDateMadrid } from '../../../../lib/utils/date-parser';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key are required!');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const clinicIdFilter = searchParams.get('clinic_id');

  // Authentication: Use a static secret token
  const ICAL_TOKEN = process.env.ICAL_TOKEN || 'MELOSMILE_SECRET_TOKEN'; // Fallback for development
  if (token !== ICAL_TOKEN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    let query = supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        reason,
        notes,
        status,
        patients (first_name, last_name),
        clinics (name, address)
      `);

    if (clinicIdFilter) {
      query = query.eq('clinic_id', clinicIdFilter);
    }

    const { data: appointments, error } = await query;

    if (error) {
      console.error('Error fetching appointments:', error);
      return new NextResponse('Error fetching appointments', { status: 500 });
    }

    const calendar = new ICalCalendar({
      name: 'MeloSmile Appointments',
      timezone: 'Europe/Madrid',
      prodId: '//MeloSmile//Calendar//EN',
    });

    appointments.forEach((appointment) => {
      const patient = (appointment.patients as any) as { first_name?: string; last_name?: string } | null;
      const clinic = (appointment.clinics as any) as { name?: string; address?: string } | null;

      const startDate = new Date(appointment.appointment_date);
      // Assuming a default duration of 60 minutes if not specified
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); 

      let eventStatus: ICalEventStatus | undefined;
      switch (appointment.status) {
        case 'confirmed':
          eventStatus = ICalEventStatus.CONFIRMED;
          break;
        case 'cancelled':
          eventStatus = ICalEventStatus.CANCELLED;
          break;
        default:
          eventStatus = ICalEventStatus.TENTATIVE;
          break;
      }

      calendar.createEvent({
        id: appointment.id,
        start: startDate,
        end: endDate,
        summary: `${appointment.reason || 'Cita'} - ${patient?.first_name || ''} ${patient?.last_name || ''}`.trim(),
        description: appointment.notes || '',
        location: clinic?.address || clinic?.name || '',
        status: eventStatus,
        organizer: 'MeloSmile Clinic <no-reply@melosmile.com>',
        alarms: [{ type: ICalAlarmType.display, triggerBefore: 300 }], // 5 minutes before
      });
    });

    return new NextResponse(calendar.toString(), {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error generating iCal feed:', error);
    return new NextResponse('Error generating iCal feed', { status: 500 });
  }
}
