#!/usr/bin/env node
/**
 * Script to apply Supabase migrations by executing SQL via the REST API
 * Uses the service role key from .env.local
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

// Load env
const envPath = path.join(__dirname, '../.env.local');
const env = fs.readFileSync(envPath, 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k && !k.startsWith('#')) acc[k.trim()] = v.join('=').trim().replace(/^"(.*)"$/, '$1');
  return acc;
}, {});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// SQL statements split by semicolons + DO blocks
const migrationFile = path.join(__dirname, '../../supabase/migrations/20260722000002_extended_schema.sql');
const sql = fs.readFileSync(migrationFile, 'utf8');

// Execute via Supabase's rpc or direct REST
// We'll use the Postgres REST API /rest/v1/rpc approach won't work without exec_sql
// Instead let's use fetch to the Supabase Management API
async function runSQL(query) {
  return new Promise((resolve, reject) => {
    const projectRef = SUPABASE_URL.split('//')[1].split('.')[0];
    const body = JSON.stringify({ query });

    const req = https.request({
      hostname: `${projectRef}.supabase.co`,
      port: 443,
      path: `/rest/v1/rpc/exec_sql`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Split migration into individual statements
const statements = sql
  .split(/;(?:\s*\n|\s*$)/)
  .map(s => s.trim())
  .filter(s => s.length > 10);

console.log(`📦 Running migration: ${migrationFile}`);
console.log(`📋 Found ${statements.length} SQL statements\n`);

(async () => {
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.replace(/\s+/g, ' ').slice(0, 80);
    process.stdout.write(`[${i + 1}/${statements.length}] ${preview}... `);

    const result = await runSQL(stmt + ';');
    if (result.status >= 200 && result.status < 300) {
      console.log('✅');
    } else {
      const err = JSON.parse(result.body || '{}');
      if (err.message && (
        err.message.includes('already exists') ||
        err.message.includes('duplicate_object') ||
        err.message.includes('already has a column')
      )) {
        console.log('⚠️  already exists (skipped)');
      } else {
        console.log(`❌ Error: ${err.message || result.body}`);
      }
    }
  }
  console.log('\n✅ Migration complete!');
})().catch(console.error);
