#!/usr/bin/env node
/**
 * scripts/sync_reports.js
 * 
 * SSOT para gestión y sincronización de reportes de errores de Musly (ai_agent_reports).
 * Sincroniza desde Supabase Cloud a los archivos locales logs/agent_reports.log.
 * 
 * Uso:
 *   node scripts/sync_reports.js                 # Lista reportes pendientes
 *   node scripts/sync_reports.js --list          # Lista todos los reportes (pendientes y resueltos)
 *   node scripts/sync_reports.js --sync          # Descarga y regenera logs/agent_reports.log
 *   node scripts/sync_reports.js --resolve <id> --notes "Corrección aplicada..."
 */

const fs = require('fs');
const path = require('path');

// Localizar directorio raíz
const rootDir = fs.existsSync(path.join(process.cwd(), 'frontend'))
  ? process.cwd()
  : path.resolve(process.cwd(), '..');

// Cargar variables de entorno (.env.local o .env.remote)
const envPaths = [
  path.join(rootDir, 'frontend', '.env.local'),
  path.join(rootDir, 'frontend', '.env.remote'),
  path.join(rootDir, '.env.local')
];

let envVars = {};
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    const content = fs.readFileSync(p, 'utf8');
    content.split('\n').forEach(line => {
      const m = line.match(/^([^=]+)=(.*)$/);
      if (m && !envVars[m[1].trim()]) {
        envVars[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
      }
    });
  }
}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || 'https://amhfdzfcmpastmlsosou.supabase.co';
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ Error: No se encontró clave de Supabase en .env.local / .env.remote');
  process.exit(1);
}

// Cargar Supabase Client
const supabaseModulePath = path.join(rootDir, 'frontend', 'node_modules', '@supabase', 'supabase-js');
const { createClient } = require(supabaseModulePath);
const supabase = createClient(supabaseUrl, supabaseKey);

