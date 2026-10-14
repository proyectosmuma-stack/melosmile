import fs from 'fs';
import path from 'path';
import os from 'os';

const ENVS = {
  dev: { base: "https://n8n.mumaweb.com", keyFile: `${os.homedir()}/.config/opencode/secrets/n8n-api-dev.key` },
  prod: { base: "https://n8nv2.mumaweb.com", keyFile: `${os.homedir()}/.config/opencode/secrets/n8n-api-prod.key` }
};

async function callN8nApi(env, method, path, body = null) {
  const config = ENVS[env];
  if (!config) {
    throw new Error(`Environment ${env} not found.`);
  }

  const apiKey = fs.readFileSync(config.keyFile, 'utf8').trim();
  const url = `${config.base}${path}`;

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': apiKey,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, message: ${errorText.substring(0, 300)}`);
  }
  return response.json();
}

async function trigger(env, workflowId, bodyJson) {
  try {
    const t0 = Date.now();
    const config = ENVS[env];
    if (!config) {
      throw new Error(`Environment ${env} not found.`);
    }
    
    const url = `${config.base}/webhook/${workflowId}`;
    const body = JSON.parse(bodyJson ?? "{}");

    const res = await fetch(url, { 
        method: "POST", 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(body) 
      });
    
    const elapsed = Date.now() - t0;
    const text = await res.text();
    console.log(JSON.stringify({
      status: "ok",
      http_status: res.status,
      elapsed_ms: elapsed,
      response_text: text.slice(0, 4000)
    }));
    process.exit(0);
  } catch (error) {
    console.error(JSON.stringify({
      status: "error",
      message: error.message
    }));
    process.exit(1);
  }
}

async function summary(env, workflowId) {
  try {
    const workflow = await callN8nApi(env, 'GET', `/api/v1/workflows/${workflowId}`);

    const agentNodes = workflow.nodes.filter(node => node.type === "@n8n/n8n-nodes-langchain.agent").map(node => ({
      name: node.name,
      typeVersion: node.typeVersion,
      maxIterations: node.parameters?.options?.maxIterations ?? null
    }));

    const toolNodes = workflow.nodes.filter(node => node.type.startsWith("@n8n/n8n-nodes-langchain.tool")).map(node => ({
      name: node.name,
      type: node.type,
      retryOnFail: !!node.retryOnFail
    }));

    console.log(JSON.stringify({
      status: "ok",
      name: workflow.name,
      node_count: workflow.nodes.length,
      agent_nodes: agentNodes,
      tool_nodes: toolNodes
    }));
  } catch (error) {
    console.error(JSON.stringify({ status: "error", message: error.message }));
    process.exit(1);
  }
}

