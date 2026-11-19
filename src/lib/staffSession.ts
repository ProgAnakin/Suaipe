import { supabase, AUTH_STORAGE_KEY } from "@/integrations/supabase/client";

/**
 * The kiosk page never runs with a staff session in the browser.
 *
 * A staff member who leaves /stats, /manager or /consulente through the browser's Back button — or through the
 * "Back to quiz" / "Home" button of a login step, where the password has been accepted and the second factor has
 * not — would otherwise leave a live (or half-authenticated) session in this tab's storage for the next
 * customer's touch to inherit. Every request the kiosk makes would also be sent AS that staff member instead of
 * as the public (anon) role.
 *
 * Scope "local": ends THIS browser's session (on the server too) and removes it here; the same person's other
 * devices stay signed in. A no-op when nobody is signed in, and it never throws.
 *
 * supabase-js keeps the session when the sign-out REQUEST fails (offline, a dropped connection, navigating away
 * mid-request): it returns the error and leaves the storage as it was. A kiosk's wifi is exactly where that
 * happens, so the browser then forgets the session by itself — the server-side session simply expires on its own.
 */
export async function endStaffSession(): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) forgetSessionLocally();
  } catch {
    forgetSessionLocally();
  }
}

function forgetSessionLocally(): void {
  try {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    /* storage blocked: nothing was stored there either */
  }
}
