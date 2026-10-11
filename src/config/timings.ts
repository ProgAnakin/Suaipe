// Central timing configuration — change here to affect the whole app.

/** Quiz inactivity: ms without touch before showing the "Sei ancora qui?" warning */
export const INACTIVITY_TIMEOUT_MS = 45_000;

/** Result screen inactivity: longer timeout so users can read before auto-reset */
export const RESULT_INACTIVITY_TIMEOUT_MS = 90_000;

/** Warning overlay countdown duration before auto-resetting the quiz */
export const WARNING_DURATION_MS = 10_000;

/** Admin pages (Stats / Manager): ms idle before auto-logout */
export const ADMIN_IDLE_TIMEOUT_MS = 10 * 60 * 1000;

/** How often a kiosk that sits idle on the attract screen re-reads the catalogue, the store settings and
 *  the quiz cards — so a price, a product or a question changed in /manager reaches it without a reload. */
export const STARTUP_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/** A restart, a wake-up or a reconnect refreshes that data only if the last read is older than this. */
export const STARTUP_REFRESH_MIN_GAP_MS = 60 * 1000;

/** One network attempt that has not answered after this long is abandoned (and, for the claim, retried). */
export const NETWORK_TIMEOUT_MS = 12_000;

/** The e-mail cooldown pre-check. The server rate-limits e-mails anyway, so on a slow network the
 *  visitor is let through after this long instead of waiting on a form that never answers. */
export const COOLDOWN_CHECK_TIMEOUT_MS = 6_000;
