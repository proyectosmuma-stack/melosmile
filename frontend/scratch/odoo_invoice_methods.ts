import { createClient } from '@supabase/supabase-js';
import { fetchOdooData, callOdooRpc } from './src/lib/odoo/client.ts';
// We need to check if lib/odoo/client.ts has methods for getting invoice status and pdf
