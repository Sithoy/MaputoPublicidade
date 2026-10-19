import path from 'path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    exclude: ['**/node_modules/**', '**/.next/**', 'e2e/**'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'hooks/**/*.ts', 'lib/**/*.ts'],
      exclude: ['**/*.test.{ts,tsx}', '**/*.d.ts'],
      reporter: ['text', 'json-summary', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 35,
        statements: 35,
        functions: 30,
        branches: 40,
        'lib/auth-proxy.ts': { lines: 90, statements: 85, functions: 100, branches: 85 },
        'lib/{safe-url,authenticated-url,zoho-authorization-url}.ts': {
          lines: 100, statements: 100, functions: 100, branches: 100,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './'),
    },
  },
});
