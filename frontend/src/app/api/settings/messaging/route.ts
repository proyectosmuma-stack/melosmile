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
  if (maskedData.telegram_api_hash) {
    maskedData.telegram_api_hash = '****' + maskedData.telegram_api_hash.slice(-4);
  }
  if (maskedData.telegram_session_string) {
    maskedData.telegram_session_string = '****' + maskedData.telegram_session_string.slice(-4);
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

  // Only allow actual DB columns — reject UI fields like 'loading', 'saving'
  const ALLOWED_COLUMNS = new Set([
    'whatsapp_enabled', 'whatsapp_phone', 'whatsapp_api_token', 'whatsapp_template_name',
    'telegram_enabled', 'telegram_bot_token', 'telegram_phone',
    'telegram_api_id', 'telegram_api_hash', 'telegram_session_string',
    'email_enabled', 'smtp_host', 'smtp_port', 'smtp_user', 'smtp_password', 'smtp_secure',
    'email_from', 'email_from_name',
  ]);

  const updateData: Record<string, any> = { id: 1, updated_at: new Date().toISOString() };
  for (const key in body) {
    if (Object.prototype.hasOwnProperty.call(body, key) && ALLOWED_COLUMNS.has(key)) {
      const value = body[key];
      if (key.includes('token') || key.includes('password') || key.includes('hash') || key.includes('session')) {
        // Skip if the masked placeholder value came back unchanged
        const maskedPlaceholder = currentSettings?.[key]
          ? '****' + currentSettings[key].slice(-4)
          : '';
        if (value === maskedPlaceholder && maskedPlaceholder !== '') {
          continue;
        } else if (value === '' || value === null) {
          updateData[key] = null;
        } else {
          updateData[key] = value;
        }
      } else if (key === 'smtp_port') {
        updateData[key] = value === null || value === '' ? 587 : Number(value);
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
  if (maskedData.telegram_api_hash) {
    maskedData.telegram_api_hash = '****' + maskedData.telegram_api_hash.slice(-4);
  }
  if (maskedData.telegram_session_string) {
    maskedData.telegram_session_string = '****' + maskedData.telegram_session_string.slice(-4);
  }
  if (maskedData.smtp_password) {
    maskedData.smtp_password = '****' + maskedData.smtp_password.slice(-4);
  }

  return NextResponse.json({ data: maskedData });
};
