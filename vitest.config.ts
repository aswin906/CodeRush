import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Increase timeout to 20s to accommodate round-trips to hosted PostgreSQL (Supabase)
    testTimeout: 20000,
    hookTimeout: 20000,
    // Load .env for integration tests
    env: {
      NODE_ENV: 'test',
    },
  },
});
