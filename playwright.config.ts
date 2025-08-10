// --- ESM-safe __dirname / env loading --- //
// Load env from multiple files in order: .env → .env.local → .env.test
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.test' });

import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, devices } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Fail fast if Supabase env is missing (so tests don’t start in a broken state)
if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in env (.env/.env.local/.env.test).');
  process.exit(1);
}

// Optional: base URL for your app under test (adjust if needed)
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5173';

// Where reports & artifacts go
const RESULTS_DIR = path.resolve(__dirname, 'test-results');
const REPORT_DIR  = path.resolve(__dirname, 'playwright-report');

export default defineConfig({
  testDir: path.resolve(__dirname, 'tests'),
  outputDir: RESULTS_DIR,
  reporter: [
    ['list'],
    ['html', { outputFolder: REPORT_DIR, open: 'never' }],
    // you can add ['json', { outputFile: path.join(RESULTS_DIR, 'report.json') }]
  ],
  timeout: 90_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // If you want Playwright to start your dev server automatically, uncomment:
  // webServer: {
  //   command: 'npm run dev',
  //   url: BASE_URL,
  //   reuseExistingServer: true,
  //   timeout: 120_000,
  // },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // { name: 'webkit',  use: { ...devices['Desktop Safari'] } },
  ],
});

