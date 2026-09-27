import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // A real TEST_DATABASE_URL is shared, so files must not run in parallel.
    fileParallelism: !process.env.TEST_DATABASE_URL,
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
