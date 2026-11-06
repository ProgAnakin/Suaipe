import { mergeConfig } from 'vitest/config';
import base from '../../../vitest.config';

// Separate diagnostic run. These tests assert desired behavior and currently
// fail on demonstrated defects. They do not replace the application's CI suite.
export default mergeConfig(base, {
  test: { include: ['docs/audits/2026-11-06/web-probes.test.tsx'], exclude: ['src/**'], coverage: { enabled: false } },
});
