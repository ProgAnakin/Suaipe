import { describe, it, expect, vi, beforeEach } from "vitest";

const getSession = vi.fn();
const signOut = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  AUTH_STORAGE_KEY: "sb-test-auth-token",
  supabase: { auth: { getSession: (...a: unknown[]) => getSession(...a), signOut: (...a: unknown[]) => signOut(...a) } },
}));

import { endStaffSession } from "@/lib/staffSession";

// The kiosk page must never keep a staff member signed in: the next customer would inherit the session.

describe("endStaffSession", () => {
  beforeEach(() => {
    sessionStorage.clear();
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

  // supabase-js returns the error — and KEEPS the session in storage — when the sign-out request cannot reach the
  // server. On a kiosk's wifi that is the case that matters: the browser must forget the session by itself.
  it("forgets the session locally when the sign-out request fails (offline, dropped connection)", async () => {
    sessionStorage.setItem("sb-test-auth-token", '{"access_token":"x"}');
    sessionStorage.setItem("something-else", "kept");
    getSession.mockResolvedValue({ data: { session: { access_token: "x" } }, error: null });
    signOut.mockResolvedValue({ error: new Error("Failed to fetch") });
    await endStaffSession();
    expect(sessionStorage.getItem("sb-test-auth-token")).toBeNull();
    expect(sessionStorage.getItem("something-else")).toBe("kept");
  });

  it("…and when the sign-out call itself throws", async () => {
    sessionStorage.setItem("sb-test-auth-token", '{"access_token":"x"}');
    getSession.mockResolvedValue({ data: { session: { access_token: "x" } }, error: null });
    signOut.mockRejectedValue(new Error("boom"));
    await endStaffSession();
    expect(sessionStorage.getItem("sb-test-auth-token")).toBeNull();
  });

  it("does not touch the storage when the sign-out worked (supabase-js already cleared it)", async () => {
    sessionStorage.setItem("sb-test-auth-token", "left-alone");
    getSession.mockResolvedValue({ data: { session: { access_token: "x" } }, error: null });
    await endStaffSession();
    expect(sessionStorage.getItem("sb-test-auth-token")).toBe("left-alone");
  });
});
