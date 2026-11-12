const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const apiId = 31158011;
const apiHash = '9258407c8ea67b1e5d97bd04214ed6f8';
const stringSession = new StringSession('');

async function main() {
  console.log('Connecting to Telegram MTProto...');
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  try {
    await client.connect();
    console.log('✅ Connected successfully to Telegram MTProto servers!');
    const isAuth = await client.isUserAuthorized();
    console.log('Is user authorized?', isAuth);
    await client.disconnect();
    console.log('Disconnected cleanly.');
  } catch (err) {
    console.error('❌ Connection error:', err);
  }
}

main();
