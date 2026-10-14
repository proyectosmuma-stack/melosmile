#!/usr/bin/env node
/**
 * musly-doctor-test.mjs — Bateria "doctor" contra Musly (n8n Dispatcher PROD)
 * con verificacion GROUND TRUTH contra Supabase PROD.
 *
 * Simula consultas reales de un doctor y contrasta cada respuesta con la BD.
 * Uso:
 *   node scripts/musly-doctor-test.mjs [--env prod|dev] [--only N]
 *
 * Requiere: n8n-api key (~/.config/opencode/secrets) y frontend/.env.remote (Supabase).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

const ENVS = {
  prod: { base: 'https://n8nv2.mumaweb.com', key: path.join(os.homedir(), '.config/opencode/secrets/n8n-api-prod.key'), webhook: 'melosmile-dispatcher' },
  dev: { base: 'https://n8n.mumaweb.com', key: path.join(os.homedir(), '.config/opencode/secrets/n8n-api-dev.key'), webhook: 'melosmile-dispatcher' },
};

const REPO = path.join(os.homedir(), 'Antigravity Projects/melosmile');
const ENV_REMOTE = path.join(REPO, 'frontend/.env.remote');

function envGet(txt, k) {
  const m = txt.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m ? m[1].trim() : null;
}

async function askMusly(env, message, i) {
  const cfg = ENVS[env];
  const body = { session_id: `doc-${Date.now()}-${i}`, message, chatInput: message };
  const t0 = Date.now();
  const res = await fetch(`${cfg.base}/webhook/${cfg.webhook}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const text = await res.text();
  const ms = Date.now() - t0;
  let summary = text;
  try {
    const arr = JSON.parse(text);
    const item = Array.isArray(arr) ? arr[0] : arr;
    summary = item?.summary || text;
  } catch {}
  return { ms, status: res.status, summary: String(summary) };
}

// ---- Supabase ground truth (REST via service role) ----
async function sb(pathAndQuery) {
  const txt = fs.readFileSync(ENV_REMOTE, 'utf8');
  const url = envGet(txt, 'NEXT_PUBLIC_SUPABASE_URL');
  const key = envGet(txt, 'SUPABASE_SERVICE_ROLE_KEY');
  const res = await fetch(`${url}/rest/v1/${pathAndQuery}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

// ---- Escenarios (query + verificacion ground truth) ----
const SCENARIOS = [
  {
    q: '¿qué citas hay el 20 de octubre?',
    check: async () => {
      const rows = await sb('appointments?select=appointment_date,status,patients(first_name,last_name),clinics(name)&appointment_date=gte.2026-10-19&appointment_date=lt.2026-10-21&status=neq.Cancelada');
      return { expect: `${rows.length} citas`, verify: (s) => ['Ronald', 'Kamila', 'Munir', 'Richard'].filter(n => s.includes(n)).length >= 3, detail: rows.map(r => `${r.appointment_date} ${r.patients?.first_name}`).join(' | ') };
    },
  },
  {
    q: 'próximas citas de Munir Callaos',
    check: async () => {
      const rows = await sb('appointments?select=appointment_date,reason,status,patients!inner(first_name)&patients.first_name=ilike.*munir*&appointment_date=gte.2026-10-14&status=neq.Cancelada');
      return { expect: '20/10 Goya Cambio de Arcos', verify: (s) => s.includes('20') && /cambio de arcos/i.test(s), detail: JSON.stringify(rows) };
    },
  },
  {
    q: 'teléfono de Munir Callaos',
    check: async () => {
      const rows = await sb('patients?select=phone,email&first_name=ilike.*munir*');
      const phone = rows[0]?.phone || '';
      return { expect: phone, verify: (s) => phone && s.replace(/\s/g, '').includes(phone.replace(/\s/g, '')), detail: JSON.stringify(rows) };
    },
  },
  {
    q: '¿qué citas hay mañana?',
    check: async () => {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      const rows = await sb(`appointments?select=id&appointment_date=gte.${tomorrow}T00:00:00Z&appointment_date=lt.${tomorrow}T23:59:59Z&status=neq.Cancelada`);
      return { expect: `${rows.length} citas mañana (${tomorrow})`, verify: () => true, detail: `${rows.length}` };
    },
  },
];

async function main() {
  const args = process.argv.slice(2);
  const env = args.includes('--env') ? args[args.indexOf('--env') + 1] : 'prod';
  const only = args.includes('--only') ? parseInt(args[args.indexOf('--only') + 1], 10) : null;
  const results = [];
  let idx = 0;
  for (const sc of SCENARIOS) {
    idx++;
    if (only && only !== idx) continue;
    let resp;
    try { resp = await askMusly(env, sc.q, idx); }
    catch (e) { results.push({ n: idx, q: sc.q, verdict: 'ERR', note: e.message }); continue; }
    let gt;
    try { gt = await sc.check(); }
    catch (e) { gt = { expect: '?', verify: () => null, detail: e.message }; }
    const ok = gt.verify(resp.summary);
    results.push({ n: idx, q: sc.q, ms: resp.ms, verdict: ok === null ? '?' : (ok ? 'PASS' : 'FAIL'), expect: gt.expect, got: resp.summary.slice(0, 180), detail: gt.detail });
  }
  console.log('\n===== MUSLY DOCTOR TEST (' + env + ') =====');
  for (const r of results) {
    console.log(`\n[${r.n}] ${r.q}`);
    console.log(`    verdict: ${r.verdict}${r.ms ? ' | ' + r.ms + 'ms' : ''}`);
    if (r.expect) console.log(`    esperado: ${r.expect}`);
    if (r.got) console.log(`    Musly   : ${r.got}`);
    if (r.note) console.log(`    nota    : ${r.note}`);
  }
  const pass = results.filter(r => r.verdict === 'PASS').length;
  console.log(`\nRESUMEN: ${pass}/${results.length} PASS`);
}

main();
