/**
 * n8n-c1-cutover.mjs — Cutover controlado del Dispatcher PROD al grafo C1 (Router Puro).
 * Uso: node scripts/n8n-c1-cutover.mjs prod <oldWorkflowId> <newWorkflowId> [--rollback]
 *  - normal:   backup → deactivate old → deactivate new → set new path=melosmile-dispatcher → activate new
 *  - rollback: backup → deactivate new → activate old (recupera el path original)
 * Zero-token, determinista. Imprime 1 línea JSON de resumen.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

const ENVS = {
  dev: { base: 'https://n8n.mumaweb.com', keyFile: `${os.homedir()}/.config/opencode/secrets/n8n-api-dev.key` },
  prod: { base: 'https://n8nv2.mumaweb.com', keyFile: `${os.homedir()}/.config/opencode/secrets/n8n-api-prod.key` },
};
const [, , env, oldId, newId, flag] = process.argv;
const cfg = ENVS[env];
if (!cfg || !oldId || !newId) { console.log('Usage: node n8n-c1-cutover.mjs <dev|prod> <oldId> <newId> [--rollback]'); process.exit(1); }
const rollback = flag === '--rollback';
const apiKey = fs.readFileSync(cfg.keyFile, 'utf8').trim();
const H = { 'X-N8N-API-KEY': apiKey, 'Content-Type': 'application/json' };
const get = async (id) => (await fetch(`${cfg.base}/api/v1/workflows/${id}`, { headers: H })).json();
const post = async (id, action) => { const r = await fetch(`${cfg.base}/api/v1/workflows/${id}/${action}`, { method: 'POST', headers: H }); return r.ok; };
const put = async (wf) => {
  const r = await fetch(`${cfg.base}/api/v1/workflows/${wf.id}`, { method: 'PUT', headers: H, body: JSON.stringify({ name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings }) });
  return r.ok;
};

const backupDir = path.join(os.homedir(), 'Antigravity Projects/melosmile/scratch/n8n-backups');
fs.mkdirSync(backupDir, { recursive: true });
const ts = new Date().toISOString().replace(/:/g, '-');
const oldWf = await get(oldId);
const newWf = await get(newId);
fs.writeFileSync(path.join(backupDir, `${env}-${oldId}-preCutover-${ts}.json`), JSON.stringify(oldWf, null, 2));
fs.writeFileSync(path.join(backupDir, `${env}-${newId}-preCutover-${ts}.json`), JSON.stringify(newWf, null, 2));

const whName = newWf.nodes.find((n) => n.type === 'n8n-nodes-base.webhook')?.name;
const result = { status: 'ok', env, mode: rollback ? 'rollback' : 'cutover', steps: [] };

if (rollback) {
  result.steps.push(['deactivate_new', await post(newId, 'deactivate')]);
  result.steps.push(['activate_old', await post(oldId, 'activate')]);
} else {
  result.steps.push(['deactivate_old', await post(oldId, 'deactivate')]);
  result.steps.push(['deactivate_new', await post(newId, 'deactivate')]);
  const fresh = await get(newId);
  fresh.nodes.find((n) => n.name === whName).parameters.path = 'melosmile-dispatcher';
  result.steps.push(['set_path', await put(fresh)]);
  result.steps.push(['activate_new', await post(newId, 'activate')]);
}

const vOld = await get(oldId);
const vNew = await get(newId);
result.old = { id: oldId, active: vOld.active, path: vOld.nodes.find((n) => n.type === 'n8n-nodes-base.webhook')?.parameters.path };
result.new = { id: newId, active: vNew.active, path: vNew.nodes.find((n) => n.type === 'n8n-nodes-base.webhook')?.parameters.path };
result.backups = [path.join(backupDir, `${env}-${oldId}-preCutover-${ts}.json`), path.join(backupDir, `${env}-${newId}-preCutover-${ts}.json`)];
console.log(JSON.stringify(result));
