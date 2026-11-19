import { describe, it, expect } from "vitest";
import type { ErrorEvent } from "@sentry/react";
import { redactEmails, stripUrl, scrubBreadcrumb, scrubEvent } from "@/lib/sentryScrub";

// An error monitor must learn where something broke, never what a customer typed or a staff member looked up.

describe("redactEmails", () => {
  it("hides an address wherever it appears, however it is quoted", () => {
    expect(redactEmails("Key (email)=(marco.rossi+tag@example.co.uk) already exists")).toBe("Key (email)=([email]) already exists");
    expect(redactEmails('invalid input "a@b.io" and c@d.com')).toBe('invalid input "[email]" and [email]');
  });
  it("leaves a text without an address alone", () => {
    expect(redactEmails("duplicate key value violates unique constraint quiz_sessions_pkey")).toBe("duplicate key value violates unique constraint quiz_sessions_pkey");
    expect(redactEmails("user@host")).toBe("user@host"); // not an address
  });
});

describe("stripUrl", () => {
  it("drops the query string and the fragment — a search term, a recovery token", () => {
    expect(stripUrl("https://x.supabase.co/rest/v1/quiz_sessions?or=(email.ilike.*marco*)&limit=20")).toBe("https://x.supabase.co/rest/v1/quiz_sessions");
    expect(stripUrl("https://app.example/reset-password#access_token=abc&type=recovery")).toBe("https://app.example/reset-password");
    expect(stripUrl("/stats")).toBe("/stats");
  });
});

describe("scrubBreadcrumb", () => {
  it("drops console output and input events outright", () => {
    expect(scrubBreadcrumb({ category: "console", message: "[suaipe] insert failed marco@example.com" })).toBeNull();
    expect(scrubBreadcrumb({ category: "ui.input", message: "input#email" })).toBeNull();
  });
  it("keeps a request, minus its query string; keeps a click", () => {
    const fetchCrumb = scrubBreadcrumb({ category: "fetch", data: { method: "GET", status_code: 500, url: "https://x.supabase.co/rest/v1/quiz_sessions?email=eq.marco%40example.com" } });
    expect(fetchCrumb?.data).toEqual({ method: "GET", status_code: 500, url: "https://x.supabase.co/rest/v1/quiz_sessions" });
    expect(scrubBreadcrumb({ category: "ui.click", message: "body > div > button.start" })?.message).toBe("body > div > button.start");
  });
  it("strips both URLs of a navigation", () => {
    expect(scrubBreadcrumb({ category: "navigation", data: { from: "/reset-password#access_token=t", to: "/stats?q=a" } })?.data).toEqual({ from: "/reset-password", to: "/stats" });
  });
});

describe("scrubEvent", () => {
  const event = (): ErrorEvent => ({
    type: undefined,
    message: "failed for marco@example.com",
    user: { email: "marco@example.com", ip_address: "203.0.113.7" },
    extra: { __serialized__: { details: "Key (email)=(marco@example.com) already exists" } },
    request: {
      url: "https://app.example/reset-password#access_token=secret-token&type=recovery",
      query_string: "q=marco",
      cookies: { a: "b" },
      data: { email: "marco@example.com" },
      headers: { Referer: "https://app.example/stats?q=marco", "User-Agent": "Mozilla/5.0 (iPad)" },
    },
    exception: { values: [{ type: "Error", value: "Key (email)=(marco@example.com) already exists", stacktrace: { frames: [{ filename: "app.js", lineno: 1 }] } }] },
    breadcrumbs: [
      { category: "console", message: "marco@example.com" },
      { category: "fetch", data: { url: "https://x.supabase.co/rest/v1/q?email=eq.marco" } },
    ],
  });

  it("removes the visitor, the query string, the cookies, the body and the referer", () => {
    const out = scrubEvent(event());
    expect(out.user).toBeUndefined();
    expect(out.extra).toBeUndefined();
    expect(out.request).toEqual({ url: "https://app.example/reset-password", headers: { "User-Agent": "Mozilla/5.0 (iPad)" } });
  });

  it("keeps what is needed to fix the bug: type, stack trace, the shape of the message", () => {
    const out = scrubEvent(event());
    expect(out.exception?.values?.[0]).toMatchObject({ type: "Error", value: "Key (email)=([email]) already exists" });
    expect(out.exception?.values?.[0].stacktrace?.frames?.[0]).toEqual({ filename: "app.js", lineno: 1 });
    expect(out.message).toBe("failed for [email]");
  });

  it("scrubs the breadcrumbs it carries", () => {
    const out = scrubEvent(event());
    expect(out.breadcrumbs).toEqual([{ category: "fetch", data: { url: "https://x.supabase.co/rest/v1/q" } }]);
  });

  it("never leaves an address or a token anywhere in the serialised event", () => {
    const text = JSON.stringify(scrubEvent(event()));
    expect(text).not.toMatch(/marco|secret-token|203\.0\.113/);
  });

  it("copes with a bare event", () => {
    expect(() => scrubEvent({ type: undefined } as ErrorEvent)).not.toThrow();
  });
});
