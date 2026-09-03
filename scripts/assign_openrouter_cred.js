/**
 * assign_openrouter_cred.js — Reapunta la credencial OpenRouter a los nodos
 * de los 6 workflows MELOSMILE en n8n (PROD por defecto, o --dev).
 *
 * Corrige el ID antiguo (4nco5fDnIohG6g9f) por el ID nuevo de la credencial
 * "Melosmile OpenRouter account" (openRouterApi) creada en modo recuperación.
 *
 * USO:
 *   node assign_openrouter_cred.js            # prod (usa n8n.jwt)
 *   N8N_URL=<base> N8N_KEY=<jwt> node assign_openrouter_cred.js
 */
const fs = require('fs');
const os = require('os');

const isDev = process.argv.includes('--dev');
const BASE = process.env.N8N_URL || (isDev ? 'https://n8n.mumaweb.com' : 'https://n8nv2.mumaweb.com');
const KEY = fs
  .readFileSync(process.env.N8N_KEY || `${os.homedir()}/.config/opencode/secrets/${isDev ? 'n8n-dev.jwt' : 'n8n.jwt'}`, 'utf8')
  .trim();

// Nuevo ID de la credencial OpenRouter (según entorno)
// prod: gUxVRtGMJgLk9JTl   |  dev: BJLYXwgRZghL30sv
const NEW_ID = process.env.CRED_ID || (isDev ? 'BJLYXwgRZghL30sv' : 'gUxVRtGMJgLk9JTl');
const CRED_NAME = 'Melosmile OpenRouter account';

// Los 6 workflows MELOSMILE
const WFS = [
  ['5xjgNTJ86tMQ09rP', '[MELOSMILE] AI Dispatcher'],
  ['d74hAW8IkmmCqoh5', '[MELOSMILE] Sub-Agent: Agendamiento'],
  ['WNViucEUuhzigYtE', '[MELOSMILE] Sub-Agent: Clinico'],
  ['inakl5N4ROrmmrFh', '[MELOSMILE] Sub-Agent: Contabilidad'],
  ['T5FvJ4PMcHKp1gBa', '[MELOSMILE] Sub-Agent: General'],
  ['W4yPIa4pWCZfqFir', '[MELOSMILE] Agent Document Cleaner'],
];

const H = { 'X-N8N-API-KEY': KEY, 'Content-Type': 'application/json' };

async function api(workflowId, method, body) {
  const res = await fetch(`${BASE}/api/v1/workflows/${workflowId}`, {
    method,
    headers: H,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${workflowId} -> ${res.status}: ${data && data.message}`);
  return data;
}

async function main() {
  console.log(`🎯 Reapuntando credencial OpenRouter a ${NEW_ID} en ${BASE}`);
  for (const [id, name] of WFS) {
    try {
      const wf = await api(id, 'GET');
      let changed = 0;
      for (const n of wf.nodes) {
        const isModel = typeof n.type === 'string' && n.type.includes('lmChatOpenRouter');
        const isOCR = n.type === 'n8n-nodes-base.httpRequest' &&
          n.parameters && n.parameters.nodeCredentialType === 'openRouterApi';
        if (isModel || isOCR) {
          n.credentials = { openRouterApi: { id: NEW_ID, name: CRED_NAME } };
          changed++;
        }
      }
      if (changed === 0) {
        console.log(`  ⏭ ${name}: sin nodo OpenRouter (${id})`);
        continue;
      }
      const { name: wfName, nodes, connections, settings } = wf;
      await api(id, 'PUT', { name: wfName, nodes, connections, settings });
      console.log(`  ✅ ${name}: ${changed} nodo(s) asignado(s) (${id})`);
    } catch (e) {
      console.error(`  ✗ ${name} (${id}): ${e.message}`);
    }
  }
  console.log('--- Fin ---');
}

main().catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
