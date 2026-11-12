import fs from 'fs';
import os from 'os';

const ENVS = {
  dev: { base: "https://n8n.mumaweb.com", keyFile: `${os.homedir()}/.config/opencode/secrets/n8n-api-dev.key` },
  prod: { base: "https://n8nv2.mumaweb.com", keyFile: `${os.homedir()}/.config/opencode/secrets/n8n-api-prod.key` }
};

async function callN8nApi(env, path) {
  const config = ENVS[env];
  if (!config) throw new Error(`Environment ${env} not found.`);
  const apiKey = fs.readFileSync(config.keyFile, 'utf8').trim();
  const res = await fetch(`${config.base}${path}`, {
    headers: { 'Content-Type': 'application/json', 'X-N8N-API-KEY': apiKey },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`HTTP ${res.status}: ${t.substring(0, 300)}`);
  }
  return res.json();
}

async function dump(env, executionId, nodeFilter) {
  try {
    const data = await callN8nApi(env, `/api/v1/executions/${executionId}?includeData=true`);
    const rd = data?.data?.resultData?.runData || data?.resultData?.runData || {};

    if (Object.keys(rd).length === 0) {
      console.log(JSON.stringify({
        status: "ok",
        id: data.id ?? executionId,
        exec_status: data.status ?? null,
        note: "runData vacío",
        top_keys: Object.keys(data || {}),
        data_keys: data?.data ? Object.keys(data.data) : null,
      }));
      process.exit(0);
    }

    console.log(JSON.stringify({
      status: "ok",
      id: data.id ?? executionId,
      exec_status: data.status ?? null,
      startedAt: data.startedAt ?? null,
      stoppedAt: data.stoppedAt ?? null,
      nodes: Object.entries(rd).map(([name, runs]) => ({
        name,
        exec_ms: runs?.[0]?.executionTime ?? null,
        error: runs?.[0]?.error?.message ?? null,
      })),
    }));

    if (nodeFilter) {
      const runs = rd[nodeFilter];
      const out = runs?.[0]?.data?.main?.[0]?.map((x) => x.json) ?? null;
      console.log(JSON.stringify({
        node: nodeFilter,
        output: JSON.stringify(out).slice(0, 3500),
      }));
    }
    process.exit(0);
  } catch (error) {
    console.error(JSON.stringify({ status: "error", message: error.message }));
    process.exit(1);
  }
}

const [, , command, env, executionId, nodeFilter] = process.argv;

if (command !== 'dump' || !env || !executionId) {
  console.log("Usage: node n8n-exec-dump.mjs dump <dev|prod> <executionId> [nodeFilter]");
  process.exit(1);
}
if (!ENVS[env]) {
  console.error(JSON.stringify({ status: "error", message: `Invalid env: ${env}` }));
  process.exit(1);
}

dump(env, executionId, nodeFilter);
