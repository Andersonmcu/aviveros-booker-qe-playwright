import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

const BASE_URL = process.env.BASE_URL ?? 'https://automationintesting.online';
const WORKERS = Number(process.env.WORKERS ?? 2);
const CHANNEL = process.env.BROWSER_CHANNEL || undefined;

export default defineConfig({
  testDir: './tests',
  // Cada prueba crea sus propios datos: pueden correr en paralelo, incluso dentro del mismo archivo.
  fullyParallel: true,
  workers: WORKERS,
  forbidOnly: !!process.env.CI,
  // Sin reintentos por defecto: un fallo debe verse como fallo, no esconderse tras un retry verde.
  retries: Number(process.env.RETRIES ?? 0),
  timeout: 60_000,
  expect: { timeout: 10_000 },
  outputDir: 'reports/test-results',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['json', { outputFile: 'reports/results.json' }],
    ['junit', { outputFile: 'reports/junit.xml' }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    extraHTTPHeaders: { Accept: 'application/json' },
  },
  projects: [
    {
      name: 'api',
      testDir: './tests/api',
    },
    {
      name: 'ui',
      testDir: './tests/ui',
      use: { ...devices['Desktop Chrome'], channel: CHANNEL },
    },
  ],
});
