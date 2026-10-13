import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';

const n8nBaseUrls = {
  prod: 'https://n8nv2.mumaweb.com',
  dev: 'https://n8n.mumaweb.com',
};

const n8nApiKeys = {
  prod: resolve(homedir(), '.config/opencode/secrets/n8n-api-prod.key'),
  dev: resolve(homedir(), '.config/opencode/secrets/n8n-api-dev.key'),
};

async function getN8nApiKey(env) {
  try {
    return (await readFile(n8nApiKeys[env], 'utf8')).trim();
  } catch (error) {
    console.error(`Error reading n8n API key for ${env}:`, error.message);
    process.exit(1);
  }
}

async function n8nRequest(env, method, path, body = null) {
  const baseUrl = n8nBaseUrls[env];
  const apiKey = await getN8nApiKey(env);
  const headers = {
    'X-N8N-API-KEY': apiKey,
    'Content-Type': 'application/json',
  };

  const url = `${baseUrl}${path}`;
  const options = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  };

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`N8n API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    return response.json();
  } catch (error) {
    console.error(`Error during n8n request to ${url}:`, error.message);
    process.exit(1);
  }
}

async function listCredentials(env) {
  const credentials = await n8nRequest(env, 'GET', '/api/v1/credentials');
  const httpHeaderAuthCreds = credentials.data.filter(
    (cred) => cred.type === 'httpHeaderAuth'
  );
  httpHeaderAuthCreds.forEach((cred) => console.log(`${cred.id}  ${cred.name}`));
}

async function repointWorkflow(env, workflowId, fromDomain, toDomain, credentialId, dryRun) {
  const workflow = await n8nRequest(env, 'GET', `/api/v1/workflows/${workflowId}`);

  // Backup workflow
  const backupDir = join(process.cwd(), 'scratch', 'n8n-backups');
  await mkdir(backupDir, { recursive: true });
  const backupFilePath = join(backupDir, `${env}-${workflowId}-${new Date().toISOString()}.json`);
  await writeFile(backupFilePath, JSON.stringify(workflow, null, 2));
  console.log(`Backup saved to ${backupFilePath}`);

  let nodesChanged = 0;
  const changedNodesDetails = [];

  for (const node of workflow.nodes) {
    const isToolHttpRequest = node.type === '@n8n/n8n-nodes-langchain.toolHttpRequest';
    const isHttpRequest = node.type === 'n8n-nodes-base.httpRequest';

    if (isToolHttpRequest || isHttpRequest) {
      let originalUrl = '';
      let newUrl = '';
      let urlChanged = false;

      if (node.parameters?.url) {
        if (typeof node.parameters.url === 'string') {
          originalUrl = node.parameters.url;
          if (originalUrl.includes(fromDomain)) {
            newUrl = originalUrl.replace(new RegExp(fromDomain, 'g'), toDomain);
            node.parameters.url = newUrl;
            urlChanged = true;
          }
        } else if (node.parameters.url.__rl && node.parameters.url.value && typeof node.parameters.url.value === 'string') {
          originalUrl = node.parameters.url.value;
          if (originalUrl.includes(fromDomain)) {
            newUrl = originalUrl.replace(new RegExp(fromDomain, 'g'), toDomain);
            node.parameters.url.value = newUrl;
            urlChanged = true;
          }
        }
      }

      if (credentialId) {
        if (!node.credentials) {
          node.credentials = {};
        }
        node.credentials.httpHeaderAuth = { id: credentialId, name: null };
      }

      if (urlChanged || credentialId) {
        nodesChanged++;
        changedNodesDetails.push({
          nodeName: node.name,
          originalUrl: originalUrl || 'N/A',
          newUrl: newUrl || (originalUrl || 'N/A'),
          credentialApplied: !!credentialId,
        });
      }
    }
  }

  console.log('\n--- Repointing Plan ---');
  changedNodesDetails.forEach(detail => {
    console.log(`Node: ${detail.nodeName}`);
    console.log(`  Original URL: ${detail.originalUrl}`);
    console.log(`  New URL: ${detail.newUrl}`);
    if (detail.credentialApplied) console.log(`  Credential ID: ${credentialId}`);
    console.log('---');
  });

  if (!dryRun) {
    console.log('\nApplying changes to n8n...');
    const updateBody = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings,
    };
    await n8nRequest(env, 'PUT', `/api/v1/workflows/${workflowId}`, updateBody);
    console.log(`Workflow ${workflowId} updated successfully.`);

    // Confirm changes
    const updatedWorkflow = await n8nRequest(env, 'GET', `/api/v1/workflows/${workflowId}`);
    console.log('\n--- Final URLs after update ---');
    for (const node of updatedWorkflow.nodes) {
      if (
        (node.type === '@n8n/n8n-nodes-langchain.toolHttpRequest' ||
          node.type === 'n8n-nodes-base.httpRequest') &&
        node.parameters?.url
      ) {
        if (typeof node.parameters.url === 'string') {
          console.log(`${node.name}: ${node.parameters.url}`);
        } else if (node.parameters.url.__rl && node.parameters.url.value) {
          console.log(`${node.name}: ${node.parameters.url.value}`);
        }
      }
    }
  } else {
    console.log('\n--- DRY RUN: No changes applied to n8n ---');
  }

  const result = {
    status: dryRun ? 'dry_run_completed' : 'success',
    workflowId,
    nodes_changed: nodesChanged,
    dry_run: dryRun,
    backup_file: backupFilePath,
  };
  console.log(JSON.stringify(result, null, 2));
}

async function main() {
  const [cmd, env, ...args] = process.argv.slice(2);

  if (!cmd) {
    console.error('Usage: node n8n-repoint-tools.mjs <command> [...]');
    process.exit(1);
  }

  if (!['prod', 'dev'].includes(env) && cmd !== 'creds') {
    console.error('Invalid environment. Must be "prod" or "dev".');
    process.exit(1);
  }

  switch (cmd) {
    case 'creds':
      if (!env) {
        console.error('Usage: node n8n-repoint-tools.mjs creds <env>');
        process.exit(1);
      }
      await listCredentials(env);
      break;
    case 'repoint':
      const [workflowId, fromDomain, toDomain, credentialId, dryRunFlag] = args;
      if (!workflowId || !fromDomain || !toDomain) {
        console.error('Usage: node n8n-repoint-tools.mjs repoint <env> <workflowId> <fromDomain> <toDomain> <credentialId> [--dry-run]');
        process.exit(1);
      }
      const dryRun = dryRunFlag === '--dry-run';
      await repointWorkflow(env, workflowId, fromDomain, toDomain, credentialId, dryRun);
      break;
    default:
      console.error(`Unknown command: ${cmd}`);
      process.exit(1);
  }
}

main();
