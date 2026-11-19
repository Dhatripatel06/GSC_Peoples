import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      AUTH_MODE: 'development',
      LOG_LEVEL: 'silent',
    },
  },
});
