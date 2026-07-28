/**
 * Supabase Server Client — uses service_role key, bypasses RLS.
 * ONLY import this in server-side code (API routes, Server Actions).
 * Never expose in client components.
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://amhfdzfcmpastmlsosou.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
