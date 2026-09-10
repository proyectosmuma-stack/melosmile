import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase/server';

export const GET = async () => {

  const { data, error } = await (supabase as any).from('messaging_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) {
    console.error('Error fetching messaging settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const maskedData = { ...data };
  if (maskedData.whatsapp_api_token) {
    maskedData.whatsapp_api_token = '****' + maskedData.whatsapp_api_token.slice(-4);
  }
  if (maskedData.telegram_bot_token) {
    maskedData.telegram_bot_token = '****' + maskedData.telegram_bot_token.slice(-4);
  }
  if (maskedData.smtp_password) {
    maskedData.smtp_password = '****' + maskedData.smtp_password.slice(-4);
  }

  return NextResponse.json({ data: maskedData });
};

export const PUT = async (req: Request) => {
  const body = await req.json();

  if (!body) {
    return NextResponse.json({ error: 'Request body cannot be empty' }, { status: 400 });
  }

  const { data: currentSettings, error: fetchError } = await (supabase as any).from('messaging_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
    console.error('Error fetching current messaging settings:', fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
  for (const key in body) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      const value = body[key];
      if (key.includes('token') || key.includes('password')) {
        if (value === '****' + (currentSettings?.[key]?.slice(-4) || '')) {
          // If masked value comes back, don't update the secret
          continue;
        } else if (value === '') {
          // If value is empty, set to null
          updateData[key] = null;
        } else {
          updateData[key] = value;
        }
      } else if (value === '') {
        updateData[key] = null;
      } else {
        updateData[key] = value;
      }
    }
  }

  const { data, error } = await (supabase as any).from('messaging_settings')
    .upsert(updateData, { onConflict: 'id' })
    .select('*')
    .eq('id', 1)
    .single();

  if (error) {
    console.error('Error updating messaging settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const maskedData = { ...data };
  if (maskedData.whatsapp_api_token) {
    maskedData.whatsapp_api_token = '****' + maskedData.whatsapp_api_token.slice(-4);
  }
  if (maskedData.telegram_bot_token) {
    maskedData.telegram_bot_token = '****' + maskedData.telegram_bot_token.slice(-4);
  }
  if (maskedData.smtp_password) {
    maskedData.smtp_password = '****' + maskedData.smtp_password.slice(-4);
  }

  return NextResponse.json({ data: maskedData });
};
