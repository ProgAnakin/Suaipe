import { mergeConfig } from 'vitest/config';
import base from '../../../vitest.config';

// Separate diagnostic run. The former diagnostic tests now live in the main CI suite. They do not replace the application's CI suite.
export default mergeConfig(base, {
  test: { include: ['src/__tests__/prelaunchRegression.test.tsx'], coverage: { enabled: false } },
});
