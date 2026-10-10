import { tools } from "../../lib/catalog";
import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { mockAdsterra } from "./ad-fixture";

test.beforeEach(async ({ page }) => mockAdsterra(page));

const image = async () =>
  sharp({
    create: { width: 320, height: 200, channels: 4, background: "#7c3aed" },
  })
    .png()
    .toBuffer();
const pdfFixture = async (count: number) => {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < count; i++) {
    const page = pdf.addPage([300, 400]);
    page.drawText(`Page ${i + 1}`, { x: 20, y: 300 });
  }
  return Buffer.from(await pdf.save());
};

test("directory, theme, search, mobile navigation, and information pages", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("#all-tools h3")).toHaveCount(tools.length);
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("combobox", { name: "Search tools" }).fill("password");
  await page.getByRole("option", { name: "Password generator" }).click();
  await expect(page).toHaveURL(/password-generator/);
  await page.getByRole("link", { name: "Privacy Policy", exact: true }).click();
  await expect(page.locator("h1")).toHaveText("Privacy Policy");
  await page
    .getByRole("navigation", { name: "Footer navigation" })
    .getByRole("link", { name: "About Us", exact: true })
    .click();
  await expect(page.locator("h1")).toHaveText("About Us");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "PDF utilities" })
    .click();
  await expect(page).toHaveURL(/tools\/pdf/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});

test("image converter, compressor, and resizer create valid files", async ({
  page,
}) => {
  const buffer = await image();
  for (const [slug, action] of [
    ["webp-to-jpg", "Convert images"],
    ["image-compressor", "Compress images"],
    ["image-resizer", "Resize images"],
  ]) {
    await page.goto(`/tools/media/${slug}/`);
    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: "sample.png", mimeType: "image/png", buffer });
    if (slug === "image-resizer") {
      await page.getByLabel("Width", { exact: true }).fill("160");
      await page.getByLabel("Height", { exact: true }).fill("100");
    }
    await page.getByRole("button", { name: action, exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Processed images" }),
    ).toBeVisible();
    const downloaded = page.waitForEvent("download");
    await page.getByRole("button", { name: /Download sample-/ }).click();
    const download = await downloaded;
    const metadata = await sharp(
      await readFile((await download.path())!),
    ).metadata();
    expect(metadata.width).toBe(slug === "image-resizer" ? 160 : 320);
    expect(metadata.height).toBe(slug === "image-resizer" ? 100 : 200);
    expect(metadata.format).toBe(slug === "webp-to-jpg" ? "jpeg" : "webp");
  }
});

test("PDF merge reorders, split selects pages, and image layout exports", async ({
  page,
}) => {
  await page.goto("/tools/pdf/merge-pdf/");
  await page.locator('input[type="file"]').setInputFiles([
    {
      name: "first.pdf",
      mimeType: "application/pdf",
      buffer: await pdfFixture(2),
    },
    {
      name: "second.pdf",
      mimeType: "application/pdf",
      buffer: await pdfFixture(1),
    },
  ]);
  await page.getByRole("button", { name: "Move second.pdf up" }).click();
  const mergedDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Merge PDFs", exact: true }).click();
  const merged = await PDFDocument.load(
    await readFile((await (await mergedDownload).path())!),
  );
  expect(merged.getPageCount()).toBe(3);
  await page.goto("/tools/pdf/split-pdf/");
  await page.locator('input[type="file"]').setInputFiles({
    name: "source.pdf",
    mimeType: "application/pdf",
    buffer: await pdfFixture(5),
  });
  await expect(page.getByLabel(/Page ranges/)).toHaveValue("1-5");
  await page.getByLabel(/Page ranges/).fill("1-3, 5");
  const splitDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Extract & download pages" }).click();
  const split = await PDFDocument.load(
    await readFile((await (await splitDownload).path())!),
  );
  expect(split.getPageCount()).toBe(4);
  await page.goto("/tools/pdf/image-to-pdf/");
  const buffer = await image();
  await page.locator('input[type="file"]').setInputFiles([
    { name: "one.png", mimeType: "image/png", buffer },
    { name: "two.png", mimeType: "image/png", buffer },
  ]);
  await page.getByLabel("Images per page").selectOption("2");
  const imagesDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Create PDF", exact: true }).click();
  const pdf = await PDFDocument.load(
    await readFile((await (await imagesDownload).path())!),
  );
  expect(pdf.getPageCount()).toBe(1);
});

