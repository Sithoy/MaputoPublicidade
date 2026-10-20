import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

if (process.env.MP_E2E !== '1') throw new Error('Set MP_E2E=1 and use an isolated mp_e2e database');
const root = path.resolve(__dirname, '..');
const python = process.env.E2E_PYTHON || 'python';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:3108',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `"${python}" scripts/ci/start_e2e_backend.py`,
      cwd: root,
      url: 'http://127.0.0.1:8008/health/',
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      command: 'node ../scripts/ci/wait_http.mjs && npm run build && npm run start -- --hostname 127.0.0.1 --port 3108',
      url: 'http://127.0.0.1:3108/area-cliente/login',
      timeout: 240_000,
      reuseExistingServer: false,
      env: {
        INTERNAL_API_URL: 'http://127.0.0.1:8008',
        PUBLIC_CONTENT_API_ORIGIN: 'http://127.0.0.1:8008',
      },
    },
  ],
});
