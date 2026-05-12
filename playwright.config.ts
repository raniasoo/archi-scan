import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  retries: 1,
  use: {
    baseURL: process.env.BASE_URL || 'https://www.archiscan.kr',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'api', testMatch: /api\.spec\.ts/ },
    { name: 'ui', testMatch: /ui\.spec\.ts/, use: { viewport: { width: 390, height: 844 } } },
  ],
})
