const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const envRemotePath = path.join(__dirname, '../frontend/.env.remote');
const content = fs.readFileSync(envRemotePath, 'utf8');

const targetVars = [
  'N8N_WEBHOOK_BASE_URL',
  'N8N_WEBHOOK_URL',
  'N8N_VECTORIZER_WEBHOOK_URL',
  'N8N_API_KEY',
  'VPS_SSH_HOST',
  'VPS_SSH_USER',
  'VPS_SSH_PASSWORD',
  'VPS_FTP_PORT',
  'VPS_DOMAIN_FOLDER',
  'NEXT_PUBLIC_VPS_FILES_BASE',
  'VPS_DOCS_BASE_PATH'
];

const envMap = {};
content.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let key = match[1].trim();
    let val = match[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    envMap[key] = val;
  }
});

const environments = ['preview', 'production', 'development'];

for (const varName of targetVars) {
  const val = envMap[varName];
  if (!val) {
    console.warn(`[SKIP] Missing value for ${varName}`);
    continue;
  }

  for (const env of environments) {
    console.log(`Setting ${varName} for ${env}...`);
    try {
      const cmd = `npx vercel env add ${varName} ${env} --value "${val}" --yes --force`;
      execSync(cmd, { cwd: path.join(__dirname, '../frontend'), stdio: 'pipe' });
      console.log(`✅ Set ${varName} in ${env}`);
    } catch (err) {
      console.error(`❌ Failed to set ${varName} in ${env}:`, err.message);
    }
  }
}

console.log('All variables processed!');
