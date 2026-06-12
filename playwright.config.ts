import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30000,
  fullyParallel: false,
  use: { headless: true },
  webServer: {
    command: "npm run preview",
    port: 4317,
    reuseExistingServer: true,
    timeout: 60000,
  },
});
