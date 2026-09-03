const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.remote') });
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const N8N_URL = process.env.N8N_WEBHOOK_BASE_URL || 'https://n8nv2.mumaweb.com';
const N8N_API_KEY = process.env.N8N_API_KEY || '';

async function updateDispatcher() {
  const dispatcherId = '5xjgNTJ86tMQ09rP';

  const subAgentMap = {
    'Tool_SubAgent_Scheduling': 'd74hAW8IkmmCqoh5',
    'Tool_SubAgent_Clinical': 'WNViucEUuhzigYtE',
    'Tool_SubAgent_Billing': 'inakl5N4ROrmmrFh',
    'Tool_SubAgent_General': 'T5FvJ4PMcHKp1gBa'
  };

  const getRes = await fetch(`${N8N_URL}/api/v1/workflows/${dispatcherId}`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  });
  const wf = await getRes.json();

  let updatedCount = 0;
  for (const node of wf.nodes) {
    if (subAgentMap[node.name]) {
      node.parameters.workflowId = {
        "__rl": true,
        "mode": "id",
        "value": subAgentMap[node.name]
      };
      updatedCount++;
      console.log(`✅ Updated ${node.name} -> ${subAgentMap[node.name]}`);
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
