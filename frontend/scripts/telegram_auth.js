const readline = require('readline');
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('\n======================================================');
  console.log('   🚀 MELOSMILE — AUTENTICACIÓN TELEGRAM MTPROTO');
  console.log('======================================================\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://amhfdzfcmpastmlsosou.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Obtener configuración actual de la base de datos
  const { data: dbSettings } = await supabase
    .from('messaging_settings')
    .select('*')
    .eq('id', 1)
    .single();

  const apiId = Number(process.env.TELEGRAM_API_ID || dbSettings?.telegram_api_id || 31158011);
  const apiHash = process.env.TELEGRAM_API_HASH || dbSettings?.telegram_api_hash || '9258407c8ea67b1e5d97bd04214ed6f8';
  const defaultPhone = dbSettings?.telegram_phone || '+34605011978';

  console.log(`📌 App api_id:   ${apiId}`);
  console.log(`📌 App api_hash: ${apiHash}`);
  console.log(`📌 Teléfono por defecto: ${defaultPhone}\n`);

  const phoneInput = await question(`Introduce el número de teléfono con prefijo internacional [${defaultPhone}]: `);
  let rawPhone = (phoneInput.trim() || defaultPhone).replace(/\s+/g, '');
  // Normalizar: 0034... → +34..., 34... → +34... si empieza sin +
  if (rawPhone.startsWith('00')) {
    rawPhone = '+' + rawPhone.slice(2);
  } else if (!rawPhone.startsWith('+')) {
    rawPhone = '+' + rawPhone;
  }
  const phoneNumber = rawPhone;

  console.log(`\n⏳ Conectando con Telegram para enviar código a: ${phoneNumber}...`);

  const stringSession = new StringSession('');
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => phoneNumber,
    password: async () => {
      return await question('Introduce tu contraseña de verificación en dos pasos (2FA) si la tienes: ');
    },
    phoneCode: async () => {
      console.log('\n📩 ¡Código enviado por Telegram a tu aplicación o SMS!');
      return await question('Introduce el código de 5 dígitos recibido: ');
    },
    onError: (err) => console.error('Error de autenticación:', err),
  });

  console.log('\n🎉 ¡Autenticación exitosa con Telegram MTProto!');
  const sessionString = client.session.save();

  // 2. Guardar en Supabase messaging_settings
  console.log('💾 Guardando session string en Supabase (messaging_settings)...');
  const { error: dbError } = await supabase
    .from('messaging_settings')
    .update({
      telegram_enabled: true,
      telegram_phone: phoneNumber,
      telegram_api_id: String(apiId),
      telegram_api_hash: apiHash,
      telegram_session_string: sessionString,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1);

  if (dbError) {
    console.error('❌ Error al actualizar Supabase:', dbError.message);
  } else {
    console.log('✅ Supabase actualizado correctamente.');
  }

  // 3. Guardar en frontend/.env.local si existe
  const envPath = path.join(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');
    if (envContent.includes('TELEGRAM_SESSION_STRING=')) {
      envContent = envContent.replace(/TELEGRAM_SESSION_STRING=.*/g, `TELEGRAM_SESSION_STRING=${sessionString}`);
    } else {
      envContent += `\nTELEGRAM_SESSION_STRING=${sessionString}\n`;
    }
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log('✅ frontend/.env.local actualizado con TELEGRAM_SESSION_STRING.');
  }

  const me = await client.getMe();
  console.log(`\n👤 Conectado como: ${me.firstName || ''} ${me.lastName || ''} (@${me.username || 'sin_usuario'}) - ID: ${me.id}`);
  console.log('✨ Ya puedes enviar recordatorios directos a los números de tus pacientes sin bots.');

  await client.disconnect();
  rl.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Error fatal:', err);
  rl.close();
  process.exit(1);
});
