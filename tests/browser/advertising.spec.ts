import { test, expect } from "@playwright/test";
import { tools, toolPath } from "../../lib/catalog";
import { mockAdsterra } from "./ad-fixture";

test.beforeEach(async ({ page }) => mockAdsterra(page));

test("all page types render exactly one native and rectangular placement", async ({
  page,
}) => {
  const paths = [
    "/",
    "/about/",
    "/privacy-policy/",
    "/404.html",
    "/tools/media/",
    "/tools/pdf/",
    "/tools/developer/",
    "/tools/calculators/",
    "/tools/generators/",
    ...tools.map(toolPath),
  ];
  for (const path of paths) {
    await page.goto(path);
    await expect(
      page.locator("#container-e4020df4957732c0eb03cdcb6d36d610"),
    ).toHaveCount(1);
    await expect(
      page.locator("#container-e4020df4957732c0eb03cdcb6d36d610"),
    ).toHaveText("Test native ad");
    await expect(page.locator("body")).toHaveAttribute(
      "data-social-bar-ready",
      "true",
    );
    await expect(
      page.locator('iframe[title="Adsterra 300 by 250 advertisement"]'),
    ).toHaveCount(1);
    await page
      .locator('iframe[title="Adsterra 300 by 250 advertisement"]')
      .scrollIntoViewIfNeeded();
    await expect(
      page
        .frameLocator('iframe[title="Adsterra 300 by 250 advertisement"]')
        .locator("#test-banner"),
    ).toHaveText("Test 300 × 250 ad");
  }
});

test("shared scripts persist through navigation and ads fit a 320px screen", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/");
  await expect(
    page.locator("#container-e4020df4957732c0eb03cdcb6d36d610"),
  ).toHaveText("Test native ad");
  await page.getByRole("combobox", { name: "Search tools" }).fill("password");
  await page.getByRole("option", { name: "Password generator" }).click();
  await expect(page).toHaveURL(/password-generator/);
  await expect(
    page.locator('iframe[title="Adsterra 300 by 250 advertisement"]'),
  ).toHaveCount(1);
  await page
    .getByRole("navigation", { name: "Footer navigation" })
    .getByRole("link", { name: "Privacy Policy", exact: true })
    .click();
  await expect(page.locator("h1")).toHaveText("Privacy Policy");
  await expect(
    page.locator("#container-e4020df4957732c0eb03cdcb6d36d610"),
  ).toHaveText("Test native ad");
  await expect(
    page.locator('iframe[title="Adsterra 300 by 250 advertisement"]'),
  ).toHaveCount(1);
  expect(
    await page.evaluate(() => ({
      native: (window as unknown as Record<string, number>)
        .__adsterraNativeLoads,
      social: (window as unknown as Record<string, number>)
        .__adsterraSocialLoads,
    })),
  ).toEqual({ native: 1, social: 1 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  const frame = page.locator(
    'iframe[title="Adsterra 300 by 250 advertisement"]',
  );
  await frame.scrollIntoViewIfNeeded();
  const bounds = await frame.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
  expect(errors).toEqual([]);
});

test("blocked ad scripts do not prevent tool use", async ({ page }) => {
  await page.route(
    "https://disembroildisembroildissipatespots.com/**",
    (route) => route.abort(),
  );
  await page.goto("/tools/developer/json-formatter/");
  await page.getByLabel("Input JSON").fill('{"advertising":"optional"}');
  await page.getByRole("button", { name: "Beautify", exact: true }).click();
  await expect(page.locator("pre")).toHaveText(
    '{\n  "advertising": "optional"\n}',
  );
});
