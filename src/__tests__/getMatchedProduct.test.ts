import { describe, it, expect } from "vitest";
import { getMatchedProduct, products } from "@/data/products";

describe("getMatchedProduct", () => {
  it("returns a product and a percent within [45, 98]", () => {
    const { product, matchPercent } = getMatchedProduct({ 1: true, 2: false });
    expect(product).toBeDefined();
    expect(matchPercent).toBeGreaterThanOrEqual(45);
    expect(matchPercent).toBeLessThanOrEqual(98);
  });

  it("picks randomly among tied top-scoring products", () => {
    // Q2=audio, Q5=travel — three products tie at score 2 (audio + travel)
    const answers = { 2: true, 5: true };
    const tiedIds = new Set([
      "aurae-pulse-pro",
      "vibewave-open",
      "echobox-riff",
    ]);
    const seen = new Set<string>();
    for (let i = 0; i < 80; i++) {
      const { product } = getMatchedProduct(answers);
      expect(tiedIds.has(product.id)).toBe(true);
      seen.add(product.id);
    }
    // Over 80 runs the random pick should surface more than one product.
    expect(seen.size).toBeGreaterThan(1);
  });

  it("respects activeIds filter", () => {
    const activeIds = new Set(["brevia-gopress"]);
    const { product } = getMatchedProduct({ 5: true, 3: true, 4: true }, activeIds);
    expect(product.id).toBe("brevia-gopress");
  });

  it("refuses an explicitly empty active set", () => {
    expect(() => getMatchedProduct({ 1: true }, new Set())).toThrow("No active products");
  });
  it("refuses an active set with no matching catalog rows", () => {
    expect(() => getMatchedProduct({}, new Set(["missing"]), products)).toThrow("No active products");
  });

  it("scores audio+productivity+travel answers toward Aurae Pulse Pro", () => {
    // Q2=audio, Q3=productivity, Q5=travel — unique 3/3 profile for aurae-pulse-pro
    const { product } = getMatchedProduct({ 2: true, 3: true, 5: true });
    expect(product.id).toBe("aurae-pulse-pro");
  });

  it("scores sport+wellness+recovery toward Pulsar Recover X", () => {
    // Q1=sport, Q4=wellness, Q8=recovery — unique 3/3 profile for pulsar-recover-x
    const { product } = getMatchedProduct({ 1: true, 4: true, 8: true });
    expect(product.id).toBe("pulsar-recover-x");
  });

  it("returns percent 45 when no tags match (floor clamping)", () => {
    // All false answers → 0 tag matches → clamped to MATCH_MIN = 45
    const { matchPercent } = getMatchedProduct({ 1: false, 2: false });
    expect(matchPercent).toBe(45);
  });

  it("never exceeds 98 (ceiling clamping)", () => {
    // Perfect 3/3 tag match (audio+productivity+travel → Aurae) → raw 100% → clamped to 98
    const { matchPercent } = getMatchedProduct({ 2: true, 3: true, 5: true });
    expect(matchPercent).toBeLessThanOrEqual(98);
  });

  it("refuses an explicitly empty catalog", () => {
    expect(() => getMatchedProduct({}, undefined, [])).toThrow("No active products");
  });
});
