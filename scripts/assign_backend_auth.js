/**
 * assign_backend_auth.js — Asigna la credencial httpHeaderAuth "Melosmile Backend x-api-key"
 * a todos los toolHttpRequest de los sub-agentes MELOSMILE que apuntan al backend MeloSmile
 * (URLs que contienen "melosmile-staging-git-develop" o la base de API del backend).
 *
 * El middleware de Next.js exige header "x-api-key" en /api/*. Estos tools no lo enviaban
 * (401) → causa raíz del fallo de agendamiento/consultas. Se corrige asignando la credencial.
 *
 * USO: node assign_backend_auth.js            # prod (default)
 *      node assign_backend_auth.js --dev      # dev
 */
const fs = require('fs');
const os = require('os');

const isDev = process.argv.includes('--dev');
const BASE = process.env.N8N_URL || (isDev ? 'https://n8n.mumaweb.com' : 'https://n8nv2.mumaweb.com');
const KEY = fs
  .readFileSync(process.env.N8N_KEY || `${os.homedir()}/.config/opencode/secrets/${isDev ? 'n8n-dev.jwt' : 'n8n.jwt'}`, 'utf8')
  .trim();

// Prod: q89OrBKkoecwqBNi | Dev: u1IDo2GbaYfStbE3
const CRED_ID = process.env.CRED_ID || (isDev ? 'u1IDo2GbaYfStbE3' : 'q89OrBKkoecwqBNi');
const CRED_NAME = 'Melosmile Backend x-api-key';

// Sub-agentes con tools que apuntan al backend MeloSmile
const WFS = [
  ['d74hAW8IkmmCqoh5', '[MELOSMILE] Sub-Agent: Agendamiento'],
  ['WNViucEUuhzigYtE', '[MELOSMILE] Sub-Agent: Clinico'],
  ['inakl5N4ROrmmrFh', '[MELOSMILE] Sub-Agent: Contabilidad'],
  ['T5FvJ4PMcHKp1gBa', '[MELOSMILE] Sub-Agent: General'],
];

const H = { 'X-N8N-API-KEY': KEY, 'Content-Type': 'application/json' };

async function api(wid, method, body) {
  const res = await fetch(`${BASE}/api/v1/workflows/${wid}`, {
    method,
    headers: H,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${wid} -> ${res.status}: ${data && data.message}`);
  return data;
}

async function main() {
  console.log(`🎯 Asignando credencial httpHeaderAuth (${CRED_ID}) a tools del backend en ${BASE}`);
  let total = 0;
  for (const [id, name] of WFS) {
    try {
      const wf = await api(id, 'GET');
      let changed = 0;
      for (const n of wf.nodes) {
        if (n.type !== '@n8n/n8n-nodes-langchain.toolHttpRequest') continue;
        const url = (n.parameters && n.parameters.url) || '';
        // Solo tools que apuntan al backend MeloSmile (NO Odoo)
        if (url.includes('melosmile-staging-git-develop') || url.includes('agenda.melosmile.com') || url.includes('/api/')) {
          if (JSON.stringify(n.credentials || {}) !== JSON.stringify({ httpHeaderAuth: { id: CRED_ID, name: CRED_NAME } })) {
            n.credentials = { httpHeaderAuth: { id: CRED_ID, name: CRED_NAME } };
            changed++;
          }
        }
      }
      if (changed === 0) {
        console.log(`  ⏭ ${name}: sin cambios (${id})`);
        continue;
      }
      const { name: wfName, nodes, connections, settings } = wf;
      await api(id, 'PUT', { name: wfName, nodes, connections, settings });
      total += changed;
      console.log(`  ✅ ${name}: ${changed} tool(s) con httpHeaderAuth (${id})`);
    } catch (e) {
      console.error(`  ✗ ${name} (${id}): ${e.message}`);
    }
  }
  console.log(`--- Fin. ${total} tool(s) actualizados ---`);
}

main().catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
