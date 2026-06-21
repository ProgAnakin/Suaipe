// Absolute base URL of the deployed PWA.
//
// Product images are bundled static assets served from this origin (e.g.
// https://suaipe.vercel.app/products/aurae-pulse-pro.png). They MUST be made
// absolute before they're stored in the match-email snapshot: email clients
// have no document base, so a root-relative `/products/x.png` never loads.
//
// The kiosk can also run inside Capacitor (native iOS/Android) where
// `window.location.origin` is a non-web scheme like `capacitor://localhost`,
// so we never derive the base from the runtime origin — we pin it to the
// deployed web domain. Override per-deploy with VITE_SITE_URL; defaults to the
// production Vercel domain.
export const SITE_URL = (
  (import.meta.env.VITE_SITE_URL as string | undefined)?.trim() ||
  "https://suaipe.vercel.app"
).replace(/\/+$/, "");