async function apply(env, workflowId, dryRun) {
  let workflow;
  try {
    workflow = await callN8nApi(env, 'GET', `/api/v1/workflows/${workflowId}`);
  } catch (error) {
    console.error(JSON.stringify({ status: "error", message: `Failed to fetch workflow: ${error.message}` }));
    process.exit(1);
  }

  const backupDir = path.join(os.homedir(), 'Antigravity Projects/melosmile/scratch/n8n-backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const baseFileName = `${env}-${workflowId}-${timestamp}`;
  const backupFilePath = path.join(backupDir, `${baseFileName}.json`);
  fs.writeFileSync(backupFilePath, JSON.stringify(workflow, null, 2));

  let agentPatched = 0;
  let toolPatched = 0;

  const newNodes = [...workflow.nodes];
  
  for (const node of newNodes) {
    if (node.type === "@n8n/n8n-nodes-langchain.agent") {
      node.parameters = node.parameters || {};
      node.parameters.options = node.parameters.options || {};
      node.parameters.options.maxIterations = 6;
      agentPatched++;
    } else if (node.type.startsWith("@n8n/n8n-nodes-langchain.tool")) {
      node.retryOnFail = false;
      toolPatched++;
    }
  }

  workflow.nodes = newNodes;

  if (dryRun) {
    const transformedFilePath = path.join(backupDir, `${baseFileName}.transformed.json`);
    fs.writeFileSync(transformedFilePath, JSON.stringify(workflow, null, 2));
    console.log(JSON.stringify({
      status: "ok",
      dry_run: true,
      agent_patched: agentPatched,
      tool_patched: toolPatched,
      backup_file: backupFilePath,
      transformed_file: transformedFilePath
    }));
    return;
  }

  try {
    await callN8nApi(env, 'PUT', `/api/v1/workflows/${workflowId}`, {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings
    });

    const updatedWorkflow = await callN8nApi(env, 'GET', `/api/v1/workflows/${workflowId}`);

    // Verification after PUT
    let verifyOk = true;
    
    for (const node of updatedWorkflow.nodes) {
      if (node.type === "@n8n/n8n-nodes-langchain.agent") {
        if (node.parameters?.options?.maxIterations !== 6) {
          verifyOk = false;
          break;
        }
      } else if (node.type.startsWith("@n8n/n8n-nodes-langchain.tool")) {
        if (node.retryOnFail !== false) {
          verifyOk = false;
          break;
        }
      }
    }

    console.log(JSON.stringify({
      status: "ok",
      env,
      workflowId,
      agent_patched: agentPatched,
      tool_patched: toolPatched,
      verify_ok: verifyOk,
      backup_file: backupFilePath
    }));
  } catch (error) {
    console.error(JSON.stringify({ status: "error", http_status: error.status, detail: error.message }));
    process.exit(1);
  }
}

async function verify(env, workflowId) {
  try {
    const workflow = await callN8nApi(env, 'GET', `/api/v1/workflows/${workflowId}`);

    const agentNodes = workflow.nodes.filter(node => node.type === "@n8n/n8n-nodes-langchain.agent").map(node => ({
      name: node.name,
      maxIterations: node.parameters?.options?.maxIterations ?? null
    }));

    const toolNodes = workflow.nodes.filter(node => node.type.startsWith("@n8n/n8n-nodes-langchain.tool")).map(node => ({
      name: node.name,
      retryOnFail: !!node.retryOnFail
    }));

    let allAgentsOk = true;
    let allToolsOk = true;

    for (const node of workflow.nodes) {
      if (node.type === "@n8n/n8n-nodes-langchain.agent") {
        if (node.parameters?.options?.maxIterations !== 6) {
          allAgentsOk = false;
        }
      } else if (node.type.startsWith("@n8n/n8n-nodes-langchain.tool")) {
        if (node.retryOnFail !== false) {
          allToolsOk = false;
        }
      }
    }

    console.log(JSON.stringify({
      status: "ok",
      all_agents_ok: allAgentsOk,
      all_tools_ok: allToolsOk,
      agent_nodes: agentNodes,
      tool_nodes: toolNodes
    }));
  } catch (error) {
    console.error(JSON.stringify({ status: "error", message: error.message }));
    process.exit(1);
  }
}

async function setMax(env, workflowId, value) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) {
    console.error(JSON.stringify({ status: "error", message: "valor maxIterations inválido" }));
    process.exit(1);
  }
  try {
    const workflow = await callN8nApi(env, 'GET', `/api/v1/workflows/${workflowId}`);
    let agentPatched = 0;
    for (const node of workflow.nodes) {
      if (node.type === "@n8n/n8n-nodes-langchain.agent") {
        node.parameters = node.parameters || {};
        node.parameters.options = node.parameters.options || {};
        node.parameters.options.maxIterations = n;
        agentPatched++;
      }
    }
    await callN8nApi(env, 'PUT', `/api/v1/workflows/${workflowId}`, {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings
    });
    console.log(JSON.stringify({ status: "ok", env, workflowId, maxIterations: n, agents_patched: agentPatched }));
  } catch (error) {
    console.error(JSON.stringify({ status: "error", message: error.message }));
    process.exit(1);
  }
}

const [,, command, env, workflowId, bodyJsonArg] = process.argv;
  const dryRun = bodyJsonArg === '--dry-run';

if (command === 'summary') {
  summary(env, workflowId);
} else if (command === 'apply') {
  apply(env, workflowId, dryRun);
} else if (command === 'verify') {
  verify(env, workflowId);
} else if (command === 'trigger') {
  trigger(env, workflowId, bodyJsonArg);
} else if (command === 'setmax') {
  setMax(env, workflowId, bodyJsonArg);
} else {
  console.log("Usage:");
  console.log("  node n8n-latency-tool.mjs summary <env> <workflowId>");
  console.log("  node n8n-latency-tool.mjs apply <env> <workflowId> [--dry-run]");
  console.log("  node n8n-latency-tool.mjs verify <env> <workflowId>");
  console.log("  node n8n-latency-tool.mjs trigger <env> <webhookPath> <bodyJson>");
  console.log("  node n8n-latency-tool.mjs setmax <env> <workflowId> <n>");
  process.exit(1);
}
