const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const apiId = 31158011;
const apiHash = '9258407c8ea67b1e5d97bd04214ed6f8';

async function main() {
  console.log('======================================================');
  console.log('   📱 VINCULACIÓN TELEGRAM MEDIANTE CÓDIGO QR');
  console.log('======================================================\n');
  console.log('Iniciando cliente Telegram...');

  const client = new TelegramClient(new StringSession(''), apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.connect();

  console.log('\n📲 Generando Código QR...');
  console.log('Para vincular tu cuenta:');
  console.log(' 1. Abre Telegram en el móvil (605 o 690)');
  console.log(' 2. Ve a: Ajustes > Dispositivos > Vincular dispositivo');
  console.log(' 3. Escanea el código QR que aparecerá a continuación:\n');

  try {
    const user = await client.signInUserWithQrCode(
      { apiId, apiHash },
      {
        qrCode: async (code) => {
          const tokenBase64 = Buffer.from(code.token).toString('base64url');
          const qrUrl = `tg://login?token=${tokenBase64}`;

          console.log('\n' + '─'.repeat(40));
          console.log('ESCANEA ESTE CÓDIGO QR CON TELEGRAM:');
          console.log('─'.repeat(40));
          qrcode.generate(qrUrl, { small: true });

          // También guardar como imagen PNG por si la terminal no renderiza bien
          const qrImagePath = path.join(__dirname, '../telegram_qr.png');
          await QRCode.toFile(qrImagePath, qrUrl, { width: 400 });
          console.log(`\n(También guardada copia en imagen: ${qrImagePath})`);
          console.log('Esperando a que escanees el código en tu móvil...\n');
        },
        onError: (err) => {
          console.error('Error durante escaneo QR:', err);
          return false;
        },
      }
    );

    console.log('\n🎉 ¡VINCULACIÓN EXITOSA CON TELEGRAM!');
    console.log(`Usuario autenticado: ${user.firstName || ''} ${user.lastName || ''} (@${user.username || 'sin_alias'}) - ID: ${user.id}`);
    
    const sessionString = client.session.save();

    // Guardar en Supabase
    console.log('💾 Guardando session string en Supabase (messaging_settings)...');
    const { error: dbError } = await supabase
      .from('messaging_settings')
      .update({
        telegram_enabled: true,
        telegram_phone: user.phone ? `+${user.phone}` : '+34605011978',
        telegram_api_id: String(apiId),
        telegram_api_hash: apiHash,
        telegram_session_string: sessionString,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    if (dbError) {
      console.error('⚠️ Error al actualizar base de datos:', dbError.message);
    } else {
      console.log('✅ Configuración de Telegram guardada y activada en base de datos.');
    }
  } catch (err) {
    console.error('\n❌ Fallo en la autenticación QR:', err.message);
  } finally {
    await client.disconnect();
    process.exit(0);
  }
}

main();
