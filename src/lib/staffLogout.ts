import { supabase, LEGACY_AUTH_STORAGE_KEY } from '@/integrations/supabase/client';
import { clearStaffSessionStorage } from './kioskPrivacy';

/** Hide protected data immediately, even while the Auth service is offline. */
export function lockStaffSession(onLocked: () => void): void {
  clearStaffSessionStorage(LEGACY_AUTH_STORAGE_KEY);
  onLocked();
  // Local credentials are cleared again after any in-flight refresh finishes.
  // Remote revocation cannot be guaranteed without connectivity.
  void supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
    .finally(() => clearStaffSessionStorage(LEGACY_AUTH_STORAGE_KEY));
}
