import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId');

    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    let query = supabaseAdmin
      .from('reminders')
      .select('id, patient_id, reminder_type, status, scheduled_at, message, subject, channel')
      .order('scheduled_at', { ascending: true });

    if (patientId) {
      query = query.eq('patient_id', patientId);
    } else {
      query = query
        .gte('scheduled_at', now.toISOString())
        .lte('scheduled_at', nextWeek.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching reminders Supabase:', error);
      return NextResponse.json(
        { error: 'Error al consultar recordatorios', status: 500, details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error in GET /api/reminders:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', status: 500 },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'id and status are required', status: 400 },
        { status: 400 }
      );
    }

    const allowedStatuses = ['pendiente', 'enviado', 'error', 'leido', 'cancelado'];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Permitted values: pendiente, enviado, error, leido, cancelado', status: 400 },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('reminders')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
       return NextResponse.json(
         { error: 'Error al actualizar recordatorio', status: 500, details: error.message },
         { status: 500 }
       );
    }

    // Insert reminder_event for auditing
    await supabaseAdmin.from('reminder_events').insert({
      reminder_id: id,
      event_type: 'status_changed',
      description: `Estado cambiado manualmente a: ${status}`,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in PATCH /api/reminders:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', status: 500 },
      { status: 500 }
    );
  }
}
