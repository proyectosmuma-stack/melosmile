/**
 * Configuración centralizada de entorno.
 * Actúa como el wp-config.php de WordPress, donde todas las variables 
 * de entorno se validan y exportan desde un solo lugar.
 */

export const env = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  odoo: {
    url: process.env.ODOO_URL,
    db: process.env.ODOO_DB,
    user: process.env.ODOO_USER,
    password: process.env.ODOO_PASSWORD,
    apiKey: process.env.ODOO_API_KEY,
  },
  n8n: {
    webhookBaseUrl: process.env.N8N_WEBHOOK_BASE_URL,
    apiKey: process.env.N8N_API_KEY,
  }
};

// Validación de variables críticas para evitar fallos silenciosos
export function validateEnv() {
  if (!env.supabase.url) {
    throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!env.supabase.anonKey) {
    throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
}
