/**
 * n8n-wf-create.mjs — Crea (o actualiza) un workflow n8n a partir de un fichero JSON.
 * Uso: node scripts/n8n-wf-create.mjs <dev|prod> <file.json> [--activate] [--update <workflowId>]
 * El fichero debe contener { name, nodes, connections, settings? }. Se elimina `description` (REST la rechaza).
 * Imprime solo 1 línea JSON de resumen. Zero-token, determinista.
 */
import fs from 'fs';
import os from 'os';

const ENVS = {
  dev: { base: 'https://n8n.mumaweb.com', keyFile: `${os.homedir()}/.config/opencode/secrets/n8n-api-dev.key` },
  prod: { base: 'https://n8nv2.mumaweb.com', keyFile: `${os.homedir()}/.config/opencode/secrets/n8n-api-prod.key` },
};

const [, , env, file, ...flags] = process.argv;
const cfg = ENVS[env];
if (!cfg || !file) { console.log('Usage: node n8n-wf-create.mjs <dev|prod> <file.json> [--activate] [--update <id>]'); process.exit(1); }
const activate = flags.includes('--activate');
const updIdx = flags.indexOf('--update');
const updateId = updIdx >= 0 ? flags[updIdx + 1] : null;

const apiKey = fs.readFileSync(cfg.keyFile, 'utf8').trim();
const H = { 'X-N8N-API-KEY': apiKey, 'Content-Type': 'application/json' };

const wf = JSON.parse(fs.readFileSync(file, 'utf8'));
const payload = { name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings || {} };

const url = updateId ? `${cfg.base}/api/v1/workflows/${updateId}` : `${cfg.base}/api/v1/workflows`;
const res = await fetch(url, { method: updateId ? 'PUT' : 'POST', headers: H, body: JSON.stringify(payload) });
const txt = await res.text();
if (!res.ok) { console.error(JSON.stringify({ status: 'error', http: res.status, detail: txt.slice(0, 400) })); process.exit(1); }
let created = JSON.parse(txt);

if (activate && !updateId) {
  const ar = await fetch(`${cfg.base}/api/v1/workflows/${created.id}/activate`, { method: 'POST', headers: H });
  created.active = ar.ok;
}

console.log(JSON.stringify({ status: 'ok', env, action: updateId ? 'update' : 'create', id: created.id, name: created.name, active: created.active, nodes: (created.nodes || []).length }));
