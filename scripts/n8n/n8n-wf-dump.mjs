/**
 * n8n-wf-dump.mjs — Dump determinista (zero-token) de un workflow n8n a scratch/.
 * Uso: node scripts/n8n-wf-dump.mjs <dev|prod> <workflowId> [outFile]
 * No imprime el JSON: solo escribe a fichero y devuelve 1 línea de resumen.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

const ENVS = {
  dev: { base: 'https://n8n.mumaweb.com', keyFile: `${os.homedir()}/.config/opencode/secrets/n8n-api-dev.key` },
  prod: { base: 'https://n8nv2.mumaweb.com', keyFile: `${os.homedir()}/.config/opencode/secrets/n8n-api-prod.key` },
};

const [, , env, workflowId, outArg] = process.argv;
const cfg = ENVS[env];
if (!cfg || !workflowId) {
  console.log('Usage: node n8n-wf-dump.mjs <dev|prod> <workflowId> [outFile]');
  process.exit(1);
}

const apiKey = fs.readFileSync(cfg.keyFile, 'utf8').trim();
const res = await fetch(`${cfg.base}/api/v1/workflows/${workflowId}`, {
  headers: { 'X-N8N-API-KEY': apiKey, 'Content-Type': 'application/json' },
});
if (!res.ok) {
  console.error(JSON.stringify({ status: 'error', http: res.status, detail: (await res.text()).slice(0, 200) }));
  process.exit(1);
}
const wf = await res.json();

const outDir = path.join(os.homedir(), 'Antigravity Projects/melosmile/scratch/n8n-dumps');
fs.mkdirSync(outDir, { recursive: true });
const outFile = outArg || path.join(outDir, `${env}-${workflowId}.json`);
const payload = {
  id: wf.id, name: wf.name, active: wf.active,
  nodes: wf.nodes || [], connections: wf.connections || {}, settings: wf.settings || {},
};
fs.writeFileSync(outFile, JSON.stringify(payload, null, 2));

const edges = Object.entries(payload.connections).length;
console.log(JSON.stringify({
  status: 'ok', env, workflowId, name: wf.name,
  node_count: payload.nodes.length,
  connection_sources: edges,
  out_file: outFile,
  node_names: payload.nodes.map((n) => n.name),
}));
