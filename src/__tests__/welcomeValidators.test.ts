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
  });
});
