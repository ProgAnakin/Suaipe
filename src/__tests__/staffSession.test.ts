import { describe, it, expect, vi, beforeEach } from "vitest";

const getSession = vi.fn();
const signOut = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: (...a: unknown[]) => getSession(...a), signOut: (...a: unknown[]) => signOut(...a) } } }));

import { endStaffSession } from "@/lib/staffSession";

// The kiosk page must never keep a staff member signed in: the next customer would inherit the session.

describe("endStaffSession", () => {
  beforeEach(() => {
    getSession.mockReset();
    signOut.mockReset();
    signOut.mockResolvedValue({ error: null });
  });

  it("signs a signed-in browser out — this browser only, not the person's other devices", async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: "x" } }, error: null });
    await endStaffSession();
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("does nothing when nobody is signed in (the normal kiosk start)", async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null });
    await endStaffSession();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("never throws — not when the session cannot be read, not when the sign-out fails", async () => {
    getSession.mockRejectedValue(new Error("storage blocked"));
    await expect(endStaffSession()).resolves.toBeUndefined();
    getSession.mockResolvedValue({ data: { session: { access_token: "x" } }, error: null });
    signOut.mockRejectedValue(new Error("offline"));
    await expect(endStaffSession()).resolves.toBeUndefined();
  });
});
