/**
 * Frontend Supabase client.
 *
 * Required environment variables (add to Vercel dashboard AND .env.local for dev):
 *   VITE_SUPABASE_URL      — your project URL, e.g. https://xxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY — your project anon/public key
 */
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
