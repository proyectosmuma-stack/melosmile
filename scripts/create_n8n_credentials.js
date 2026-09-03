/**
 * create_n8n_credentials.js — Crea credenciales en n8n (dev y prod)
 *
 * MODO RECUPERACIÓN: crea todas las credenciales de los flujos n8n.
 * Los VALORES (secretos) se leen de variables de entorno — NUNCA se
 * hardcodean en este archivo ni se imprimen.
 *
 * USO:
 *   # cargar secretos desde un archivo .env.secrets local (chmod 600) o exportados
 *   set -a; source .env.secrets; set +a
 *   node scripts/create_n8n_credentials.js --dev
 *   node scripts/create_n8n_credentials.js --prod
 *   node scripts/create_n8n_credentials.js --all
 *
 * Las credenciales se crean SOLO si no existen ya (por nombre) para no duplicar.
 * Ejemplo de variables a definir en .env.secrets (valores de ejemplo NO reales):
 *   OPENROUTER_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
 *   SERPAPI_API_KEY, META_APP_TOKEN, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
 *   GOOGLE_REDIRECT_URI, GMAIL_MUMALEADS, GMAIL_MUMALEADS_PASS,
 *   GMAIL_MCALLOS83, GMAIL_MCALLOS83_PASS, TELEGRAM_BOT_TOKEN
 */

const fs = require('fs');
const path = require('path');

const CRED_NAME_PREFIX = process.env.CRED_PREFIX || 'Melosmile';

// --- Configuración de instancias ---
// dev: n8n.mumaweb.com  |  prod: n8nv2.mumaweb.com
const INSTANCES = {
  dev: {
    base: process.env.N8N_DEV_URL || 'https://n8n.mumaweb.com',
    keyFile: process.env.N8N_DEV_KEY || path.join(require('os').homedir(), '.config/opencode/secrets/n8n-dev.jwt'),
  },
  prod: {
    base: process.env.N8N_PROD_URL || 'https://n8nv2.mumaweb.com',
    keyFile: process.env.N8N_PROD_KEY || path.join(require('os').homedir(), '.config/opencode/secrets/n8n.jwt'),
  },
};

function getKey(file) {
  try {
    return fs.readFileSync(file, 'utf8').trim();
  } catch (e) {
    throw new Error(`No se pudo leer la clave n8n en ${file}: ${e.message}`);
  }
}

async function api(base, keyFile, method, path, body) {
  const key = getKey(keyFile);
  const res = await fetch(`${base}/api/v1${path}`, {
    method,
    headers: {
      'X-N8N-API-KEY': key,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data && data.message ? data.message : JSON.stringify(data);
    throw new Error(`${method} ${path} -> ${res.status}: ${msg}`);
  }
  return data;
}

// --- Definición de credenciales a crear (tipo + campos desde env) ---
// Activa solo las que tengan su valor definido en el entorno.
function buildCredentials(env) {
  const creds = [];

  // OpenRouter (6 flujos MELOSMILE + OCR) — REQUERIDO
  if (env.OPENROUTER_API_KEY) {
    creds.push({ name: 'OpenRouter account', type: 'openRouterApi', data: { apiKey: env.OPENROUTER_API_KEY } });
  }

  // Stripe
  if (env.STRIPE_SECRET_KEY) {
    creds.push({
      name: 'Stripe',
      type: 'stripeApi',
      data: {
        secretKey: env.STRIPE_SECRET_KEY,
        signatureSecret: env.STRIPE_WEBHOOK_SECRET || '',
      },
    });
  }

  // SerpApi
  if (env.SERPAPI_API_KEY) {
    creds.push({ name: 'SerpApi', type: 'serpApi', data: { apiKey: env.SERPAPI_API_KEY } });
  }

  // Meta / Facebook (Graph App)
  if (env.META_APP_TOKEN) {
    creds.push({
      name: 'Meta/Facebook',
      type: 'facebookGraphAppApi',
      data: { accessToken: env.META_APP_TOKEN, appSecret: env.META_APP_SECRET || '' },
    });
  }

  // Google OAuth2 (mumaLeads)
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    creds.push({
      name: 'Google OAuth2 (mumaLeads)',
      type: 'googleOAuth2Api',
      data: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        scope: env.GOOGLE_OAUTH_SCOPE || 'https://www.googleapis.com/auth/gmail.readonly',
        serverUrl: '',
        sendAdditionalBodyProperties: false,
        additionalBodyProperties: {},
      },
    });
  }

  // Google IMAP — cuenta mumaleads@gmail.com (mumaLead-IMAP-PROD)
  if (env.GMAIL_MUMALEADS && env.GMAIL_MUMALEADS_PASS) {
    creds.push({
      name: 'IMAP mumaleads',
      type: 'imap',
      data: {
        user: env.GMAIL_MUMALEADS,
        password: env.GMAIL_MUMALEADS_PASS,
        host: env.IMAP_HOST || 'imap.gmail.com',
        port: Number(env.IMAP_PORT) || 993,
        secure: true,
      },
    });
  }

  // Google IMAP — cuenta mcallaos83@gmail.com
  if (env.GMAIL_MCALLOS83 && env.GMAIL_MCALLOS83_PASS) {
    creds.push({
      name: 'IMAP mcallaos83',
      type: 'imap',
      data: {
        user: env.GMAIL_MCALLOS83,
        password: env.GMAIL_MCALLOS83_PASS,
        host: env.IMAP_HOST || 'imap.gmail.com',
        port: Number(env.IMAP_PORT) || 993,
        secure: true,
      },
    });
  }

  // Telegram
  if (env.TELEGRAM_BOT_TOKEN) {
    creds.push({ name: 'Telegram Bot', type: 'telegramApi', data: { accessToken: env.TELEGRAM_BOT_TOKEN } });
  }

  return creds;
}

