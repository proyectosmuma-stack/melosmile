/**
 * n8n-find-node.mjs — Busca qué workflows (de una instancia) usan un tipo de nodo.
 * Uso: node scripts/n8n-find-node.mjs <dev|prod> <nodeType> [--dump <outFile>]
 * Imprime solo 1 línea por coincidencia + (opcional) vuelca el workflow completo a fichero.
 * Zero-token, determinista.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

const ENVS = {
  dev: { base: 'https://n8n.mumaweb.com', keyFile: `${os.homedir()}/.config/opencode/secrets/n8n-api-dev.key` },
  prod: { base: 'https://n8nv2.mumaweb.com', keyFile: `${os.homedir()}/.config/opencode/secrets/n8n-api-prod.key` },
};

const [, , env, nodeType, flag, outArg] = process.argv;
const cfg = ENVS[env];
if (!cfg || !nodeType) {
  console.log('Usage: node n8n-find-node.mjs <dev|prod> <nodeType> [--dump <outFile>]');
  process.exit(1);
}
const apiKey = fs.readFileSync(cfg.keyFile, 'utf8').trim();
const H = { 'X-N8N-API-KEY': apiKey, 'Content-Type': 'application/json' };

const listRes = await fetch(`${cfg.base}/api/v1/workflows?limit=250`, { headers: H });
if (!listRes.ok) { console.error(JSON.stringify({ status: 'error', http: listRes.status })); process.exit(1); }
const list = await listRes.json();

const hits = [];
for (const wf of list.data || []) {
  const r = await fetch(`${cfg.base}/api/v1/workflows/${wf.id}`, { headers: H });
  if (!r.ok) continue;
  const full = await r.json();
  const matched = (full.nodes || []).filter((n) => n.type === nodeType);
  if (matched.length) {
    hits.push({ id: full.id, name: full.name, nodes: matched.map((n) => n.name) });
    if (flag === '--dump') {
      const outDir = path.join(os.homedir(), 'Antigravity Projects/melosmile/scratch/n8n-dumps');
      fs.mkdirSync(outDir, { recursive: true });
      const f = outArg || path.join(outDir, `${env}-${full.id}.json`);
      fs.writeFileSync(f, JSON.stringify({ id: full.id, name: full.name, nodes: full.nodes, connections: full.connections, settings: full.settings }, null, 2));
    }
  }
}
console.log(JSON.stringify({ status: 'ok', env, nodeType, count: hits.length, hits }));
