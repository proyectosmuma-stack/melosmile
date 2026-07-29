const fs = require('fs');
const path = require('path');

const N8N_URL = process.env.N8N_URL || 'https://n8nv2.mumaweb.com';
const N8N_API_KEY = process.env.N8N_API_KEY || process.argv[2];

if (!N8N_API_KEY) {
  console.error('❌ Error: Debes proporcionar la API Key de n8nv2.mumaweb.com.');
  console.error('Uso: node scripts/deploy_workflows_to_n8nv2.js <N8N_API_KEY>');
  process.exit(1);
}

const workflowsDir = path.join(__dirname, '../../n8n/melosmile');

const workflowFiles = [
  '01_MELOSMILE_AI_Dispatcher.json',
  '02_MELOSMILE_SubAgent_Agendamiento.json',
  '03_MELOSMILE_SubAgent_Clinico.json',
  '04_MELOSMILE_SubAgent_Contabilidad.json',
  '05_MELOSMILE_SubAgent_General.json',
  '06_MELOSMILE_Agent_Document_Cleaner.json'
];

async function apiRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${N8N_URL}/api/v1${endpoint}`, options);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`n8n API Error (${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

async function deploy() {
  console.log(`🚀 Desplegando flujos de MeloSmile en ${N8N_URL}...`);

  // 1. Check health
  try {
    const existingWorkflows = await apiRequest('/workflows?limit=100');
    console.log(`✅ Conexión exitosa a n8n. Flujos existentes: ${existingWorkflows.data?.length || 0}`);
  } catch (e) {
    console.error(`❌ Error al conectar con ${N8N_URL}:`, e.message);
    process.exit(1);
  }

  const deployedMap = {};

  for (const filename of workflowFiles) {
    const fullPath = path.join(workflowsDir, filename);
    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️ Archivo no encontrado: ${filename}`);
      continue;
    }

    const wfData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

    // Strip previous IDs/version metadata to create fresh on target server
    const payload = {
      name: wfData.name,
      nodes: wfData.nodes,
      connections: wfData.connections,
      settings: wfData.settings || {},
      staticData: wfData.staticData || null,
      tags: wfData.tags || [{ name: 'melosmile' }]
    };

    try {
      console.log(`📦 Creando flujo "${payload.name}"...`);
      const created = await apiRequest('/workflows', 'POST', payload);
      console.log(`   └─ ID Asignado: ${created.id}`);

      // Activate workflow
      await apiRequest(`/workflows/${created.id}/activate`, 'POST').catch(err => {
        console.warn(`   └─ Aviso al activar ${created.id}:`, err.message);
      });

      deployedMap[wfData.name] = created.id;
    } catch (err) {
      console.error(`❌ Error creando ${payload.name}:`, err.message);
    }
  }

  console.log('\n--- 🎉 Resumen de Despliegue en n8nv2 ---');
  console.table(deployedMap);
}

deploy();
