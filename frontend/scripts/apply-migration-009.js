#!/usr/bin/env node
/**
 * Script to apply migration 009 to Supabase via Management API
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
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || ANON_KEY;

const migrationFile = path.join(__dirname, '../../supabase/migrations/20260722000009_odoo_pricelist_sync.sql');
const sql = fs.readFileSync(migrationFile, 'utf8');

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
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
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

// Split into statements, keeping DO $$ blocks intact
function splitSQL(sql) {
  const stmts = [];
  let current = '';
  let inDollar = false;
  const lines = sql.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('--') || trimmed === '') {
      if (current.trim()) current += '\n';
      continue;
    }
    
    if (trimmed.includes('$$')) {
      inDollar = !inDollar;
    }
    
    current += line + '\n';
    
    if (!inDollar && trimmed.endsWith(';')) {
      if (current.trim().length > 5) {
        stmts.push(current.trim());
      }
      current = '';
    }
  }
  if (current.trim().length > 5) stmts.push(current.trim());
  return stmts;
}

const statements = splitSQL(sql);

console.log(`📦 Applying migration 009: ${path.basename(migrationFile)}`);
console.log(`📋 Found ${statements.length} SQL blocks\n`);

(async () => {
  // Run the whole migration as one block for reliability
  console.log('Running full migration as single block...');
  const result = await runSQL(sql);
  if (result.status >= 200 && result.status < 300) {
    console.log('✅ Migration 009 applied successfully!');
  } else {
    try {
      const err = JSON.parse(result.body || '{}');
      console.log(`⚠️  Status ${result.status}: ${err.message || result.body}`);
      // Try statement by statement as fallback
      console.log('\nFalling back to statement-by-statement execution...');
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        const preview = stmt.replace(/\s+/g, ' ').slice(0, 80);
        process.stdout.write(`[${i+1}/${statements.length}] ${preview}... `);
        const r2 = await runSQL(stmt);
        if (r2.status >= 200 && r2.status < 300) {
          console.log('✅');
        } else {
          const e2 = JSON.parse(r2.body || '{}');
          if (e2.message && (
            e2.message.includes('already exists') ||
            e2.message.includes('duplicate_object') ||
            e2.message.includes('already has a column') ||
            e2.message.includes('already inserted')
          )) {
            console.log('⚠️  already exists (skipped)');
          } else {
            console.log(`❌ ${e2.message || r2.body}`);
          }
        }
      }
    } catch (e) {
      console.log(`❌ Parse error: ${result.body}`);
    }
  }
  console.log('\n✅ Done!');
})().catch(console.error);
