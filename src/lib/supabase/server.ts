/**
 * Supabase Server Client — uses service_role key, bypasses RLS.
 * ONLY import this in server-side code (API routes, Server Actions).
 * Never expose in client components.
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { env } from '@/config/env';

const supabaseUrl = env.supabase.url;
const serviceRoleKey = env.supabase.serviceRoleKey;

if (!supabaseUrl) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_URL");
}
if (!serviceRoleKey) {
  throw new Error("Missing env.SUPABASE_SERVICE_ROLE_KEY");
}

export const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
