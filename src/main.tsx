import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";
import { checkCacheIntegrity } from "./lib/startupCache";
import { clearLegacyVisitorMarkers } from "./lib/kioskPrivacy";
import { IS_DEMO } from './config/demo';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
if (!IS_DEMO && SENTRY_DSN && import.meta.env.VITE_ENABLE_ERROR_MONITORING === "true") {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    // Operational errors only: no replay, session tracking or performance tracing.
    sendDefaultPii: false,
    integrations: integrations => integrations.filter(i => !['BrowserSession', 'BrowserTracing', 'Replay'].includes(i.name)),
    beforeSend(event) {
      delete event.user;
      delete event.request;
      delete event.breadcrumbs;
      delete event.extra;
      if (event.message) event.message = 'Application error';
      event.exception?.values?.forEach(value => { value.value = 'Application error'; });
      return event;
    },
  });
}

checkCacheIntegrity();
clearLegacyVisitorMarkers();
createRoot(document.getElementById("root")!).render(<App />);
