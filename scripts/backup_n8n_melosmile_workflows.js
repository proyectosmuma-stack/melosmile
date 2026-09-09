/**
 * Backup de flujos del sistema Melosmile en n8n
 * ---------------------------------------------
 * Exporta los workflows [MELOSMILE]* de AMBAS instancias n8n:
 *   - dev-n8n    (https://n8n.mumaweb.com)   → instancia de trabajo/pruebas por defecto (NO se sube a producción)
 *   - prod-n8nv2 (https://n8nv2.mumaweb.com) → instancia de producción estable (solo lectura para backup)
 *
 * Uso: node scripts/backup_n8n_melosmile_workflows.js
 * Salida: n8n-workflows/melosmile/backups/YYYY-MM-DD/<instancia>/NN-<nombre>.json
 */
const fs = require('fs');
const path = require('path');

// Leer API keys desde mcp_config.json (patrón del repo)
let mcpConfig = {};
try {
  mcpConfig = JSON.parse(
    fs.readFileSync(path.join(process.env.HOME, '.gemini/config/mcp_config.json'), 'utf8')
  );
} catch (e) {
  console.warn('Could not read mcp_config.json', e.message);
}

const INSTANCIAS = [
  {
    instancia: 'dev-n8n',
    url: 'https://n8n.mumaweb.com',
    key: mcpConfig?.mcpServers?.['n8n-mcp']?.env?.N8N_API_KEY || '',
  },
  {
    instancia: 'prod-n8nv2',
    url: 'https://n8nv2.mumaweb.com',
    key: mcpConfig?.mcpServers?.['n8nv2-mcp']?.env?.N8N_API_KEY || '',
  },
];

async function apiRequest(url, endpoint, key) {
  const res = await fetch(`${url}/api/v1${endpoint}`, {
    headers: { 'X-N8N-API-KEY': key, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`n8n API Error (${res.status}): ${await res.text()}`);
  return res.json();
}

function sanitize(name) {
  return name
    .replace(/\[MELOSMILE\]\s*/g, '')
    .replace(/[^\w\d-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

(async () => {
  const today = new Date().toISOString().slice(0, 10);
  const outRoot = path.join(__dirname, '..', 'n8n-workflows', 'melosmile', 'backups', today);
  let total = 0;

  for (const inst of INSTANCIAS) {
    if (!inst.key) {
      console.log(`⚠️  ${inst.instancia}: sin API key en mcp_config.json, se omite.`);
      continue;
    }
    const outDir = path.join(outRoot, inst.instancia);
    fs.mkdirSync(outDir, { recursive: true });

    const list = await apiRequest(inst.url, '/workflows?limit=250', inst.key);
    const melosmile = (list.data || []).filter((w) => /\[MELOSMILE\]/.test(w.name || ''));

    console.log(`\n🔍 [${inst.instancia}] workflows [MELOSMILE]: ${melosmile.length}`);
    const summary = [];
    let ok = 0;
    for (const wf of melosmile) {
      const detail = await apiRequest(inst.url, `/workflows/${wf.id}`, inst.key);
      const fileName = `${String(ok + 1).padStart(2, '0')}-${sanitize(detail.name)}.json`;
      const payload = {
        _export: {
          source: 'n8n API backup',
          instance: inst.url,
          date: new Date().toISOString(),
          workflow_id: detail.id,
          active: detail.active === true,
        },
        id: detail.id,
        name: detail.name,
        active: detail.active,
        nodes: detail.nodes || [],
        connections: detail.connections || {},
        settings: detail.settings || {},
      };
      fs.writeFileSync(path.join(outDir, fileName), JSON.stringify(payload, null, 2));
      summary.push({ file: fileName, id: detail.id, name: detail.name, nodes: payload.nodes.length, active: payload.active });
      ok++;
      total++;
      console.log(`  ✅ ${fileName} (${detail.name}) — ${payload.nodes.length} nodos`);
    }
    fs.writeFileSync(
      path.join(outDir, '_INDEX.json'),
      JSON.stringify({ exported_at: new Date().toISOString(), instance: inst.url, workflows: summary }, null, 2)
    );
  }

  console.log(`\n📦 Backup completado en: ${outRoot}`);
  console.log(`   Total ${total} workflows exportados (solo lectura, sin modificar n8nv2).`);
})().catch((e) => {
  console.error('❌ Backup falló:', e.message);
  process.exit(1);
});