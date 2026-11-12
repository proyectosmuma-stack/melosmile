/**
 * n8n-wf-admin.mjs — Operaciones administrativas sobre un workflow n8n.
 * Uso: node scripts/n8n-wf-admin.mjs <dev|prod> <action> <workflowId> [value]
 *   actions: rename <newName> | deactivate | activate | delete | path <newPath>
 * Zero-token, determinista. Imprime 1 línea JSON.
 */
import fs from 'fs';
import os from 'os';

const ENVS = {
  dev: { base: 'https://n8n.mumaweb.com', keyFile: `${os.homedir()}/.config/opencode/secrets/n8n-api-dev.key` },
  prod: { base: 'https://n8nv2.mumaweb.com', keyFile: `${os.homedir()}/.config/opencode/secrets/n8n-api-prod.key` },
};
const [, , env, action, id, value] = process.argv;
const cfg = ENVS[env];
if (!cfg || !action || !id) { console.log('Usage: node n8n-wf-admin.mjs <dev|prod> <rename|deactivate|activate|delete|path> <id> [value]'); process.exit(1); }
const H = { 'X-N8N-API-KEY': fs.readFileSync(cfg.keyFile, 'utf8').trim(), 'Content-Type': 'application/json' };
const get = async () => (await fetch(`${cfg.base}/api/v1/workflows/${id}`, { headers: H })).json();

if (action === 'delete') {
  const r = await fetch(`${cfg.base}/api/v1/workflows/${id}`, { method: 'DELETE', headers: H });
  console.log(JSON.stringify({ status: r.ok ? 'ok' : 'error', env, action, id, http: r.status }));
  process.exit(r.ok ? 0 : 1);
}
if (action === 'deactivate' || action === 'activate') {
  const r = await fetch(`${cfg.base}/api/v1/workflows/${id}/${action}`, { method: 'POST', headers: H });
  console.log(JSON.stringify({ status: r.ok ? 'ok' : 'error', env, action, id, http: r.status }));
  process.exit(r.ok ? 0 : 1);
}

const wf = await get();
if (action === 'rename') wf.name = value;
if (action === 'path') {
  const wh = wf.nodes.find((n) => n.type === 'n8n-nodes-base.webhook');
  if (!wh) { console.error(JSON.stringify({ status: 'error', message: 'no webhook node' })); process.exit(1); }
  wh.parameters.path = value;
}
const r = await fetch(`${cfg.base}/api/v1/workflows/${id}`, { method: 'PUT', headers: H, body: JSON.stringify({ name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings }) });
const v = await get();
console.log(JSON.stringify({ status: r.ok ? 'ok' : 'error', env, action, id, http: r.status, name: v.name, active: v.active, path: v.nodes.find((n) => n.type === 'n8n-nodes-base.webhook')?.parameters.path }));
