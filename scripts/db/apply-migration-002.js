#!/usr/bin/env node
/**
 * Apply migration 002 to Supabase via Management API
 * Run: SUPABASE_ACCESS_TOKEN=your_pat node scripts/apply-migration-002.js
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const PROJECT_REF = 'amhfdzfcmpastmlsosou';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error('❌ Set SUPABASE_ACCESS_TOKEN env var (your Supabase PAT from app.supabase.com/account/tokens)');
  process.exit(1);
}

const migrationFile = path.join(__dirname, '../../supabase/migrations/20260722000002_extended_schema.sql');
const sql = fs.readFileSync(migrationFile, 'utf8');

function executeSQL(query) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query });
    const req = https.request({
      hostname: 'api.supabase.com',
      port: 443,
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  console.log('🚀 Applying migration 002 to Supabase project:', PROJECT_REF);

  // Run the full migration as one query
  const result = await executeSQL(sql);

  if (result.status >= 200 && result.status < 300) {
    console.log('✅ Migration applied successfully!');
    console.log(JSON.stringify(result.body).slice(0, 200));
  } else {
    console.error('❌ Migration failed:', result.status);
    console.error(JSON.stringify(result.body, null, 2).slice(0, 1000));
  }
})().catch(console.error);
