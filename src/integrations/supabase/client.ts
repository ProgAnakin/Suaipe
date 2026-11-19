import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { assertPublicSupabaseKey } from '@/lib/publicKey';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// ── Safety checks ────────────────────────────────────────────────────────────
// Fail fast if required env vars are missing — prevents silent runtime errors.
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    '[suaipe] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. '
    + 'Check your .env file or Vercel environment variables.',
  );
}

// Block accidental use of the service-role key in client code.
// Service-role keys bypass RLS and must NEVER reach the browser (the same check runs when the app is built).
assertPublicSupabaseKey(SUPABASE_PUBLISHABLE_KEY);

// ── Client ───────────────────────────────────────────────────────────────────
// sessionStorage clears when the tab closes — limits exposure on shared kiosks.
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: sessionStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
