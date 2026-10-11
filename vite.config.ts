import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import { sentryVitePlugin } from "@sentry/vite-plugin";

// Sourcemap upload only runs when all three env vars are set (Vercel build).
// Local builds skip the upload step silently — no token needed for `npm run build`.
const sentryEnabled = !!(
  process.env.SENTRY_AUTH_TOKEN &&
  process.env.SENTRY_ORG &&
  process.env.SENTRY_PROJECT
);

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Keep the existing public/manifest.json — don't generate a second one
      manifest: false,
      // Workbox service-worker config
      workbox: {
        // Pre-cache all build assets for offline use
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,jpg,jpeg,woff2}"],
        // Exclude large static assets that aren't needed for offline kiosk operation
        globIgnores: ["screenshots/**", "splash/**"],
        // Runtime caching for the four PUBLIC catalogue tables the kiosk reads (network-first,
        // 5 s timeout, 60 s lifetime). Deliberately NOT every /rest/v1/ GET: customer data
        // (quiz_sessions: names, e-mails), roles and audit logs are answered per user by RLS and must
        // never be copied into the device's Cache Storage, where the cache key is the URL alone and
        // the next user of the device could be served the previous user's answer.
        // Method GET filter prevents non-idempotent calls from being cached.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[^/]+\.supabase\.co\/rest\/v1\/(custom_products|product_settings|product_global_status|quiz_cards)(\?|$)/i,
            handler: "NetworkFirst",
            method: "GET",
            options: {
              cacheName: "supabase-rest",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 },
            },
          },
        ],
        // Don't wait for old SW to unload — update immediately
        skipWaiting: true,
        clientsClaim: true,
      },
      devOptions: {
        // Enable SW in dev mode so it can be tested locally
        enabled: false,
      },
    }),
    // Must be last: uploads sourcemaps to Sentry after Vite emits the bundle.
    sentryEnabled &&
      sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        sourcemaps: {
          // Delete uploaded sourcemaps from the dist so they aren't served publicly.
          filesToDeleteAfterUpload: ["./dist/**/*.map"],
        },
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    // Only emit sourcemaps when Sentry is configured to upload them — the
    // plugin then deletes the .map files from dist/ after upload so they
    // never reach production. With no Sentry env vars, no maps are emitted
    // at all, eliminating any leak risk.
    sourcemap: sentryEnabled,
    // Manual chunking — keeps vendor code in separate, long-cacheable bundles
    // so iPads only re-download the small app chunk on every release.
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor":  ["react", "react-dom", "react/jsx-runtime"],
          "framer-motion": ["framer-motion"],
          "supabase":      ["@supabase/supabase-js"],
          "router":        ["react-router-dom"],
          "react-query":   ["@tanstack/react-query"],
          "radix":         ["@radix-ui/react-toast", "@radix-ui/react-tooltip"],
        },
      },
    },
    // The kiosk bundle is intentionally larger than 500 KB once code-split;
    // the warning isn't useful here.
    chunkSizeWarningLimit: 800,
  },
}));
