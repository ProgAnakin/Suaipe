import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the supabase client before importing the module under test. Both the
// Edge Function path (functions.invoke) and the RPC fallback (rpc) are mocked
// so we can drive every branch of the dual-path verification deterministically.
const invokeMock = vi.fn();
const rpcMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

vi.mock("@/lib/clientId", () => ({
  getClientId: () => "test-client-id",
}));

import { verifyStaffPin } from "@/lib/verifyStaffPin";

beforeEach(() => {
  invokeMock.mockReset();
  rpcMock.mockReset();
});

describe("verifyStaffPin", () => {
  it("returns the Edge Function result when it succeeds (valid PIN)", async () => {
    invokeMock.mockResolvedValue({ data: { valid: true, locked_seconds: 0 }, error: null });
    const result = await verifyStaffPin("1234");
    expect(result).toEqual({ valid: true, locked_seconds: 0 });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("returns the Edge Function result for an invalid PIN with lockout", async () => {
    invokeMock.mockResolvedValue({ data: { valid: false, locked_seconds: 30 }, error: null });
    const result = await verifyStaffPin("0000");
    expect(result).toEqual({ valid: false, locked_seconds: 30 });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("forwards pin, client id and user agent to the Edge Function", async () => {
    invokeMock.mockResolvedValue({ data: { valid: true, locked_seconds: 0 }, error: null });
    await verifyStaffPin("4321");
    expect(invokeMock).toHaveBeenCalledWith("verify-pin", {
      signal: expect.any(AbortSignal),
      body: {
        pin_input: "4321",
        client_id: "test-client-id",
        user_agent: navigator.userAgent,
      },
    });
  });

  it("fails closed without SQL fallback when the Edge Function returns an error", async () => {
    invokeMock.mockResolvedValue({ data: null, error: { message: "boom" } });
    rpcMock.mockResolvedValue({ data: { valid: true, locked_seconds: 0 }, error: null });
    const result = await verifyStaffPin("1234");
    expect(result).toBeNull();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("fails closed without SQL fallback when the Edge Function throws (network down)", async () => {
    invokeMock.mockRejectedValue(new Error("network unreachable"));
    rpcMock.mockResolvedValue({ data: { valid: false, locked_seconds: 10 }, error: null });
    const result = await verifyStaffPin("1234");
    expect(result).toBeNull();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("fails closed without SQL fallback when the Edge Function returns a malformed payload", async () => {
    // Missing the boolean `valid` field → must not be trusted.
    invokeMock.mockResolvedValue({ data: { something: "else" }, error: null });
    rpcMock.mockResolvedValue({ data: { valid: true, locked_seconds: 0 }, error: null });
    const result = await verifyStaffPin("1234");
    expect(result).toBeNull();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("returns null when the Edge path fails at network level", async () => {
    invokeMock.mockRejectedValue(new Error("edge down"));
    rpcMock.mockRejectedValue(new Error("rpc down"));
    const result = await verifyStaffPin("1234");
    expect(result).toBeNull();
  });

  it("returns null (treated as invalid) when Edge yields no valid result", async () => {
    invokeMock.mockResolvedValue({ data: null, error: { message: "boom" } });
    rpcMock.mockResolvedValue({ data: null });
    const result = await verifyStaffPin("1234");
    expect(result).toBeNull();
  });
});
