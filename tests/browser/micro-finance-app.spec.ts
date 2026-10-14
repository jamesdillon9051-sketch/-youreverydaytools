import { test as base, expect, type Page } from "@playwright/test";
import { microFinancePath, microFinanceUrl } from "../../lib/catalog";
import { mockAdsterra } from "./ad-fixture";
import { startStaticHost } from "./static-host";

// The Micro Finance app as it ships inside the website, at /finance/.
const test = base.extend<{ host: Awaited<ReturnType<typeof startStaticHost>> }>(
  {
    host: async ({}, use) => {
      const host = await startStaticHost();
      await use(host);
      await host.stop();
    },
  },
);
test.use({ viewport: { width: 390, height: 844 } });

const nav = (page: Page) => page.getByRole("navigation", { name: "Main" });
const currentTab = (page: Page) => nav(page).locator('[aria-current="page"]');

/** Waits until the app's service worker is installed and in control of the page. */
async function controlled(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    for (let i = 0; i < 50 && !navigator.serviceWorker.controller; i++)
      await new Promise((done) => setTimeout(done, 100));
    if (!navigator.serviceWorker.controller)
      throw new Error("the service worker never took control");
  });
}

test("the app loads at /finance/ without errors and keeps its service worker inside that folder", async ({
  page,
  host,
}) => {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type()))
      problems.push(`${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => problems.push(error.message));

  await page.goto(`${host.origin}${microFinancePath}`);
  await expect(page.getByText("Set your salary to begin")).toBeVisible();
  await expect(page).toHaveTitle("Micro Finance");
  await controlled(page);

  const worker = await page.evaluate(async () => ({
    scopes: (await navigator.serviceWorker.getRegistrations()).map(
      (registration) => registration.scope,
    ),
    script: navigator.serviceWorker.controller?.scriptURL,
    caches: await Promise.all(
      (await caches.keys()).map(async (name) => ({
        name,
        urls: (await (await caches.open(name)).keys()).map(
          (request) => new URL(request.url).pathname,
        ),
      })),
    ),
  }));
  expect(worker.scopes).toEqual([`${host.origin}/finance/`]);
  expect(worker.script).toBe(`${host.origin}/finance/sw.js`);
  expect(worker.caches).toHaveLength(1);
  const [cache] = worker.caches;
  expect(cache.name).toMatch(/^micro-finance-[0-9a-f]{12}$/);
  expect(cache.urls).toEqual(
    expect.arrayContaining([
      "/finance/",
      "/finance/index.html",
      "/finance/manifest.json",
      "/finance/icons/icon-192.png",
    ]),
  );
  expect(
    cache.urls.some((url) => /^\/finance\/assets\/.+\.js$/.test(url)),
  ).toBe(true);
  expect(cache.urls.every((url) => url.startsWith("/finance/"))).toBe(true);

  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/finance/manifest.json",
  );
  const manifest = await (
    await page.request.get(`${host.origin}/finance/manifest.json`)
  ).json();
  expect(manifest).toMatchObject({
    id: "/finance/",
    scope: "/finance/",
    display: "standalone",
  });
  expect(problems).toEqual([]);
});

test("deep links open the right screen and leave the address inside /finance/", async ({
  page,
  host,
}) => {
  for (const [search, tab] of [
    ["?tab=bills", "Bills"],
    ["?tab=budget", "Budget"],
    ["?tab=vaults", "Vaults"],
    ["?source=pwa", "Home"],
  ] as const) {
    await page.goto(`${host.origin}/finance/${search}`);
    await expect(currentTab(page)).toHaveText(tab);
    expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(
      "/finance/",
    );
  }
  await page.goto(`${host.origin}/finance/?action=log`);
  await expect(
    page.getByRole("dialog", { name: "Quick expense" }),
  ).toBeVisible();
  await expect(page).toHaveURL(`${host.origin}/finance/`);
});

test("it works offline after one visit, data and deep links included", async ({
  page,
  context,
  host,
}) => {
  await page.goto(`${host.origin}/finance/`);
  await nav(page).getByRole("button", { name: "Budget" }).click();
  await page.getByLabel("Monthly take-home").fill("4000");
  await page.getByLabel("Monthly take-home").press("Enter");
  await nav(page).getByRole("button", { name: "Home" }).click();
  await expect(page.getByText("Safe to spend today")).toBeVisible();
  await controlled(page);

  await host.stop();
  await page.reload();
  await expect(page.getByText("Safe to spend today")).toBeVisible();

  const deepLink = await context.newPage();
  await deepLink.goto(`${host.origin}/finance/?tab=bills`);
  await expect(currentTab(deepLink)).toHaveText("Bills");
});

test("the app's service worker leaves the rest of the site alone", async ({
  page,
  context,
  host,
}) => {
  await page.goto(`${host.origin}/finance/`);
  await controlled(page);

  const site = await context.newPage();
  await mockAdsterra(site);
  const answeredByWorker: string[] = [];
  site.on("response", (response) => {
    if (response.fromServiceWorker()) answeredByWorker.push(response.url());
  });
  for (const route of [
    "/",
    "/tools/calculators/micro-finance/",
    "/tools/pdf/merge-pdf/",
  ]) {
    await site.goto(`${host.origin}${route}`);
    await expect(site.locator("h1")).toBeVisible();
    expect(
      await site.evaluate(() => navigator.serviceWorker.controller === null),
      `${route} is not controlled by the app's worker`,
    ).toBe(true);
  }
  expect(answeredByWorker).toEqual([]);

  // Offline, those pages fail like any page would; the worker does not stand in the app for them.
  await host.stop();
  await expect(
    site.goto(`${host.origin}/tools/calculators/micro-finance/`),
  ).rejects.toThrow();
});

test("the launch button on the listing opens the working app in a new tab", async ({
  page,
  host,
}) => {
  test.skip(
    microFinanceUrl !== microFinancePath,
    "NEXT_PUBLIC_MICRO_FINANCE_URL sends the button to another address",
  );
  await mockAdsterra(page);
  await page.goto(`${host.origin}/tools/calculators/micro-finance/`);
  const [app] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("link", { name: /Open Micro Finance/ }).click(),
  ]);
  await expect(app).toHaveURL(`${host.origin}/finance/`);
  await expect(app.getByText("Set your salary to begin")).toBeVisible();
});
