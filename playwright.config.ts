import { defineConfig } from "@playwright/test";
const port = process.env.PLAYWRIGHT_PORT || "3000";
export default defineConfig({
  testDir: "./tests/browser",
  use: { baseURL: `http://127.0.0.1:${port}`, headless: true },
  webServer: {
    command: `npx --no-install serve out -l ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: true,
  },
  reporter: "list",
});
