const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const apiId = 31158011;
const apiHash = '9258407c8ea67b1e5d97bd04214ed6f8';

async function verify() {
  const code = process.argv[2];
  const password = process.argv[3];

  if (!code) {
    console.error('❌ Debes proporcionar el código de 5 dígitos: node scripts/telegram_verify_code.js <CODIGO>');
    process.exit(1);
  }

  const statePath = path.join(__dirname, '../scratch/telegram_pending_auth.json');
  if (!fs.existsSync(statePath)) {
    console.error('❌ No se encontró estado pendiente de autenticación. Ejecuta primero telegram_send_code.js');
    process.exit(1);
  }

  const authState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  console.log(`⏳ Verificando código para ${authState.phoneNumber}...`);

  const session = new StringSession(authState.tempSession);
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.connect();

  try {
    await client.invoke(
      new Api.auth.SignIn({
        phoneNumber: authState.phoneNumber,
        phoneCodeHash: authState.phoneCodeHash,
        phoneCode: code.trim(),
      })
    );
  } catch (err) {
    if (err.message && err.message.includes('SESSION_PASSWORD_NEEDED')) {
      if (!password) {
        console.error('⚠️ Tu cuenta tiene Verificación en Dos Pasos (2FA) activada.');
        console.error('Ejecuta: node scripts/telegram_verify_code.js ' + code + ' <TU_PASSWORD_2FA>');
        await client.disconnect();
        process.exit(2);
      }
      console.log('⏳ Aplicando contraseña 2FA...');
      await client.signInWithPassword({
        password: async () => password,
      });
    } else {
      throw err;
    }
  }

  console.log('🎉 ¡Autenticación completada con éxito!');
  const finalSession = client.session.save();

  // Guardar en Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://amhfdzfcmpastmlsosou.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { error: dbError } = await supabase
    .from('messaging_settings')
    .update({
      telegram_enabled: true,
      telegram_phone: authState.phoneNumber,
      telegram_api_id: String(apiId),
      telegram_api_hash: apiHash,
      telegram_session_string: finalSession,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1);

  if (dbError) {
    console.error('❌ Error al actualizar Supabase:', dbError.message);
  } else {
    console.log('✅ Supabase actualizado con la sesión activa.');
  }

  // Guardar en .env.local
  const envPath = path.join(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');
    if (envContent.includes('TELEGRAM_SESSION_STRING=')) {
      envContent = envContent.replace(/TELEGRAM_SESSION_STRING=.*/g, `TELEGRAM_SESSION_STRING=${finalSession}`);
    } else {
      envContent += `\nTELEGRAM_SESSION_STRING=${finalSession}\n`;
    }
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log('✅ .env.local actualizado con TELEGRAM_SESSION_STRING.');
  }

  const me = await client.getMe();
  console.log(`👤 Sesión conectada como: ${me.firstName || ''} ${me.lastName || ''} (@${me.username || 'sin_usuario'})`);

  // Limpiar archivo temporal
  fs.unlinkSync(statePath);
  await client.disconnect();
}

verify().catch((err) => {
  console.error('❌ Error durante la verificación:', err.message || err);
  process.exit(1);
});
