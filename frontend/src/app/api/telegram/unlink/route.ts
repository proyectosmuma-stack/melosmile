import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const { error } = await (supabase as any)
      .from('messaging_settings')
      .update({
        telegram_session_string: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    if (error) {
      console.error('[Telegram Unlink Error]:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Sesión de Telegram desvinculada exitosamente.',
    });
  } catch (err: any) {
    console.error('[Telegram Unlink Exception]:', err);
    return NextResponse.json({ error: err.message || 'Error al desvincular' }, { status: 500 });
  }
}
