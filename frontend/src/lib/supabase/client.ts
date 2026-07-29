import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { env } from '@/config/env';

const supabaseUrl = env.supabase.url;
const supabaseAnonKey = env.supabase.anonKey;

if (!supabaseUrl) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_URL");
}
if (!supabaseAnonKey) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