test("JSON, Unicode Base64, regex highlights and timeout", async ({ page }) => {
  await page.goto("/tools/developer/json-formatter/");
  await page.getByLabel("Input JSON").fill('{"a":1,"hello":"世界"}');
  await page.getByRole("button", { name: "Minify", exact: true }).click();
  await expect(page.locator("pre")).toHaveText('{"a":1,"hello":"世界"}');
  await page.getByRole("button", { name: "Tree", exact: true }).click();
  await expect(page.getByText("{2 keys}", { exact: false })).toBeVisible();
  await page.getByLabel("Input JSON").fill("{invalid}");
  await expect(page.locator("main").getByRole("alert")).toBeVisible();
  await page.goto("/tools/developer/base64/");
  await page.getByLabel("Text to encode").fill("Hello 世界 🔒");
  const encoded = await page.getByLabel("Result", { exact: true }).inputValue();
  await page.getByRole("button", { name: "Decode", exact: true }).click();
  await page.getByLabel("Base64 to decode").fill(encoded);
  await expect(page.getByLabel("Result", { exact: true })).toHaveValue(
    "Hello 世界 🔒",
  );
  await page.goto("/tools/developer/regex-tester/");
  await expect(page.locator("mark")).toHaveCount(4);
  await page.getByLabel("Pattern", { exact: true }).fill("[");
  await expect(page.locator("main").getByRole("alert")).toBeVisible();
  await page.getByLabel("Pattern", { exact: true }).fill("(a+)+$");
  await page.getByLabel("Test text").fill("a".repeat(100) + "!");
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Execution stopped",
    { timeout: 5000 },
  );
});

test("calculators update projections and export amortization", async ({
  page,
}) => {
  await page.goto("/tools/calculators/compound-interest/");
  await page.getByLabel("Initial investment", { exact: true }).fill("1000");
  await page.getByLabel("Monthly contribution", { exact: true }).fill("100");
  await page.getByLabel("Annual interest rate", { exact: true }).fill("0");
  await page.getByLabel("Timeline", { exact: true }).fill("2");
  await expect(page.getByText("$3,400", { exact: true }).first()).toBeVisible();
  await page.goto("/tools/calculators/mortgage-payoff/");
  await expect(
    page.getByRole("heading", { name: "Amortization schedule" }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  expect((await download).suggestedFilename()).toBe(
    "mortgage-amortization.csv",
  );
  await page.goto("/tools/calculators/freelance-rate/");
  await expect(
    page.getByText("Recommended hourly rate", { exact: true }),
  ).toBeVisible();
});

test("password, QR with logo, unit and manual currency conversion", async ({
  page,
}) => {
  await page.goto("/tools/generators/password-generator/");
  await expect(
    page.getByLabel("Generated password", { exact: true }),
  ).toHaveValue(/.{20}/);
  const before = await page
    .getByLabel("Generated password", { exact: true })
    .inputValue();
  await page.getByRole("button", { name: "Generate again" }).click();
  expect(
    await page.getByLabel("Generated password", { exact: true }).inputValue(),
  ).not.toBe(before);
  await page.goto("/tools/generators/qr-code/");
  await expect(page.getByAltText("Generated QR code")).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({
    name: "logo.png",
    mimeType: "image/png",
    buffer: await image(),
  });
  await expect(page.getByRole("button", { name: "Remove logo" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Download PNG", exact: true }),
  ).toBeEnabled();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PNG", exact: true }).click();
  const metadata = await sharp(
    await readFile((await (await downloaded).path())!),
  ).metadata();
  expect(metadata.width).toBe(1024);
  await page.goto("/tools/generators/unit-converter/");
  await page.getByLabel("From", { exact: true }).selectOption("in");
  await page.getByLabel("To", { exact: true }).selectOption("cm");
  await expect(page.getByText("2.54 cm", { exact: true })).toBeVisible();
  await page.getByLabel("Conversion category").selectOption("currency");
  await expect(
    page.getByText("Result is paused", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("EUR per USD", { exact: true }).fill("0.9");
  await page
    .getByRole("button", { name: "Use entered reference rates" })
    .click();
  await expect(page.getByText("0.9 EUR", { exact: true })).toBeVisible();
});

test("tool markup is crawlable and processing makes no upload requests", async ({
  page,
}) => {
  const uploads: string[] = [];
  page.on("request", (request) => {
    if (["POST", "PUT", "PATCH"].includes(request.method()))
      uploads.push(request.url());
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/tools/media/webp-to-jpg/");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/tools\/media\/webp-to-jpg\/$/,
  );
  const schema = await page
    .locator('script[type="application/ld+json"]')
    .textContent();
  expect(
    JSON.parse(schema!)["@graph"].map(
      (item: { "@type": string }) => item["@type"],
    ),
  ).toEqual(["SoftwareApplication", "HowTo", "FAQPage"]);
  await page.locator('input[type="file"]').setInputFiles({
    name: "private.png",
    mimeType: "image/png",
    buffer: await image(),
  });
  await page
    .getByRole("button", { name: "Convert images", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Processed images" }),
  ).toBeVisible();
  expect(uploads).toEqual([]);
  expect(errors).toEqual([]);
});
