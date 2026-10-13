const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.remote') });
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const N8N_URL = process.env.N8N_WEBHOOK_BASE_URL || 'https://n8nv2.mumaweb.com';
const N8N_API_KEY = process.env.N8N_API_KEY || '';

async function updateDispatcher() {
  const dispatcherId = '5xjgNTJ86tMQ09rP';

  const subAgentMapProd = {
    'Tool_SubAgent_Scheduling': 'd74hAW8IkmmCqoh5',
    'Tool_SubAgent_Clinical': 'WNViucEUuhzigYtE',
    'Tool_SubAgent_Billing': 'inakl5N4ROrmmrFh',
    'Tool_SubAgent_General': 'T5FvJ4PMcHKp1gBa'
  };

  // IDs de DEV (asumo que son diferentes, si no son correctos el guard fallará)
  const subAgentMapDev = {
    'Tool_SubAgent_Scheduling': 'gfh3MvJ8NOS1tO8c', // Este lo conocemos por el ESTADO_PROYECTO.md
    'Tool_SubAgent_Clinical': 'DEV_ID_CLINICAL', // Placeholder, el guard fallará si no son correctos
    'Tool_SubAgent_Billing': 'DEV_ID_BILLING', // Placeholder
    'Tool_SubAgent_General': 'DEV_ID_GENERAL' // Placeholder
  };

  const isProd = N8N_URL.includes('n8nv2');
  let currentSubAgentMap;

  // Guard duro
  if (isProd) {
    if (N8N_URL !== 'https://n8nv2.mumaweb.com') {
      console.error(`❌ ERROR: N8N_URL (${N8N_URL}) no coincide con el entorno de PRODUCCIÓN esperado ('https://n8nv2.mumaweb.com'). Abortando.`);
      process.exit(1);
    }
    currentSubAgentMap = subAgentMapProd;
  } else {
    if (N8N_URL !== 'https://n8n.mumaweb.com') {
      console.error(`❌ ERROR: N8N_URL (${N8N_URL}) no coincide con el entorno de DESARROLLO esperado ('https://n8n.mumaweb.com'). Abortando.`);
      process.exit(1);
    }
    currentSubAgentMap = subAgentMapDev;
  }

  // Verificar que el subAgentMap es consistente con el entorno
  for (const toolName in currentSubAgentMap) {
    if (isProd) {
      if (!Object.values(subAgentMapProd).includes(currentSubAgentMap[toolName])) {
        console.error(`❌ ERROR: Se detectó un ID de sub-agente no PROD (${currentSubAgentMap[toolName]}) en el mapa PROD para ${toolName}. Abortando.`);
        process.exit(1);
      }
    } else {
      // En DEV, si no conocemos los IDs exactos, permitimos los placeholders pero no PROD IDs
      if (Object.values(subAgentMapProd).includes(currentSubAgentMap[toolName]) && currentSubAgentMap[toolName] !== 'gfh3MvJ8NOS1tO8c') {
        console.error(`❌ ERROR: Se detectó un ID de sub-agente PROD (${currentSubAgentMap[toolName]}) en el mapa DEV para ${toolName}. Abortando.`);
        process.exit(1);
      }
    }
  }

  console.log(`✅ Entorno verificado: N8N_URL=${N8N_URL}. Usando IDs de ${isProd ? 'PRODUCCIÓN' : 'DESARROLLO'}.`);

  const getRes = await fetch(`${N8N_URL}/api/v1/workflows/${dispatcherId}`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  });
  const wf = await getRes.json();

  let updatedCount = 0;
  for (const node of wf.nodes) {
    if (currentSubAgentMap[node.name]) {
      node.parameters.workflowId = {
        "__rl": true,
        "mode": "id",
        "value": currentSubAgentMap[node.name]
      };
      updatedCount++;
      console.log(`✅ Updated ${node.name} -> ${currentSubAgentMap[node.name]}`);
    }
  }

  const putRes = await fetch(`${N8N_URL}/api/v1/workflows/${dispatcherId}`, {
    method: 'PUT',
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: wf.name,
      nodes: wf.nodes,
      connections: wf.connections,
      settings: { executionOrder: 'v1' }
    })
  });

  const updated = await putRes.json();
  console.log(`🎉 Dispatcher workflow updated on n8nv2! Status:`, putRes.status);
}

updateDispatcher();
