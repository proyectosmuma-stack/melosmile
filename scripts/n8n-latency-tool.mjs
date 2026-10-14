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

async function setNode(env, workflowId, nodeName, jsonFile) {
  try {
    const patch = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    const workflow = await callN8nApi(env, 'GET', `/api/v1/workflows/${workflowId}`);
    const node = workflow.nodes.find((n) => n.name === nodeName);
    if (!node) {
      console.error(JSON.stringify({ status: "error", message: `nodo ${nodeName} no encontrado` }));
      process.exit(1);
    }
    const backupDir = path.join(os.homedir(), 'Antigravity Projects/melosmile/scratch/n8n-backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const ts = new Date().toISOString().replace(/:/g, '-');
    fs.writeFileSync(path.join(backupDir, `${env}-${workflowId}-${ts}.json`), JSON.stringify(workflow, null, 2));
    if (patch.parameters) node.parameters = patch.parameters;
    if (patch.credentials) node.credentials = patch.credentials;
    if (patch.disabled !== undefined) node.disabled = patch.disabled;
    await callN8nApi(env, 'PUT', `/api/v1/workflows/${workflowId}`, {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings
    });
    const upd = await callN8nApi(env, 'GET', `/api/v1/workflows/${workflowId}`);
    const u = upd.nodes.find((n) => n.name === nodeName);
    console.log(JSON.stringify({
      status: "ok", env, workflowId, node: nodeName,
      method: u?.parameters?.method ?? null,
      url: u?.parameters?.url ?? null,
      cred: u?.credentials?.httpHeaderAuth?.id ?? null,
      disabled: u?.disabled ?? false
    }));
  } catch (error) {
    console.error(JSON.stringify({ status: "error", message: error.message }));
    process.exit(1);
  }
}

async function appendPrompt(env, workflowId, nodeName, textFile) {
  try {
    const text = fs.readFileSync(textFile, 'utf8').trim();
    const workflow = await callN8nApi(env, 'GET', `/api/v1/workflows/${workflowId}`);
    const node = workflow.nodes.find((n) => n.name === nodeName);
    if (!node) {
      console.error(JSON.stringify({ status: "error", message: `nodo ${nodeName} no encontrado` }));
      process.exit(1);
    }
    node.parameters = node.parameters || {};
    node.parameters.options = node.parameters.options || {};
    const cur = node.parameters.options.systemMessage || "";
    if (cur.includes(text)) {
      console.log(JSON.stringify({ status: "ok", node: nodeName, already: true, systemMessage_len: cur.length }));
      process.exit(0);
    }
    node.parameters.options.systemMessage = (cur.trim() + "\n\n" + text);
    const backupDir = path.join(os.homedir(), 'Antigravity Projects/melosmile/scratch/n8n-backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const ts = new Date().toISOString().replace(/:/g, '-');
    fs.writeFileSync(path.join(backupDir, `${env}-${workflowId}-${ts}.json`), JSON.stringify(workflow, null, 2));
    await callN8nApi(env, 'PUT', `/api/v1/workflows/${workflowId}`, {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings
    });
    const upd = await callN8nApi(env, 'GET', `/api/v1/workflows/${workflowId}`);
    const u = upd.nodes.find((n) => n.name === nodeName);
    const len = (u?.parameters?.options?.systemMessage || "").length;
    console.log(JSON.stringify({ status: "ok", env, workflowId, node: nodeName, systemMessage_len: len, applied: true }));
  } catch (error) {
    console.error(JSON.stringify({ status: "error", message: error.message }));
    process.exit(1);
  }
}

async function addNode(env, workflowId, jsonFile) {
  try {
    const spec = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    const nodeDef = spec.node;
    const connectTo = spec.connectTo || null;
    if (!nodeDef || !nodeDef.name) {
      console.error(JSON.stringify({ status: "error", message: "spec.node.name requerido" }));
      process.exit(1);
    }
    const workflow = await callN8nApi(env, 'GET', `/api/v1/workflows/${workflowId}`);
    const backupDir = path.join(os.homedir(), 'Antigravity Projects/melosmile/scratch/n8n-backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const ts = new Date().toISOString().replace(/:/g, '-');
    fs.writeFileSync(path.join(backupDir, `${env}-${workflowId}-${ts}.json`), JSON.stringify(workflow, null, 2));
    const idx = workflow.nodes.findIndex((n) => n.name === nodeDef.name);
    const added = idx === -1;
    if (added) workflow.nodes.push(nodeDef);
    else workflow.nodes[idx] = nodeDef;
    workflow.connections = workflow.connections || {};
    if (connectTo) {
      workflow.connections[nodeDef.name] = { ai_tool: [[{ node: connectTo, type: "ai_tool", index: 0 }]] };
    }
    await callN8nApi(env, 'PUT', `/api/v1/workflows/${workflowId}`, {
      name: workflow.name, nodes: workflow.nodes, connections: workflow.connections, settings: workflow.settings
    });
    const upd = await callN8nApi(env, 'GET', `/api/v1/workflows/${workflowId}`);
    const exists = !!upd.nodes.find((n) => n.name === nodeDef.name);
    const connected = connectTo
      ? (upd.connections?.[nodeDef.name]?.ai_tool?.flat()?.some((c) => c?.node === connectTo) || false)
      : null;
    console.log(JSON.stringify({ status: "ok", env, workflowId, node: nodeDef.name, added, exists, connected, node_count: upd.nodes.length }));
  } catch (error) {
    console.error(JSON.stringify({ status: "error", message: error.message }));
    process.exit(1);
  }
}

async function setPrompt(env, workflowId, nodeName, textFile) {
  try {
    const text = fs.readFileSync(textFile, 'utf8').trim();
    const workflow = await callN8nApi(env, 'GET', `/api/v1/workflows/${workflowId}`);
    const node = workflow.nodes.find((n) => n.name === nodeName);
    if (!node) {
      console.error(JSON.stringify({ status: "error", message: `nodo ${nodeName} no encontrado` }));
      process.exit(1);
    }
    const backupDir = path.join(os.homedir(), 'Antigravity Projects/melosmile/scratch/n8n-backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const ts = new Date().toISOString().replace(/:/g, '-');
    fs.writeFileSync(path.join(backupDir, `${env}-${workflowId}-${ts}.json`), JSON.stringify(workflow, null, 2));
    node.parameters = node.parameters || {};
    node.parameters.options = node.parameters.options || {};
    node.parameters.options.systemMessage = text;
    await callN8nApi(env, 'PUT', `/api/v1/workflows/${workflowId}`, {
      name: workflow.name, nodes: workflow.nodes, connections: workflow.connections, settings: workflow.settings
    });
    const upd = await callN8nApi(env, 'GET', `/api/v1/workflows/${workflowId}`);
    const u = upd.nodes.find((n) => n.name === nodeName);
    console.log(JSON.stringify({ status: "ok", env, workflowId, node: nodeName, systemMessage_len: (u?.parameters?.options?.systemMessage || "").length }));
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
} else if (command === 'setnode') {
  setNode(env, workflowId, bodyJsonArg, process.argv[6]);
} else if (command === 'appendprompt') {
  appendPrompt(env, workflowId, bodyJsonArg, process.argv[6]);
} else if (command === 'addnode') {
  addNode(env, workflowId, bodyJsonArg);
} else if (command === 'setprompt') {
  setPrompt(env, workflowId, bodyJsonArg, process.argv[6]);
} else {
  console.log("Usage:");
  console.log("  node n8n-latency-tool.mjs summary <env> <workflowId>");
  console.log("  node n8n-latency-tool.mjs apply <env> <workflowId> [--dry-run]");
  console.log("  node n8n-latency-tool.mjs verify <env> <workflowId>");
  console.log("  node n8n-latency-tool.mjs trigger <env> <webhookPath> <bodyJson>");
  console.log("  node n8n-latency-tool.mjs setmax <env> <workflowId> <n>");
  console.log("  node n8n-latency-tool.mjs setnode <env> <workflowId> <nodeName> <jsonFile>");
  console.log("  node n8n-latency-tool.mjs appendprompt <env> <workflowId> <nodeName> <textFile>");
  console.log("  node n8n-latency-tool.mjs addnode <env> <workflowId> <jsonFile{node,connectTo}>");
  console.log("  node n8n-latency-tool.mjs setprompt <env> <workflowId> <nodeName> <textFile>");
  process.exit(1);
}
