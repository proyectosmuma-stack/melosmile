const N8N_URL = 'https://n8nv2.mumaweb.com';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlNzc3OGRmNi04Zjc3LTRjMTYtYTAxOS1hODZhZDU2YjlmNDIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZmI0Y2JjODQtNTQyZS00MWRhLWE3YzEtOTQ1MmI4OTc1YjE4IiwiaWF0IjoxNzg1MzQzNjI3fQ.E3Z7u0mbPVfIkH7I555RbV7i2N4QFPnMKbIB233hZ64';

async function updateDispatcher() {
  const dispatcherId = 'QgNoVFr9TBXGbdOl';

  const subAgentMap = {
    'Tool_SubAgent_Scheduling': 'E59OoSRNJ4skt43W',
    'Tool_SubAgent_Clinical': 'cQQGecziVfareNtI',
    'Tool_SubAgent_Billing': '4Z7PdsGK2wAIi2iE',
    'Tool_SubAgent_General': '9scMTKJwP7TKFSJV'
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
