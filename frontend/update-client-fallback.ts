import * as fs from 'fs';

let content = fs.readFileSync('src/lib/odoo/client.ts', 'utf8');

const targetStr = `  let existingIds: number[] = [];
  if (patient.odoo_partner_id) {
    existingIds = [patient.odoo_partner_id];
  }

  // Search by VAT/NIF first
  if (existingIds.length === 0 && patient.nif_cif) {
    existingIds = await odooExecute('res.partner', 'search', [
      [['vat', '=', patient.nif_cif]],
    ]);
  }

  // Fallback to email if VAT not found
  if (existingIds.length === 0 && patient.email) {
    existingIds = await odooExecute('res.partner', 'search', [
      [['email', '=', patient.email]],
    ]);
  }

  // Fallback to exact name match if email also not found
  if (existingIds.length === 0) {
    existingIds = await odooExecute('res.partner', 'search', [
      [['name', 'ilike', name]],
    ]);
  }

  // Fallback to full_name if billing_name didn't match
  if (existingIds.length === 0 && patient.full_name !== name) {
    existingIds = await odooExecute('res.partner', 'search', [
      [['name', 'ilike', patient.full_name]],
    ]);
  }`;

const replacementStr = `  let existingIds: number[] = [];
  let skipSearch = false;
  if (patient.odoo_partner_id) {
    existingIds = [patient.odoo_partner_id];
    skipSearch = true;
  }

  const performSearch = async () => {
    let ids: number[] = [];
    if (patient.nif_cif) {
      ids = await odooExecute('res.partner', 'search', [[['vat', '=', patient.nif_cif]]]);
    }
    if (ids.length === 0 && patient.email) {
      ids = await odooExecute('res.partner', 'search', [[['email', '=', patient.email]]]);
    }
    if (ids.length === 0) {
      ids = await odooExecute('res.partner', 'search', [[['name', 'ilike', name]]]);
    }
    if (ids.length === 0 && patient.full_name !== name) {
      ids = await odooExecute('res.partner', 'search', [[['name', 'ilike', patient.full_name]]]);
    }
    return ids;
  };

  if (!skipSearch) {
    existingIds = await performSearch();
  }`;

content = content.replace(targetStr, replacementStr);

const targetStr2 = `  if (existingIds.length > 0) {
    try {
      await odooExecute('res.partner', 'write', [[existingIds[0]], providedVals]);
      return existingIds[0];
    } catch (error: any) {
      if ((error.message && error.message.toLowerCase().includes('eliminado')) || (error.message && error.message.toLowerCase().includes('exist'))) {
        console.warn(\`Partner ID \${existingIds[0]} missing in Odoo. Falling back to recreate.\`);
        existingIds = []; // clear to force create below
      } else {
        throw error;
      }
    }
  }`;

const replacementStr2 = `  if (existingIds.length > 0) {
    try {
      await odooExecute('res.partner', 'write', [[existingIds[0]], providedVals]);
      return existingIds[0];
    } catch (error: any) {
      if ((error.message && error.message.toLowerCase().includes('eliminado')) || (error.message && error.message.toLowerCase().includes('exist'))) {
        console.warn(\`Partner ID \${existingIds[0]} missing in Odoo. Falling back to search.\`);
        // The mapped ID was deleted or doesn't exist. Search for a matching partner instead!
        existingIds = await performSearch();
        
        if (existingIds.length > 0) {
          // Found an alternative matching partner. Let's update that one instead.
          await odooExecute('res.partner', 'write', [[existingIds[0]], providedVals]);
          return existingIds[0];
        }
        // If still 0, it falls through to create below.
      } else {
        throw error;
      }
    }
  }`;

content = content.replace(targetStr2, replacementStr2);

fs.writeFileSync('src/lib/odoo/client.ts', content);
