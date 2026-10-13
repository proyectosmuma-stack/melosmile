import fs from 'fs';
import path from 'path';
import os from 'os';

const ENVS = {
  dev: { base: "https://n8n.mumaweb.com", keyFile: `${os.homedir()}/.config/opencode/secrets/n8n-api-dev.key` },
  prod: { base: "https://n8nv2.mumaweb.com", keyFile: `${os.homedir()}/.config/opencode/secrets/n8n-api-prod.key` }
};

const REMINDER_TOOL_NODE = {
  "id": "tool-sched-reminders-01",
  "name": "Tool_Schedule_Reminders",
  "type": "@n8n/n8n-nodes-langchain.toolHttpRequest",
  "typeVersion": 1.1,
  "position": [-140, 760],
  "parameters": {
    "description": "Programa la cadencia de recordatorios de cita (3 etapas: 1 semana antes, 2 dias antes y el dia de la cita) para las citas indicadas. Envia por WhatsApp si el paciente tiene telefono, o por email si no lo tiene. Usala cuando el doctor pida crear/programar/poner las notificaciones o recordatorios de las citas de una fecha, de una clinica o de una lista de pacientes. Parametros: date (YYYY-MM-DD o relativo), patient_names (nombres separados por comas), clinic (Goya/Getafe).",
    "method": "POST",
    "url": "", // This will be filled by toolUrl argument
    "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth",
    "sendQuery": true,
    "specifyQuery": "keypair",
    "parametersQuery": {
      "values": [
        { "name": "date", "valueProvider": "modelOptional" },
        { "name": "patient_names", "valueProvider": "modelOptional" },
        { "name": "clinic", "valueProvider": "modelOptional" }
      ]
    }
  },
  "credentials": { "httpHeaderAuth": { "id": "yNN9yI21gnAAlo2p", "name": "Melosmile Backend x-api-key (JWT Prod)" } }
};

const SYSTEM_MESSAGE_RULE = `
- AL CREAR RECORDATORIOS DE CITA: cuando el doctor pida crear, programar o poner los recordatorios/notificaciones de citas (por fecha, por clínica o por lista de pacientes), ejecuta UNA SOLA llamada a 'Tool_Schedule_Reminders' con date (formato YYYY-MM-DD o relativo), patient_names (si te da nombres de pacientes) y/o clinic. NO respondas sin llamar a la herramienta.
- Tras la llamada, responde al doctor un resumen con el campo 'created_reminders' y los avisos del campo 'warnings' (pacientes sin contacto válido, citas fuera de ventana).`;

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

async function summary(env, workflowId) {
  try {
    const workflow = await callN8nApi(env, 'GET', `/api/v1/workflows/${workflowId}`);

    const toolNodes = workflow.nodes.filter(node =>
      node.type === "@n8n/n8n-nodes-langchain.toolHttpRequest"
    ).map(node => ({
      name: node.name,
      method: node.parameters.method,
      url: node.parameters.url
    }));

    const hasRemindersTool = toolNodes.some(node => node.name === "Tool_Schedule_Reminders");

    const agentSchedulingNode = workflow.nodes.find(node => node.name === "Agent_Scheduling");
    const systemMessage = agentSchedulingNode?.parameters?.options?.systemMessage || "";
    const systemMessage_len = systemMessage.length;
    const systemMessage_tail = systemMessage.slice(-200);

    const connectionsOk = workflow.connections["Tool_Schedule_Reminders"]?.ai_tool?.flat()?.some(c => c?.node === "Agent_Scheduling") || false;


    console.log(JSON.stringify({
      status: "ok",
      name: workflow.name,
      node_count: workflow.nodes.length,
      tool_nodes: toolNodes,
      has_reminders_tool: hasRemindersTool,
      systemMessage_len,
      systemMessage_tail,
      connections_ok: connectionsOk
    }));
  } catch (error) {
    console.error(JSON.stringify({ status: "error", message: error.message }));
    process.exit(1);
  }
}

