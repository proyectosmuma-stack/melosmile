const fs = require('fs');
const path = require('path');

const stepsDir = '/Users/munircallaos/.gemini/antigravity-ide/brain/cae93cde-aaba-4b0a-9cc3-fc0ce087e7a4/.system_generated/steps';

const workflowStepMap = [
  { id: 'Yv9X1EGUvQg8qErW', step: 607, filename: '01_MELOSMILE_AI_Dispatcher.json', name: '[MELOSMILE] AI Dispatcher' },
  { id: 'jTWHg9bHaNOdzL13', step: 610, filename: '02_MELOSMILE_SubAgent_Agendamiento.json', name: '[MELOSMILE] Sub-Agent: Agendamiento' },
  { id: 'Q7oxrbUuohca81Gn', step: 613, filename: '03_MELOSMILE_SubAgent_Clinico.json', name: '[MELOSMILE] Sub-Agent: Clinico' },
  { id: 'XSLNwq6ihH1SHPRl', step: 616, filename: '04_MELOSMILE_SubAgent_Contabilidad.json', name: '[MELOSMILE] Sub-Agent: Contabilidad' },
  { id: 'MIok0ruU7JhpTxWv', step: 619, filename: '05_MELOSMILE_SubAgent_General.json', name: '[MELOSMILE] Sub-Agent: General' },
  { id: 'OG4Yy4N7qALXojTa', step: 580, filename: '06_MELOSMILE_Agent_Document_Cleaner.json', name: '[MELOSMILE] Agent Document Cleaner' }
];

const targetDir = path.join(__dirname, '../../n8n/melosmile');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

console.log('--- Process & Migrate MeloSmile Workflows ---');

const OLD_SUPABASE = 'https://amhfdzfcmpastmlsosou.supabase.co';
const NEW_SUPABASE = 'https://xylqytpudbdcsbuuwqpi.supabase.co';

const OLD_APP_URL = 'http://localhost:3028';
const NEW_APP_URL = 'https://agenda.melosmile.com';

const OLD_N8N_URL = 'https://n8n.mumaweb.com';
const NEW_N8N_URL = 'https://n8n.mumaweb.com'; // Note: User target is n8nv2.mumaweb.com

const summary = [];

for (const wf of workflowStepMap) {
  const filePath = path.join(stepsDir, `${wf.step}/output.txt`);
  if (!fs.existsSync(filePath)) {
    console.error(`Step file not found: ${filePath}`);
    continue;
  }

  const fileRaw = fs.readFileSync(filePath, 'utf8');
  let parsed = JSON.parse(fileRaw);
  let wfData = parsed.data || parsed;

  let rawJson = JSON.stringify(wfData, null, 2);

  let replacementsCount = 0;

  // Perform production URL replacements
  if (rawJson.includes(OLD_SUPABASE)) {
    rawJson = rawJson.replaceAll(OLD_SUPABASE, NEW_SUPABASE);
    replacementsCount++;
  }
  if (rawJson.includes(OLD_APP_URL)) {
    rawJson = rawJson.replaceAll(OLD_APP_URL, NEW_APP_URL);
    replacementsCount++;
  }

  const cleanedWorkflow = JSON.parse(rawJson);

  // Write out cleaned workflow JSON
  const outputPath = path.join(targetDir, wf.filename);
  fs.writeFileSync(outputPath, JSON.stringify(cleanedWorkflow, null, 2), 'utf8');

  summary.push({
    name: wf.name,
    filename: wf.filename,
    nodesCount: cleanedWorkflow.nodes ? cleanedWorkflow.nodes.length : 0,
    replacements: replacementsCount,
    outputPath
  });

  console.log(`✅ ${wf.name} -> saved to ${wf.filename} (${cleanedWorkflow.nodes ? cleanedWorkflow.nodes.length : 0} nodes)`);
}

console.log(`\nProcessed ${summary.length} workflows into ${targetDir}`);
