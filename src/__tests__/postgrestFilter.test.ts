import { describe, expect, it } from "vitest";
import { ilikeAny } from "@/lib/postgrestFilter";
import { isHttpUrl } from "@/lib/validators";
import { endOfLocalDayISO, startOfLocalDayISO } from "@/lib/dayRange";

describe("ilikeAny", () => {
  it("quotes the value so , . : ( ) cannot change the filter's structure", () => {
    expect(ilikeAny(["email", "nome"], "Smith (Jr)")).toBe('email.ilike."%Smith (Jr)%",nome.ilike."%Smith (Jr)%"');
    expect(ilikeAny(["email"], "a,b")).toBe('email.ilike."%a,b%"');
    // the _ is a LIKE wildcard: made literal (\_) and then that backslash is escaped for the quoting (\\_)
    expect(ilikeAny(["email"], "x),store_id.neq.zzz")).toBe('email.ilike."%x),store\\\\_id.neq.zzz%"');
  });
  it("makes LIKE wildcards literal and escapes quotes and backslashes for the quoting", () => {
    expect(ilikeAny(["nome"], "50%_off")).toBe('nome.ilike."%50\\\\%\\\\_off%"');
    expect(ilikeAny(["nome"], 'say "hi"')).toBe('nome.ilike."%say \\"hi\\"%"');
    expect(ilikeAny(["nome"], "back\\slash")).toBe('nome.ilike."%back\\\\\\\\slash%"');
  });
  it("returns null for an empty or blank term", () => {
    expect(ilikeAny(["email"], "")).toBeNull();
    expect(ilikeAny(["email"], "   ")).toBeNull();
  });
});

describe("isHttpUrl", () => {
  it("accepts http(s) links", () => {
    expect(isHttpUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
    expect(isHttpUrl("  http://example.com/a?b=c ")).toBe(true);
  });
  it("refuses everything that could run code or is not a link", () => {
    for (const v of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,<script>1</script>", "vbscript:x", "//evil.com", "/relative", "", "not a url", null, undefined, 42]) {
      expect(isHttpUrl(v), String(v)).toBe(false);
    }
  });
});

describe("local day bounds", () => {
  it("start/end of a local day are 23:59:59.999 apart and fall on that day", () => {
    const s = new Date(startOfLocalDayISO("2026-03-08"));
    const e = new Date(endOfLocalDayISO("2026-03-08"));
    expect(s.getFullYear()).toBe(2026);
    expect([s.getMonth(), s.getDate(), s.getHours(), s.getMinutes()]).toEqual([2, 8, 0, 0]);
    expect([e.getMonth(), e.getDate(), e.getHours(), e.getMinutes(), e.getSeconds()]).toEqual([2, 8, 23, 59, 59]);
    expect(e.getTime()).toBeGreaterThan(s.getTime());
  });
});
