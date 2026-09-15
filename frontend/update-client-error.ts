import * as fs from 'fs';

let content = fs.readFileSync('src/lib/odoo/client.ts', 'utf8');

const targetStr = `  if (existingIds.length > 0) {
    // Update existing partner
    await odooExecute('res.partner', 'write', [
      existingIds,
      providedVals
    ]);
    return existingIds[0];
  }`;

const replacementStr = `  if (existingIds.length > 0) {
    // Update existing partner
    try {
      await odooExecute('res.partner', 'write', [
        existingIds,
        providedVals
      ]);
      return existingIds[0];
    } catch (error: any) {
      // If Odoo says the record is deleted/missing, fallback to recreating or searching
      if (error.message && error.message.includes('deleted') || error.message.includes('exist')) {
        console.warn(\`Partner ID \${existingIds[0]} missing in Odoo. Falling back to recreate.\`);
        // Remove the invalid ID from Supabase if we can, but for now just clear existingIds to force create
        existingIds = [];
      } else {
        throw error;
      }
    }
  }`;

content = content.replace(targetStr, replacementStr);

fs.writeFileSync('src/lib/odoo/client.ts', content);
