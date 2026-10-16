import type { Page } from "@playwright/test";

export async function mockAdsterra(page: Page) {
  await page.route("https://www.googletagmanager.com/**", (route) =>
    route.fulfill({ contentType: "application/javascript", body: "" }),
  );
  await page.route(
    "https://disembroildisembroildissipatespots.com/**",
    async (route) => {
      const url = route.request().url();
      let body = "";
      if (url.includes("0e88314fb17fa625db79032082c11e5b")) {
        body = `window.__adsterraNativeLoads = (window.__adsterraNativeLoads || 0) + 1;
        document.getElementById('container-0e88314fb17fa625db79032082c11e5b').textContent = 'Test native ad';`;
      } else if (url.includes("6733034dd0fa757f4485674ad089bfa7")) {
        body = `window.__adsterraSocialLoads = (window.__adsterraSocialLoads || 0) + 1;
        document.body.dataset.socialBarReady = 'true';`;
      } else if (url.includes("8e212cef6d66a233dcbce7dcb83e0402")) {
        body = `if (atOptions.key !== '8e212cef6d66a233dcbce7dcb83e0402' || atOptions.width !== 300 || atOptions.height !== 250 || atOptions.format !== 'iframe') throw new Error('Incorrect banner configuration');
        document.write('<div id="test-banner" style="width:300px;height:250px">Test 300 × 250 ad</div>');`;
      }
      await route.fulfill({ contentType: "application/javascript", body });
    },
  );
}
