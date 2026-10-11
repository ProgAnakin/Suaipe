import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { translations, type Lang } from "@/i18n/translations";

// The GDPR notice has to name the company that OPERATES the kiosk and a contact it actually reads. Both are
// set per deployment (VITE_PRIVACY_CONTROLLER / VITE_PRIVACY_EMAIL); a buyer must not have to edit the
// five translations in source to stop telling customers that "Suaipe" holds their data.

const LANGS = Object.keys(translations) as Lang[];

async function noticeText(lang: Lang): Promise<string> {
  vi.resetModules(); // the controller and the contact are read when the module loads
  localStorage.setItem("wb_lang", lang);
  const { LanguageProvider } = await import("@/i18n/LanguageContext");
  const { PrivacyNotice } = await import("@/components/PrivacyNotice");
  const { container, unmount } = render(<LanguageProvider><PrivacyNotice /></LanguageProvider>);
  const text = container.textContent ?? "";
  unmount();
  return text;
}

describe("PrivacyNotice", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    localStorage.clear();
  });

  for (const lang of LANGS) {
    it(`${lang}: names the product and its contact by default`, async () => {
      const text = await noticeText(lang);
      expect(text).toContain("Suaipe");
      expect(text).toContain("privacy@suaipe.app");
    });

    it(`${lang}: the operator's name and contact replace the defaults everywhere`, async () => {
      vi.stubEnv("VITE_PRIVACY_CONTROLLER", "Acme Retail S.r.l.");
      vi.stubEnv("VITE_PRIVACY_EMAIL", "dpo@acme.example");
      const text = await noticeText(lang);
      expect(text).toContain("Acme Retail S.r.l.");
      expect(text).toContain("dpo@acme.example");
      expect(text).not.toMatch(/suaipe/i);
    });
  }

  it("a blank setting falls back to the defaults instead of printing nothing", async () => {
    vi.stubEnv("VITE_PRIVACY_CONTROLLER", "   ");
    vi.stubEnv("VITE_PRIVACY_EMAIL", "");
    const text = await noticeText("en");
    expect(text).toContain("Suaipe is the controller");
    expect(text).toContain("privacy@suaipe.app");
  });
});
