import { defineConfig, loadEnv, type Plugin } from "vite";
import { readFileSync } from "node:fs";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { assertPublicSupabaseKey } from "./src/lib/publicKey";

// Reject private credentials before emitting artifacts, not after shipping them.
assertPublicSupabaseKey(process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '');

// Sourcemap upload only runs when all three env vars are set (Vercel build).
// Local builds skip the upload step silently — no token needed for `npm run build`.
const sentryEnabled = !!(
  process.env.SENTRY_AUTH_TOKEN &&
  process.env.SENTRY_ORG &&
  process.env.SENTRY_PROJECT
);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  assertPublicSupabaseKey(env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '');
  const demo = env.VITE_DEMO_MODE ?? (process.env.VERCEL_ENV === 'preview' ? 'true' : 'false');
  if (process.env.VERCEL_ENV === 'production' && demo !== 'true' &&
      (!env.VITE_PRIVACY_CONTROLLER?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.VITE_PRIVACY_CONTACT ?? ''))) {
    throw new Error('Configure the real privacy controller and contact before production deployment.');
  }
  const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? '';
  const releaseMetadata: Plugin = {
    name: 'public-release-metadata',
    generateBundle() {
      const version = JSON.parse(readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8')).version;
      this.emitFile({ type: 'asset', fileName: 'release.json', source: JSON.stringify({version,commit:/^[a-f0-9]{40}$/i.test(sha)?sha:'local',demo:demo==='true'}) });
    },
  };
  return ({
  define: {
    'import.meta.env.VITE_DEMO_MODE': JSON.stringify(demo),
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    releaseMetadata,
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
        // REST responses can contain customer/staff data. Cache API data only
        // through the explicit public-catalog snapshot in startupCache.ts.
        // On activation, delete the previous worker's broad REST cache too.
        importScripts: ["/sw-cache-cleanup.js"],
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
});
});
