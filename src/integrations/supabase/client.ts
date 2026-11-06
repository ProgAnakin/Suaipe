import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { IS_DEMO } from '@/config/demo';
import { assertPublicSupabaseKey } from '@/lib/publicKey';

const SUPABASE_URL = IS_DEMO ? 'https://placeholder.supabase.co' : import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = IS_DEMO ? 'demo-public-key' : import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// ── Safety checks ────────────────────────────────────────────────────────────
// Fail fast if required env vars are missing — prevents silent runtime errors.
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    '[suaipe] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. '
    + 'Check your .env file or Vercel environment variables.',
  );
}

// Block accidental use of the service-role key in client code.
// Service-role keys bypass RLS and must NEVER reach the browser.
assertPublicSupabaseKey(SUPABASE_PUBLISHABLE_KEY);
export const LEGACY_AUTH_STORAGE_KEY = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`;

// ── Client ───────────────────────────────────────────────────────────────────
// sessionStorage clears when the tab closes — limits exposure on shared kiosks.
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  global: { fetch: (input, init) => fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(15_000) }) },
  auth: {
    storage: sessionStorage,
    storageKey: IS_DEMO ? 'suaipe-demo-auth' : 'suaipe-staff-auth',
    persistSession: !IS_DEMO,
    autoRefreshToken: !IS_DEMO,
  },
});
