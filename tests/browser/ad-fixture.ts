import type { Page } from "@playwright/test";

export async function mockAdsterra(page: Page) {
  await page.route(
    "https://disembroildisembroildissipatespots.com/**",
    async (route) => {
      const url = route.request().url();
      let body = "";
      if (url.includes("e4020df4957732c0eb03cdcb6d36d610")) {
        body = `window.__adsterraNativeLoads = (window.__adsterraNativeLoads || 0) + 1;
        document.getElementById('container-e4020df4957732c0eb03cdcb6d36d610').textContent = 'Test native ad';`;
      } else if (url.includes("d60a7e3d71be26efd2845278ba8ebac6")) {
        body = `window.__adsterraSocialLoads = (window.__adsterraSocialLoads || 0) + 1;
        document.body.dataset.socialBarReady = 'true';`;
      } else if (url.includes("f51c14a7372fddc78920dabfaf8b5202")) {
        body = `if (atOptions.key !== 'f51c14a7372fddc78920dabfaf8b5202' || atOptions.width !== 300 || atOptions.height !== 250 || atOptions.format !== 'iframe') throw new Error('Incorrect banner configuration');
        document.write('<div id="test-banner" style="width:300px;height:250px">Test 300 × 250 ad</div>');`;
      }
      await route.fulfill({ contentType: "application/javascript", body });
    },
  );
}
