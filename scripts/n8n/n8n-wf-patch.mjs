/**
 * n8n-wf-patch.mjs — Editor determinista de workflows n8n desde un fichero JSON de parche.
 * Uso: node scripts/n8n-wf-patch.mjs <dev|prod> <workflowId> <patchFile>
 * Parche:
 * {
 *   "setNodes":    [{ "name": "<nodo>", "parameters": {...}, "credentials": {...}?, "disabled": bool? }],
 *   "addNodes":    [ <nodeDef completo> ],
 *   "deleteNodes": ["<nodo>", ...],
 *   "connections": { "<nodoOrigen>": { "main": [ [ {node,type,index} ], ... ] } }   // reemplaza SOLO ese origen
 * }
 * Hace backup, aplica, verifica y devuelve 1 línea JSON. Zero-token.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

const ENVS = {
  dev: { base: 'https://n8n.mumaweb.com', keyFile: `${os.homedir()}/.config/opencode/secrets/n8n-api-dev.key` },
  prod: { base: 'https://n8nv2.mumaweb.com', keyFile: `${os.homedir()}/.config/opencode/secrets/n8n-api-prod.key` },
};
const [, , env, workflowId, patchFile] = process.argv;
const cfg = ENVS[env];
if (!cfg || !workflowId || !patchFile) { console.log('Usage: node n8n-wf-patch.mjs <dev|prod> <workflowId> <patchFile>'); process.exit(1); }
const H = { 'X-N8N-API-KEY': fs.readFileSync(cfg.keyFile, 'utf8').trim(), 'Content-Type': 'application/json' };
const patch = JSON.parse(fs.readFileSync(patchFile, 'utf8'));

const wf = await (await fetch(`${cfg.base}/api/v1/workflows/${workflowId}`, { headers: H })).json();
const backupDir = path.join(os.homedir(), 'Antigravity Projects/melosmile/scratch/n8n-backups');
fs.mkdirSync(backupDir, { recursive: true });
const ts = new Date().toISOString().replace(/:/g, '-');
fs.writeFileSync(path.join(backupDir, `${env}-${workflowId}-prePatch-${ts}.json`), JSON.stringify(wf, null, 2));

const applied = [];
for (const spec of patch.setNodes || []) {
  const n = wf.nodes.find((x) => x.name === spec.name);
  if (!n) { console.error(JSON.stringify({ status: 'error', message: `setNodes: nodo ${spec.name} no existe` })); process.exit(1); }
  if (spec.parameters) n.parameters = spec.parameters;
  if (spec.credentials) n.credentials = spec.credentials;
  if (spec.disabled !== undefined) n.disabled = spec.disabled;
  applied.push(`set:${spec.name}`);
}
for (const name of patch.deleteNodes || []) {
  wf.nodes = wf.nodes.filter((x) => x.name !== name);
  delete wf.connections[name];
  applied.push(`del:${name}`);
}
for (const def of patch.addNodes || []) {
  const i = wf.nodes.findIndex((x) => x.name === def.name);
  if (i === -1) wf.nodes.push(def); else wf.nodes[i] = def;
  applied.push(`add:${def.name}`);
}
for (const [src, conn] of Object.entries(patch.connections || {})) {
  wf.connections[src] = conn;
  applied.push(`conn:${src}`);
}

const r = await fetch(`${cfg.base}/api/v1/workflows/${workflowId}`, {
  method: 'PUT', headers: H,
  body: JSON.stringify({ name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings }),
});
if (!r.ok) { console.error(JSON.stringify({ status: 'error', http: r.status, detail: (await r.text()).slice(0, 300) })); process.exit(1); }

const v = await (await fetch(`${cfg.base}/api/v1/workflows/${workflowId}`, { headers: H })).json();
console.log(JSON.stringify({
  status: 'ok', env, workflowId, name: v.name, active: v.active,
  node_count: v.nodes.length, applied,
  backup: path.join(backupDir, `${env}-${workflowId}-prePatch-${ts}.json`),
}));
