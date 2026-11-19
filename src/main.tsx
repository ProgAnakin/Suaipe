import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";
import { checkCacheIntegrity } from "./lib/startupCache";
import { scrubBreadcrumb, scrubEvent } from "./lib/sentryScrub";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
if (SENTRY_DSN) {
  // Errors only, and as little of the visitor as possible (src/lib/sentryScrub.ts). The kiosk collects a stranger's
  // name and e-mail, so: no performance tracing (its spans carry request URLs, search terms included) and no session
  // replay unless VITE_SENTRY_REPLAY=true — even masked, it is a recording of a person at a public kiosk.
  const replay = import.meta.env.VITE_SENTRY_REPLAY === "true";
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: replay ? 1.0 : 0,
    integrations: replay
      ? [Sentry.replayIntegration({ maskAllText: true, maskAllInputs: true, blockAllMedia: true })]
      : [],
    beforeBreadcrumb: scrubBreadcrumb,
    beforeSend: scrubEvent,
  });
}

checkCacheIntegrity();
createRoot(document.getElementById("root")!).render(<App />);
