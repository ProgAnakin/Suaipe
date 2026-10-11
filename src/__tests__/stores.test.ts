import { describe, expect, it } from "vitest";
import { DEFAULT_STORES, STORES, parseStores } from "@/data/stores";

// The stores are configuration: VITE_STORES replaces the built-in list, and a typo must never
// leave a kiosk without stores.

const ok = JSON.stringify([
  { id: "store-a", name: "My Brand Store A", shortName: "Store A" },
  { id: "store-b", name: " My Brand Store B ", shortName: "Store B" },
]);

describe("parseStores", () => {
  it("reads a valid list (and trims the names)", () => {
    expect(parseStores(ok)).toEqual([
      { id: "store-a", name: "My Brand Store A", shortName: "Store A" },
      { id: "store-b", name: "My Brand Store B", shortName: "Store B" },
    ]);
  });
  it("is null — so the built-in list applies — for anything unusable", () => {
    for (const bad of [undefined, null, "", "   ", "not json", "{}", "[]", '"a"', "42",
      JSON.stringify([{ id: "Store A", name: "x", shortName: "x" }]),          // not a slug
      JSON.stringify([{ id: "a", name: "x", shortName: "x" }]),                // too short
      JSON.stringify([{ id: "store-a", name: "", shortName: "x" }]),           // empty name
      JSON.stringify([{ id: "store-a", name: "x" }]),                          // no shortName
      JSON.stringify([{ id: "store-a", name: "x", shortName: "x" }, { id: "store-a", name: "y", shortName: "y" }]), // duplicate id
      JSON.stringify([null]),
      JSON.stringify([{ id: "store-a", name: "x", shortName: "x" }, "oops"]),
    ]) {
      expect(parseStores(bad), String(bad)).toBeNull();
    }
  });
});

describe("the built-in list", () => {
  it("is valid under the same rules, and is what the app uses when VITE_STORES is unset", () => {
    expect(parseStores(JSON.stringify(DEFAULT_STORES))).toEqual(DEFAULT_STORES);
    expect(STORES).toEqual(DEFAULT_STORES);
  });
});
