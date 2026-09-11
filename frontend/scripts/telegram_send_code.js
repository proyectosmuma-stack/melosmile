const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const fs = require('fs');
const path = require('path');

const apiId = 31158011;
const apiHash = '9258407c8ea67b1e5d97bd04214ed6f8';
const phoneNumber = process.argv[2] || '+34690154268';

async function sendCode() {
  console.log(`⏳ Conectando a Telegram MTProto para enviar código a: ${phoneNumber}...`);
  const session = new StringSession('');
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.connect();

  const res = await client.sendCode(
    {
      apiId,
      apiHash,
    },
    phoneNumber
  );

  console.log('✅ Código de verificación enviado por Telegram!');
  console.log('Detalles:', {
    phoneCodeHash: res.phoneCodeHash,
    isCodeViaApp: res.isCodeViaApp,
  });

  const scratchDir = path.join(__dirname, '../scratch');
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  const authState = {
    phoneNumber,
    phoneCodeHash: res.phoneCodeHash,
    tempSession: client.session.save(),
    sentAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(scratchDir, 'telegram_pending_auth.json'),
    JSON.stringify(authState, null, 2),
    'utf8'
  );

  console.log('💾 Estado guardado en frontend/scratch/telegram_pending_auth.json');
  await client.disconnect();
}

sendCode().catch((err) => {
  console.error('❌ Error al enviar código Telegram:', err);
  process.exit(1);
});
