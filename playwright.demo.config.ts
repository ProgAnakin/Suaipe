import { defineConfig } from '@playwright/test';
import base from './playwright.config';
if (!base.webServer || Array.isArray(base.webServer)) throw new Error('Expected one preview server.');
const server = base.webServer;
export default defineConfig({
  ...base,
  testDir: './e2e-demo',
  webServer: {
    ...server,
    command: server.command.replace('VITE_DEMO_MODE=false', 'VITE_DEMO_MODE=true'),
    reuseExistingServer: false,
  },
});
