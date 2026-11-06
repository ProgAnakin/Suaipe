import { defineConfig } from '@playwright/test';
import base from './playwright.config';
if (!base.webServer || Array.isArray(base.webServer)) throw new Error('Expected one preview server.');
const server = base.webServer;
export default defineConfig({
  ...base,
  testDir: './e2e-demo',
  webServer: {
    ...server,
    command: 'VITE_DEMO_MODE=true ' + server.command,
    reuseExistingServer: false,
  },
});