function formatReportText(r) {
  const formattedDate = new Date(r.created_at).toLocaleString('es-ES', {
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  const header = `================================================================================\n`;
  const title = `[REPORTE DE ERROR / CONTEXTO IA - ${formattedDate}]\n`;
  const details = [
    `ID Reporte         : ${r.id}`,
    `ID Sesión          : ${r.session_id || 'Desconocida'}`,
    `Fecha y Hora       : ${formattedDate} (${r.created_at})`,
    `Agentes Involucrados: ${Array.isArray(r.participating_agents) ? r.participating_agents.join(', ') : (r.participating_agents || 'Musly Router')}`,
    `Comentario Usuario : "${(r.user_comment || '').trim()}"`,
    `Estado             : ${r.resolved ? '✅ RESUELTO (' + (r.resolved_at || '') + ')' : '🔴 PENDIENTE DE REVISIÓN'}`,
    r.resolution_notes ? `Notas Resolución   : ${r.resolution_notes}` : null,
    `\n------------------- HISTORIAL DE LA CONVERSACIÓN -------------------`,
  ].filter(Boolean).join('\n');

  let historyText = 'No se proporcionó historial.';
  if (Array.isArray(r.conversation_history) && r.conversation_history.length > 0) {
    historyText = r.conversation_history.map((m, idx) => {
      const role = m.role === 'user' ? 'USUARIO' : 'ASISTENTE (Musly)';
      const text = m.text || m.content || '';
      const intent = m.intent || m.payload?.intent ? ` [Intención: ${m.intent || m.payload?.intent}]` : '';
      return `[${idx + 1}] ${role}${intent}:\n${text}\n`;
    }).join('\n');
  }

  const footer = `\n================================================================================\n\n`;
  return header + title + details + '\n' + historyText + footer;
}

async function listReports(showAll = false, asJson = false) {
  let query = supabase.from('ai_agent_reports').select('*').order('created_at', { ascending: false });
  if (!showAll) {
    query = query.or('resolved.is.null,resolved.eq.false');
  }

  const { data, error } = await query;
  if (error) {
    console.error('❌ Error consultando Supabase:', error.message);
    process.exit(1);
  }

  if (asJson) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const title = showAll ? '📋 TODOS LOS REPORTES DE MUSLY (SUPABASE)' : '🔴 REPORTES PENDIENTES DE MUSLY (SIN RESOLVER)';
  console.log(`\n================================================================================`);
  console.log(`${title} [Total: ${data.length}]`);
  console.log(`================================================================================\n`);

  if (data.length === 0) {
    console.log('✅ No hay reportes pendientes. ¡Todo en orden!\n');
    return;
  }

  data.forEach((r, idx) => {
    const estado = r.resolved ? '✅ RESUELTO' : '🔴 PENDIENTE';
    console.log(`[${idx + 1}] ${r.created_at} | ${estado} | ID: ${r.id}`);
    console.log(`    Comentario: "${r.user_comment}"`);
    console.log(`    Agentes: ${JSON.stringify(r.participating_agents)}`);
    if (Array.isArray(r.conversation_history) && r.conversation_history.length > 0) {
      const lastUser = [...r.conversation_history].reverse().find(m => m.role === 'user');
      const lastAssistant = [...r.conversation_history].reverse().find(m => m.role === 'assistant');
      if (lastUser) console.log(`    Último prompt usuario: "${(lastUser.text || '').trim()}"`);
      if (lastAssistant) console.log(`    Última resp Musly   : "${(lastAssistant.text || '').trim().slice(0, 100)}..."`);
    }
    console.log(`--------------------------------------------------------------------------------`);
  });
}

async function syncReportsToFile() {
  console.log('🔄 Sincronizando reportes desde Supabase Cloud a los archivos de log locales...');
  const { data, error } = await supabase
    .from('ai_agent_reports')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Error descargando reportes de Supabase:', error.message);
    process.exit(1);
  }

  const fileHeader = `# ARCHIVO DE REGISTRO DE REPORTES DE ERROR IA (MELOSMILE)
# Fuente de Verdad Canónica (SSOT): Supabase Cloud (tabla: ai_agent_reports)
# Generado automáticamente por: node scripts/sync_reports.js --sync
# Total reportes sincronizados: ${data.length}
# Fecha de sincronización: ${new Date().toISOString()}

`;

  const fullContent = fileHeader + data.map(formatReportText).join('');

  const targetFiles = [
    path.join(rootDir, 'logs', 'agent_reports.log'),
    path.join(rootDir, 'frontend', 'logs', 'agent_reports.log')
  ];

  for (const f of targetFiles) {
    const dir = path.dirname(f);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(f, fullContent, 'utf8');
    console.log(`  ✅ Actualizado: ${path.relative(rootDir, f)} (${data.length} reportes)`);
  }

  console.log('🎉 Sincronización completa. Ambos archivos de log están al día con Supabase Cloud.\n');
}

async function resolveReport(reportId, notes) {
  if (!reportId) {
    console.error('❌ Error: Especifica el ID del reporte con --resolve <id>');
    process.exit(1);
  }
  console.log(`🛠️ Marcando reporte ${reportId} como resuelto...`);
  const { data, error } = await supabase
    .from('ai_agent_reports')
    .update({
      resolved: true,
      resolved_at: new Date().toISOString(),
      resolution_notes: notes || 'Resuelto mediante auditoría de agentes.',
    })
    .eq('id', reportId)
    .select();

  if (error) {
    console.error('❌ Error actualizando reporte en Supabase:', error.message);
    process.exit(1);
  }
  console.log(`✅ Reporte ${reportId} marcado como resuelto exitosamente.`);
  await syncReportsToFile();
}

// CLI args parser
const args = process.argv.slice(2);
if (args.includes('--sync')) {
  syncReportsToFile();
} else if (args.includes('--list') || args.includes('-l')) {
  listReports(true, args.includes('--json'));
} else if (args.includes('--resolve')) {
  const idIdx = args.indexOf('--resolve') + 1;
  const id = args[idIdx];
  const notesIdx = args.indexOf('--notes');
  const notes = notesIdx !== -1 ? args[notesIdx + 1] : '';
  resolveReport(id, notes);
} else {
  // Por defecto listar pendientes
  listReports(false, args.includes('--json'));
}
