import { describe, expect, it } from "vitest";
import { genDiscountCode } from "../../supabase/functions/_shared/discountCode";

// Covers the discount-code generator extracted from the on-session-created Edge
// Function — previously trapped inside serve() and untested. The format is a
// contract: store consultants read the last two digits as the discount %.

describe("genDiscountCode", () => {
  it("matches the SUP-XXXXXXXX## contract", () => {
    for (const pct of [5, 10, 15]) {
      expect(genDiscountCode(pct)).toMatch(/^SUP-[0-9A-F]{8}\d{2}$/);
    }
  });

  it("encodes the discount percent in the last two digits", () => {
    expect(genDiscountCode(5).slice(-2)).toBe("05");
    expect(genDiscountCode(10).slice(-2)).toBe("10");
    expect(genDiscountCode(15).slice(-2)).toBe("15");
  });

  it("is high-entropy — no hex collisions across 5000 draws", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 5000; i++) {
      seen.add(genDiscountCode(10).slice(4, 12)); // the 8-hex random segment
    }
    expect(seen.size).toBeGreaterThan(4990);
  });
});
