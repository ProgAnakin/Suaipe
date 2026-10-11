import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TimeoutError, withTimeout } from "@/lib/withTimeout";

// A request that never answers must turn into an error, not into a frozen kiosk.

describe("withTimeout", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("resolves with the value when the promise settles in time", async () => {
    const p = withTimeout(Promise.resolve(42), 1000, "x");
    await expect(p).resolves.toBe(42);
  });

  it("passes a rejection through unchanged", async () => {
    const boom = new Error("boom");
    await expect(withTimeout(Promise.reject(boom), 1000)).rejects.toBe(boom);
  });

  it("rejects with a TimeoutError when the promise never settles", async () => {
    const never = new Promise<never>(() => {});
    const p = withTimeout(never, 5000, "cooldown check");
    const assertion = expect(p).rejects.toMatchObject({ name: "TimeoutError", message: "cooldown check timed out after 5000 ms" });
    await vi.advanceTimersByTimeAsync(5000);
    await assertion;
    expect(new TimeoutError("a", 1)).toBeInstanceOf(Error);
  });

  it("ignores a late answer after the timeout", async () => {
    let resolveLate!: (v: string) => void;
    const late = new Promise<string>((r) => { resolveLate = r; });
    const p = withTimeout(late, 100);
    const assertion = expect(p).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
    resolveLate("too late"); // must not throw or change anything
  });

  it("clears its timer once settled (no pending timers left behind)", async () => {
    await withTimeout(Promise.resolve(1), 10_000);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("accepts any thenable (a Supabase query builder is one)", async () => {
    const thenable = { then: (ok: (v: string) => void) => ok("from a thenable") } as unknown as PromiseLike<string>;
    await expect(withTimeout(thenable, 1000)).resolves.toBe("from a thenable");
  });
});
