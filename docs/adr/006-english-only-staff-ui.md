# ADR 006 — Staff dashboards are English-only (the customer kiosk is multilingual)

**Status:** Accepted — 2026-06

## Context

The product has two very different audiences:

- **Customers** walk up to the kiosk unprompted and self-select one of **5 languages** (it / en / pt / es / fr). The entire customer-facing flow (`src/i18n/translations.ts`) is fully translated and guarded by `src/__tests__/i18nCompleteness.test.ts`.
- **Staff** (managers + consultants) use the back-office dashboards — `/manager`, `/stats`, `/consulente` — a small, fixed, trained internal team across the 4 stores.

The staff dashboards are written in **hardcoded English** (no `useLang()` / `t()` wiring). That was an implicit choice; this ADR makes it explicit so it doesn't read as an oversight.

## Decision

Keep the staff dashboards **English-only**. Do not translate `/manager` and `/stats` into the five customer languages.

## Rationale

- **Audience.** The kiosk serves anonymous walk-ups who *must* read in their own language. Staff are a handful of trained employees onboarded with the tool — English is a reasonable internal lingua-franca.
- **Cost vs. value.** Translating ~20 admin screens × 5 languages, and keeping them in sync on every UI change, is a large recurring cost for little benefit to a fixed internal team.
- **No half-measures.** A partially-translated dashboard (one screen localised, the rest English) is *worse* than a consistently-English one — it signals an intent that isn't followed through. Consistency wins.

## Consequences

- New staff-facing UI is written directly in English, with no `t()` indirection — simpler code and one less thing to keep in five-way sync.
- The customer kiosk stays the only i18n surface; the completeness test keeps it honest.
- **Revisit if** a store hires staff not comfortable in English. The most likely next step would be to localise the **manager dashboard to Italian** (the operators' working language) rather than all five — recorded here, not built.

## Notes

The data model and route/tab names are Italian (`nome`, `cognome`, `gestione`, `consulente`) — a historical naming convention from the IT-first origin, independent of the rendered UI language.
