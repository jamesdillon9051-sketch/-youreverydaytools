import { test, expect } from "@playwright/test";
import { externalAppUrl, tools } from "../../lib/catalog";
import { mockAdsterra } from "./ad-fixture";

test.beforeEach(async ({ page }) => mockAdsterra(page));

const tool = tools.find((item) => item.slug === "micro-finance")!;
const path = "/tools/calculators/micro-finance/";

test("Micro Finance is listed in the directory, the calculators category and search", async ({
  page,
}) => {
  await page.goto("/");
  const card = page
    .locator("#all-tools")
    .getByRole("link", { name: /Micro Finance/ });
  await expect(card).toHaveAttribute("href", path);
  await expect(card).toContainText("A private, offline budgeting app");
  await expect(card).toContainText("Works offline, installs like an app");

  await page.goto("/tools/calculators/");
  await expect(
    page.getByRole("link", { name: /Micro Finance/ }),
  ).toHaveAttribute("href", path);

  await page.goto("/");
  const search = page.getByRole("combobox", { name: "Search tools" });
  await search.fill("budget");
  await page.getByRole("option", { name: "Micro Finance" }).click();
  await expect(page).toHaveURL(new RegExp(`${path}$`));
});

test("the Micro Finance page lists every module, the honest limits and its FAQ", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(path);
  await expect(page.locator("h1")).toHaveText(tool.title);

  // All 17 modules, in order, each with its explanation.
  const modules = page.getByRole("region", { name: "Tools and features" });
  const names = tool.modules!.map((module) => module.name);
  expect(names).toHaveLength(17);
  await expect(modules.getByRole("heading", { level: 3 })).toHaveText(names);
  await expect(modules.getByRole("listitem")).toHaveCount(17);
  for (const module of tool.modules!)
    await expect(modules).toContainText(module.description.slice(0, 60));

  // The launcher: either the configured link, or an honest "not live yet".
  const workspace = page.getByRole("region", {
    name: "Micro Finance workspace",
  });
  const configured = externalAppUrl(process.env.NEXT_PUBLIC_MICRO_FINANCE_URL);
  if (configured) {
    const link = workspace.getByRole("link", { name: /Open Micro Finance/ });
    await expect(link).toHaveAttribute("href", configured);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  } else {
    await expect(
      workspace.getByText("Micro Finance is not live on this site yet."),
    ).toBeVisible();
    await expect(workspace.getByRole("link")).toHaveCount(0);
  }

  // Limits are stated where people look first, and again in the FAQ.
  for (const limit of [
    "US dollars (USD) only.",
    "There is no sync between devices",
    "No bank connection",
    "not while your phone has it suspended",
    "Rollover of unspent money applies to Needs and Wants only.",
  ])
    await expect(workspace).toContainText(limit);
  await expect(workspace.getByText("Add to Home Screen")).toBeVisible();
  for (const item of tool.faq)
    await expect(
      page.locator("summary", { hasText: item.question }),
    ).toBeVisible();

  // Structured data describes the page without overclaiming.
  const graph = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent())!,
  )["@graph"];
  const faq = graph.find(
    (item: { "@type": string }) => item["@type"] === "FAQPage",
  );
  expect(
    faq.mainEntity.map((question: { name: string }) => question.name),
  ).toEqual(tool.faq.map((item) => item.question));
  expect(errors).toEqual([]);
});

test("the sitemap and the sidebar count include the new page", async ({
  page,
}) => {
  const sitemap = await (await page.request.get("/sitemap.xml")).text();
  expect(sitemap).toMatch(
    /<loc>https?:\/\/[^<]+\/tools\/calculators\/micro-finance\/<\/loc>/,
  );
  await page.goto("/");
  await expect(
    page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", {
        name: /All tools/,
      }),
  ).toContainText(String(tools.length));
});
