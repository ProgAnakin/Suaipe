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

describe("fetchAllPages — rows inserted while the read is under way", () => {
  it("a lead inserted between two pages is not counted twice when a key is given", async () => {
    // newest first: 2500 rows, ids 2499 … 0. After the first page one more lead arrives (id 2500) and sits on top,
    // so the whole list moves one place down: the last row of page 1 is again the first row of page 2.
    let live = Array.from({ length: 2500 }, (_, i) => ({ id: 2499 - i }));
    let calls = 0;
    const out = await fetchAllPages(
      (from, to) => {
        const result = { data: live.slice(from, to + 1), error: null };
        if (++calls === 1) live = [{ id: 2500 }, ...live];
        return Promise.resolve(result);
      },
      { key: (r) => String(r.id) },
    );
    const ids = out.rows.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length); // no repeated row
    expect(ids).toHaveLength(2500); // and every row that existed when the read began is there
    expect(Math.min(...ids)).toBe(0);
    expect(Math.max(...ids)).toBe(2499);
  });

  it("without a key the rows are returned as they come (the old behaviour)", async () => {
    let live = Array.from({ length: 2500 }, (_, i) => ({ id: 2499 - i }));
    let calls = 0;
    const out = await fetchAllPages((from, to) => {
      const result = { data: live.slice(from, to + 1), error: null };
      if (++calls === 1) live = [{ id: 2500 }, ...live];
      return Promise.resolve(result);
    });
    expect(out.rows.length).toBeGreaterThan(2500); // proves the scenario really repeats a row without the key
  });
});
