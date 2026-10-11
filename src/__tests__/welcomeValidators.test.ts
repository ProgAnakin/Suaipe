import { describe, expect, it } from "vitest";
import { isValidEmail, isValidName, sanitizeName } from "@/lib/validators";

// Locks the real lead-capture gate (kiosk Welcome form) — the most security-
// and GDPR-relevant validation in the app, previously inline and untested.

describe("lead-capture validators", () => {
  describe("isValidEmail", () => {
    it("accepts well-formed addresses", () => {
      for (const e of ["a@b.co", "user.name+tag@sub.domain.com", "X_y%z@mail.io"]) {
        expect(isValidEmail(e)).toBe(true);
      }
    });
    it("trims surrounding whitespace before validating", () => {
      expect(isValidEmail("  user@host.com  ")).toBe(true);
    });
    it("enforces the RFC 5321 length limits (254 in total, 64 before the @)", () => {
      const domain = "@example.com";
      expect(isValidEmail("a".repeat(64) + domain)).toBe(true);
      expect(isValidEmail("a".repeat(65) + domain)).toBe(false);
      expect(isValidEmail("a".repeat(300) + domain)).toBe(false);
      // 64 + "@" + 189-char domain = exactly 254
      const longDomain = `${"d".repeat(60)}.${"d".repeat(60)}.${"d".repeat(60)}.com`;
      expect(("a".repeat(10) + "@" + longDomain).length).toBeLessThanOrEqual(254);
      expect(isValidEmail("a".repeat(10) + "@" + longDomain)).toBe(true);
      expect(isValidEmail("a".repeat(64) + "@" + longDomain + ".example")).toBe(false);
    });
    it("rejects malformed addresses", () => {
      for (const e of ["", "plain", "no@tld", "a@b.c", "two@@at.com", "space in@host.com", "trailing@dot."]) {
        expect(isValidEmail(e)).toBe(false);
      }
    });
  });

  describe("isValidName", () => {
    it("accepts any-script letters, spaces, apostrophes, hyphens (2–100)", () => {
      for (const n of ["Al", "José", "François", "O'Brien", "Anna-Maria", "Łukasz", "山田太郎"]) {
        expect(isValidName(n)).toBe(true);
      }
    });
    it("trims before measuring length", () => {
      expect(isValidName("  Ana  ")).toBe(true);
      expect(isValidName("   ")).toBe(false); // trims to empty
    });
    it("accepts combining marks, so decomposed accents and vowel signs are not mangled", () => {
      for (const n of ["Cafe\u0301", "Nguy\u1ec5n", "\u0915\u0941\u092e\u093e\u0930" /* Kumar, Devanagari */]) {
        expect(isValidName(n)).toBe(true);
      }
    });
    it("needs at least one real letter — punctuation alone is not a name", () => {
      for (const n of ["--", "''", "- -", "'-'"]) expect(isValidName(n)).toBe(false);
    });
    it("rejects too short, too long, or digit/symbol-bearing names", () => {
      expect(isValidName("A")).toBe(false);
      expect(isValidName("a".repeat(101))).toBe(false);
      for (const n of ["", "John3", "a@b", "<script>"]) {
        expect(isValidName(n)).toBe(false);
      }
    });
  });

  describe("sanitizeName", () => {
    it("strips digits and symbols, keeps letters", () => {
      expect(sanitizeName("José@2024")).toBe("José");
      expect(sanitizeName("J@#$n")).toBe("Jn");
    });
    it("collapses internal whitespace and caps length at 100", () => {
      expect(sanitizeName("Anna    Maria")).toBe("Anna Maria");
      expect(sanitizeName("x".repeat(150)).length).toBe(100);
    });
    it("keeps apostrophes and hyphens", () => {
      expect(sanitizeName("O'Brien-Smith")).toBe("O'Brien-Smith");
    });
    it("turns the typographic apostrophes of a touch keyboard into a plain one", () => {
      // iPadOS "smart punctuation" types ’ instead of ' — "D’Angelo" must not become "DAngelo"
      expect(sanitizeName("D\u2019Angelo")).toBe("D'Angelo");
      expect(sanitizeName("O\u2018Neil")).toBe("O'Neil");
      expect(sanitizeName("N\u02BCDiaye")).toBe("N'Diaye");
      expect(sanitizeName("Dell\u00B4Orto")).toBe("Dell'Orto");
    });
    it("keeps combining marks and stores names precomposed (NFC)", () => {
      expect(sanitizeName("Cafe\u0301")).toBe("Caf\u00e9");
      expect(sanitizeName("Cafe\u0301")).toHaveLength(4);
    });
  });
});