async function createMissing(base, keyFile, creds) {
  const existing = await api(base, keyFile, 'GET', '/credentials');
  const existingNames = new Set((existing.data || []).map((c) => c.name));
  const created = [];
  const skipped = [];

  for (const c of creds) {
    const finalName = `${CRED_NAME_PREFIX} ${c.name}`;
    if (existingNames.has(finalName)) {
      skipped.push(finalName);
      continue;
    }
    const body = { name: finalName, type: c.type, data: c.data };
    try {
      const r = await api(base, keyFile, 'POST', '/credentials', body);
      created.push({ name: finalName, id: r.id });
      existingNames.add(finalName); // evitar dup en el mismo ciclo
    } catch (e) {
      console.error(`  ✗ Error creando "${finalName}": ${e.message}`);
    }
  }
  return { created, skipped };
}

async function main() {
  const targets = process.argv.slice(2);
  const doAll = targets.includes('--all');
  const doDev = doAll || targets.includes('--dev');
  const doProd = doAll || targets.includes('--prod');

  if (!doDev && !doProd) {
    console.error('Uso: node create_n8n_credentials.js [--dev] [--prod] [--all]');
    process.exit(1);
  }

  const creds = buildCredentials(process.env);
  if (creds.length === 0) {
    console.error('❌ No hay credenciales para crear: ninguna variable de entorno definida.');
    console.error('Carga tu .env.secrets antes (set -a; source .env.secrets; set +a)');
    process.exit(1);
  }

  console.log(`📦 Se crearán ${creds.length} credenciales:`);
  for (const c of creds) console.log(`   - ${CRED_NAME_PREFIX} ${c.name} (${c.type})`);

  if (doDev) {
    console.log(`\n🟢 n8n-DEV (${INSTANCES.dev.base})`);
    const r = await createMissing(INSTANCES.dev.base, INSTANCES.dev.keyFile, creds);
    console.log(`   Creadas: ${r.created.length} | Omitidas (ya existían): ${r.skipped.length}`);
    r.created.forEach((c) => console.log(`   ✅ ${c.name} -> ${c.id}`));
    r.skipped.forEach((c) => console.log(`   ⏭ ${c}`));
  }

  if (doProd) {
    console.log(`\n🔴 n8n-PROD (${INSTANCES.prod.base})`);
    const r = await createMissing(INSTANCES.prod.base, INSTANCES.prod.keyFile, creds);
    console.log(`   Creadas: ${r.created.length} | Omitidas (ya existían): ${r.skipped.length}`);
    r.created.forEach((c) => console.log(`   ✅ ${c.name} -> ${c.id}`));
    r.skipped.forEach((c) => console.log(`   ⏭ ${c}`));
  }
}

main().catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