async function apply(env, workflowId, toolUrl, dryRun) {
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
  const backupFilePath = path.join(backupDir, `${env}-${workflowId}-${timestamp}.json`);
  fs.writeFileSync(backupFilePath, JSON.stringify(workflow, null, 2));

  let node_count_before = workflow.nodes.length;
  let tool_added = false;
  let prompt_rule_added = false;
  let connection_ok = false;

  const newNodes = [...workflow.nodes];
  const reminderToolIndex = newNodes.findIndex(node => node.name === "Tool_Schedule_Reminders");
  const toolNode = { ...REMINDER_TOOL_NODE, parameters: { ...REMINDER_TOOL_NODE.parameters, url: toolUrl } };

  if (reminderToolIndex !== -1) {
    newNodes[reminderToolIndex] = toolNode;
  } else {
    newNodes.push(toolNode);
    tool_added = true;
  }

  const newConnections = { ...workflow.connections };
  newConnections["Tool_Schedule_Reminders"] = { ai_tool: [[{ node: "Agent_Scheduling", type: "ai_tool", index: 0 }]] };
  
  const agentSchedulingNode = newNodes.find(node => node.name === "Agent_Scheduling");
  if (agentSchedulingNode) {
    let systemMessage = agentSchedulingNode.parameters.options.systemMessage || "";
    if (!systemMessage.includes(SYSTEM_MESSAGE_RULE.trim())) {
      agentSchedulingNode.parameters.options.systemMessage = (systemMessage.trim() + SYSTEM_MESSAGE_RULE).trim();
      prompt_rule_added = true;
    }
  }

  workflow.nodes = newNodes;
  workflow.connections = newConnections;

  const node_count_after = workflow.nodes.length;

  if (dryRun) {
    const transformedFilePath = path.join(backupDir, `${env}-${workflowId}-${timestamp}.transformed.json`);
    fs.writeFileSync(transformedFilePath, JSON.stringify(workflow, null, 2));
    console.log(JSON.stringify({
      status: "ok",
      env,
      workflowId,
      node_count_before,
      node_count_after,
      tool_added,
      connection_ok: true, // Assuming dry run implies connection would be ok
      prompt_rule_added,
      backup_file: backupFilePath,
      transformed_file: transformedFilePath,
      dry_run: true
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
    connection_ok = updatedWorkflow.connections["Tool_Schedule_Reminders"]?.ai_tool?.flat()?.some(c => c?.node === "Agent_Scheduling") || false;

    console.log(JSON.stringify({
      status: "ok",
      env,
      workflowId,
      node_count_before,
      node_count_after,
      tool_added,
      connection_ok,
      prompt_rule_added,
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

    const reminderToolNode = workflow.nodes.find(node => node.name === "Tool_Schedule_Reminders");
    const node_ok = !!reminderToolNode;
    const url = reminderToolNode?.parameters?.url || null;

    const connection_ok = workflow.connections["Tool_Schedule_Reminders"]?.ai_tool?.flat()?.some(c => c?.node === "Agent_Scheduling") || false;

    const agentSchedulingNode = workflow.nodes.find(node => node.name === "Agent_Scheduling");
    const systemMessage = agentSchedulingNode?.parameters?.options?.systemMessage || "";
    const rule_ok = systemMessage.includes(SYSTEM_MESSAGE_RULE.trim());

    console.log(JSON.stringify({
      status: "ok",
      node_ok,
      connection_ok,
      rule_ok,
      url
    }));
  } catch (error) {
    console.error(JSON.stringify({ status: "error", message: error.message }));
    process.exit(1);
  }
}


const [,, command, env, workflowId, toolUrl, dryRunArg] = process.argv;
const dryRun = dryRunArg === '--dry-run';

if (command === 'summary') {
  summary(env, workflowId);
} else if (command === 'apply') {
  apply(env, workflowId, toolUrl, dryRun);
} else if (command === 'verify') {
  verify(env, workflowId);
} else {
  console.log("Usage:");
  console.log("  node n8n-reminders-tool.mjs summary <env> <workflowId>");
  console.log("  node n8n-reminders-tool.mjs apply <env> <workflowId> <toolUrl> [--dry-run]");
  console.log("  node n8n-reminders-tool.mjs verify <env> <workflowId>");
  process.exit(1);
}