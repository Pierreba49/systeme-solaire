import { defineConfig, devices } from '@playwright/test';

const launchOptions = {
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
};

export default defineConfig({
  testDir: 'tests/e2e',
  reporter: 'list',
  use: { baseURL: 'http://localhost:4173' },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'ipad',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1180, height: 820 }, launchOptions },
    },
    {
      name: 'android',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, launchOptions },
    },
  ],
});
