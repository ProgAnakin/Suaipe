import { describe, expect, it } from "vitest";
import { fetchAllPages } from "@/lib/fetchAllPages";

// PostgREST silently caps a response at 1000 rows: these helpers must read every page.

const source = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i }));
const pager = (rows: { id: number }[], log: Array<[number, number]> = []) =>
  (from: number, to: number) => {
    log.push([from, to]);
    return Promise.resolve({ data: rows.slice(from, to + 1), error: null });
  };

describe("fetchAllPages", () => {
  it("reads everything, however many pages it takes", async () => {
    const log: Array<[number, number]> = [];
    const out = await fetchAllPages(pager(source(2500), log));
    expect(out.rows).toHaveLength(2500);
    expect(out.rows[0].id).toBe(0);
    expect(out.rows.at(-1)?.id).toBe(2499);
    expect(out.truncated).toBe(false);
    expect(log).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });
  it("stops after the page that comes back short, including the exact-multiple edge case", async () => {
    expect((await fetchAllPages(pager(source(0)))).rows).toHaveLength(0);
    expect((await fetchAllPages(pager(source(999)))).rows).toHaveLength(999);
    const log: Array<[number, number]> = [];
    const exact = await fetchAllPages(pager(source(2000), log));
    expect(exact.rows).toHaveLength(2000);
    expect(log).toHaveLength(3); // the third page is empty and ends the loop
  });
  it("reports truncation at the safety cap instead of pretending the list is complete", async () => {
    const out = await fetchAllPages(pager(source(10_000)), { pageSize: 1000, maxRows: 3000 });
    expect(out.rows).toHaveLength(3000);
    expect(out.truncated).toBe(true);
  });
  it("returns the error and what was read before it", async () => {
    let calls = 0;
    const out = await fetchAllPages((from, to) => {
      calls++;
      return Promise.resolve(calls === 1
        ? { data: source(1000).slice(from, to + 1), error: null }
        : { data: null, error: { message: "boom" } });
    });
    expect(out.error?.message).toBe("boom");
    expect(out.rows).toHaveLength(1000);
  });
});
