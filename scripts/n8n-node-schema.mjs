/**
 * n8n-node-schema.mjs — Descubre el esquema real (properties) de un tipo de nodo en la instancia.
 * Uso: node scripts/n8n-node-schema.mjs <dev|prod> <nodeType>
 * Zero-token: filtra y devuelve solo el esquema del nodo pedido.
 */
import fs from 'fs';
import os from 'os';

const ENVS = {
  dev: { base: 'https://n8n.mumaweb.com', keyFile: `${os.homedir()}/.config/opencode/secrets/n8n-api-dev.key` },
  prod: { base: 'https://n8nv2.mumaweb.com', keyFile: `${os.homedir()}/.config/opencode/secrets/n8n-api-prod.key` },
};
const [, , env, nodeType] = process.argv;
const cfg = ENVS[env];
if (!cfg || !nodeType) { console.log('Usage: node n8n-node-schema.mjs <dev|prod> <nodeType>'); process.exit(1); }
const apiKey = fs.readFileSync(cfg.keyFile, 'utf8').trim();

const candidates = ['/types/nodes.json', '/rest/node-types', '/api/v1/node-types'];
let nodes = null, used = null;
for (const p of candidates) {
  try {
    const r = await fetch(`${cfg.base}${p}`, { headers: { 'X-N8N-API-KEY': apiKey } });
    if (!r.ok) continue;
    const j = await r.json();
    const arr = Array.isArray(j) ? j : (j.data || j.nodeTypes || null);
    if (Array.isArray(arr)) { nodes = arr; used = p; break; }
  } catch { /* next */ }
}
if (!nodes) { console.log(JSON.stringify({ status: 'error', message: 'no schema endpoint' })); process.exit(1); }

const shortName = nodeType.split('.').pop();
const hit = nodes.find((n) => n.name === nodeType || n.name === `n8n-nodes-base.${shortName}`);
if (!hit) {
  const near = nodes.filter((n) => (n.name || '').includes(shortName)).map((n) => n.name).slice(0, 10);
  console.log(JSON.stringify({ status: 'not_found', endpoint: used, nodeType, near, total: nodes.length }));
  process.exit(0);
}
console.log(JSON.stringify({
  status: 'ok', endpoint: used, name: hit.name, version: hit.version,
  defaults: hit.defaults,
  properties: (hit.properties || []).map((p) => ({ name: p.name, type: p.type, default: p.default, options: p.options, displayOptions: p.displayOptions })),
}));
