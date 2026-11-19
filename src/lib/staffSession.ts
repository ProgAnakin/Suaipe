import { supabase } from "@/integrations/supabase/client";

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
 * devices stay signed in. A no-op when nobody is signed in, and it never throws — offline, or with storage
 * blocked, the idle logout and the session's own expiry still apply.
 */
export async function endStaffSession(): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session) await supabase.auth.signOut({ scope: "local" });
  } catch {
    /* nothing more can be done from here */
  }
}
