import type { Breadcrumb, ErrorEvent } from "@sentry/react";

// What the error monitor is allowed to learn about a visitor. The kiosk collects a stranger's name and e-mail,
// the staff areas show other people's; a monitor that receives an error should learn WHERE it happened, never
// WHAT was typed, searched for or shown. (Replay and performance tracing are off — see src/main.tsx.)

const EMAIL = /[^\s"'<>(),;:@]+@[^\s"'<>(),;:@]+\.[^\s"'<>(),;:@]+/g;

/** Any e-mail address inside a text becomes "[email]" — a database error can quote the offending value. */
export function redactEmails(text: string): string {
  return text.replace(EMAIL, "[email]");
}

/** A URL without its query string and fragment: a search term, or the token of a password-recovery link, never leaves the browser. */
export function stripUrl(url: string): string {
  return url.split(/[?#]/)[0];
}

/** Drops what can carry typed text (console output, input events) and strips the URLs of what is kept. */
export function scrubBreadcrumb(crumb: Breadcrumb): Breadcrumb | null {
  if (crumb.category === "console" || crumb.category === "ui.input") return null;
  const out: Breadcrumb = { ...crumb };
  if (typeof out.message === "string") out.message = redactEmails(out.message);
  if (out.data) {
    const data: Record<string, unknown> = { ...out.data };
    for (const key of ["url", "from", "to"]) {
      if (typeof data[key] === "string") data[key] = stripUrl(data[key] as string);
    }
    for (const key of Object.keys(data)) {
      if (typeof data[key] === "string") data[key] = redactEmails(data[key] as string);
    }
    out.data = data;
  }
  return out;
}

/** The event keeps its type, stack trace and release — and loses the visitor, the query string and any quoted e-mail address. */
export function scrubEvent<E extends ErrorEvent>(event: E): E {
  delete event.user;
  delete event.extra; // a promise rejected with an object (a database error) is serialised here, details included
  if (event.request) {
    if (event.request.url) event.request.url = stripUrl(event.request.url);
    delete event.request.query_string;
    delete event.request.cookies;
    delete event.request.data;
    if (event.request.headers) {
      const { ["User-Agent"]: userAgent } = event.request.headers;
      event.request.headers = userAgent ? { "User-Agent": userAgent } : {}; // the Referer carries the previous page's query string
    }
  }
  if (event.message) event.message = redactEmails(event.message);
  event.exception?.values?.forEach((value) => {
    if (value.value) value.value = redactEmails(value.value);
  });
  event.breadcrumbs = event.breadcrumbs?.map(scrubBreadcrumb).filter((c): c is Breadcrumb => c !== null);
  return event;
}
