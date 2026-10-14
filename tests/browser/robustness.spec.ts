import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { PDFDocument, PDFName, PDFNumber, PDFStream } from "pdf-lib";
import sharp from "sharp";
import { categories, tools, toolPath } from "../../lib/catalog";
import { mockAdsterra } from "./ad-fixture";

test.beforeEach(async ({ page }) => mockAdsterra(page));

// Smooth gradient plus mild deterministic noise: compresses like a real photo.
async function photo(
  width: number,
  height: number,
  options: { orientation?: number } = {},
) {
  const data = Buffer.alloc(width * height * 3);
  let seed = 7;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const noise = (seed >> 16) % 20;
      const i = (y * width + x) * 3;
      data[i] = ((x / width) * 200 + noise) & 255;
      data[i + 1] = ((y / height) * 200 + noise) & 255;
      data[i + 2] = (((x + y) / (width + height)) * 255 + noise) & 255;
    }
  let image = sharp(data, { raw: { width, height, channels: 3 } });
  if (options.orientation)
    image = image.withMetadata({ orientation: options.orientation });
  return image.jpeg({ quality: 82 }).toBuffer();
}
const png = () =>
  sharp({
    create: { width: 64, height: 48, channels: 4, background: "#7c3aed" },
  })
    .png()
    .toBuffer();
const pdfFixture = async (count: number) => {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < count; i++)
    pdf.addPage([300, 400]).drawText(`Page ${i + 1}`);
  return Buffer.from(await pdf.save());
};
async function pdfImages(buffer: Buffer) {
  const document = await PDFDocument.load(buffer);
  const images: { width: number; height: number; filter?: string }[] = [];
  for (const [, object] of document.context.enumerateIndirectObjects()) {
    if (
      object instanceof PDFStream &&
      object.dict.get(PDFName.of("Subtype")) === PDFName.of("Image")
    )
      images.push({
        width: (object.dict.get(PDFName.of("Width")) as PDFNumber).asNumber(),
        height: (object.dict.get(PDFName.of("Height")) as PDFNumber).asNumber(),
        filter: object.dict
          .get(PDFName.of("Filter"))
          ?.toString()
          .replace("/", ""),
      });
  }
  return images;
}
const alert = (page: import("@playwright/test").Page) =>
  page.locator("main").getByRole("alert");

test("photos become compact PDFs: JPEGs are embedded as JPEG, not re-encoded as PNG", async ({
  page,
}) => {
  const jpeg = await photo(1600, 1200);
  await page.goto("/tools/pdf/image-to-pdf/");
  await page.locator('input[type="file"]').setInputFiles(
    [1, 2, 3].map((n) => ({
      name: `photo${n}.jpg`,
      mimeType: "image/jpeg",
      buffer: jpeg,
    })),
  );
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Create PDF", exact: true }).click();
  const buffer = await readFile((await (await download).path())!);
  // Re-encoding as PNG made this PDF about ten times larger than its photos.
  expect(buffer.length).toBeLessThan(jpeg.length * 3 * 1.2);
  expect(await pdfImages(buffer)).toEqual(
    Array(3).fill({ width: 1600, height: 1200, filter: "DCTDecode" }),
  );
  await expect(page.getByText("Your PDF is ready")).toBeVisible();
});

test("sideways phone photos (EXIF rotation) and lossless PNGs keep the right pixels", async ({
  page,
}) => {
  await page.goto("/tools/pdf/image-to-pdf/");
  await page.locator('input[type="file"]').setInputFiles([
    {
      name: "portrait.jpg",
      mimeType: "image/jpeg",
      buffer: await photo(400, 200, { orientation: 6 }),
    },
    { name: "logo.png", mimeType: "image/png", buffer: await png() },
  ]);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Create PDF", exact: true }).click();
  const images = await pdfImages(
    await readFile((await (await download).path())!),
  );
  expect(images).toContainEqual({
    width: 200,
    height: 400,
    filter: "DCTDecode",
  });
  expect(images).toContainEqual(
    expect.objectContaining({ width: 64, height: 48, filter: "FlateDecode" }),
  );
});

test("PDF tools judge files by content and name the file that failed", async ({
  page,
}) => {
  const encrypted = await PDFDocument.create();
  encrypted.addPage([100, 100]);
  encrypted.context.trailerInfo.Encrypt = encrypted.context.obj({
    Filter: "Standard",
  });
  const damaged = Buffer.concat([
    Buffer.from("%PDF-1.4\n"),
    Buffer.from(Array.from({ length: 400 }, (_, i) => (i * 37 + 11) % 256)),
  ]);
  const input = page.locator('input[type="file"]');
  const merge = page.getByRole("button", { name: "Merge PDFs", exact: true });
  await page.goto("/tools/pdf/merge-pdf/");

  await input.setInputFiles({
    name: "fake.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("this is only text"),
  });
  await expect(alert(page)).toContainText("Skipped: fake.pdf");
  await expect(
    page.getByRole("button", { name: "Remove fake.pdf" }),
  ).toHaveCount(0);

  await input.setInputFiles([
    {
      name: "ok.pdf",
      mimeType: "application/pdf",
      buffer: await pdfFixture(1),
    },
    {
      name: "locked.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(await encrypted.save()),
    },
  ]);
  await merge.click();
  await expect(alert(page)).toContainText('"locked.pdf" is password-protected');
  await expect(alert(page)).not.toContainText("ignoreEncryption");
  await expect(merge).toBeEnabled();

  await page.getByRole("button", { name: "Remove locked.pdf" }).click();
  await input.setInputFiles({
    name: "broken.pdf",
    mimeType: "application/pdf",
    buffer: damaged,
  });
  await merge.click();
  await expect(alert(page)).toContainText(
    '"broken.pdf" is not a valid PDF, or the file is damaged.',
  );

  await page.goto("/tools/pdf/split-pdf/");
  await input.setInputFiles({
    name: "empty.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(
      await (await PDFDocument.create()).save({ addDefaultPage: false }),
    ),
  });
  await expect(alert(page)).toContainText(
    '"empty.pdf": This PDF has no pages.',
  );
  await input.setInputFiles({
    name: "cut-off.pdf",
    mimeType: "application/pdf",
    buffer: (await pdfFixture(3)).subarray(0, 300),
  });
  await expect(alert(page)).toContainText('"cut-off.pdf" is not a valid PDF');
});

test("page ranges are checked while typing and the page count is shown", async ({
  page,
}) => {
  await page.goto("/tools/pdf/split-pdf/");
  await page.locator('input[type="file"]').setInputFiles({
    name: "source.pdf",
    mimeType: "application/pdf",
    buffer: await pdfFixture(5),
  });
  const range = page.getByLabel(/Page ranges/);
  const extract = page.getByRole("button", {
    name: "Extract & download pages",
  });
  await expect(page.getByText("5 total pages")).toBeVisible();
  await range.fill("9");
  await expect(page.getByText(/Pages must be between 1 and 5/)).toBeVisible();
  await expect(extract).toBeDisabled();
  await range.fill("2, nonsense");
  await expect(page.getByText(/Invalid range: nonsense/)).toBeVisible();
  await expect(extract).toBeDisabled();
  await range.fill("2-3");
  await expect(
    page.getByText(/Pages must be between|Invalid range/),
  ).toHaveCount(0);
  await expect(extract).toBeEnabled();
  const download = page.waitForEvent("download");
  await extract.click();
  const split = await PDFDocument.load(
    await readFile((await (await download).path())!),
  );
  expect(split.getPageCount()).toBe(2);
});

test("one unreadable image no longer discards the rest of the batch", async ({
  page,
}) => {
  const good = await png();
  // A valid PNG signature and header followed by garbage passes the type check
  // but cannot be decoded.
  const corrupt = Buffer.concat([good.subarray(0, 41), Buffer.alloc(64, 7)]);
  await page.goto("/tools/media/webp-to-jpg/");
  await page.locator('input[type="file"]').setInputFiles([
    { name: "good.png", mimeType: "image/png", buffer: good },
    { name: "corrupt.png", mimeType: "image/png", buffer: corrupt },
    { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hi") },
  ]);
  await expect(alert(page)).toContainText("Skipped: notes.txt");
  await page
    .getByRole("button", { name: "Convert images", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Processed images" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Download good-1.jpg" }),
  ).toBeVisible();
  await expect(alert(page)).toContainText(
    "1 of 2 files could not be processed. corrupt.png: This image could not be read.",
  );
  await expect(page.getByText(/Processed 1 image:/)).toBeVisible();
});

const status = {
  ready: true,
  providers: { scrapeCreators: true, rocketApi: true },
};
const result = {
  title: "Public media",
  expiresAt: Math.floor(Date.now() / 1000) + 900,
  items: [
    {
      id: "1",
      kind: "photo",
      filename: "photo.jpg",
      downloadUrl: "/api/social-download.php?token=fixture-photo",
    },
  ],
};

test("failed social downloads explain what happened and offer a retry", async ({
  page,
}) => {
  let behavior: "limit" | "expired" | "ok" = "limit";
  let lookups = 0;
  await page.route("**/api/social.php", async (route) => {
    if (route.request().method() === "POST") lookups++;
    await route.fulfill({
      json: route.request().method() === "GET" ? status : result,
    });
  });
  await page.route("**/api/social-download.php?token=*", (route) => {
    if (behavior === "limit")
      return route.fulfill({
        status: 429,
        json: { error: "The download service has reached its usage limit." },
      });
    if (behavior === "expired")
      return route.fulfill({
        status: 410,
        json: {
          error: "This download link has expired. Fetch the media again.",
        },
      });
    return route.fulfill({
      contentType: "image/jpeg",
      body: Buffer.from("fixture-media-bytes"),
    });
  });
  await page.goto("/tools/social/instagram-downloader/");
  await page.locator("#social-input").fill("https://instagram.com/p/abc/");
  await page.getByRole("button", { name: "Find media", exact: true }).click();
  const link = page.getByRole("link", { name: "Download photo", exact: true });
  await link.click();
  await expect(page.locator("p[role=alert]")).toContainText("usage limit");
  await expect(link).toBeVisible();

  behavior = "expired";
  await link.click();
  await expect(page.locator("p[role=alert]")).toContainText("has expired");
  await page.getByRole("button", { name: "Fetch media again" }).click();
  await expect(
    page.getByRole("button", { name: "Fetch media again" }),
  ).toHaveCount(0);
  expect(lookups).toBe(2);

  behavior = "ok";
  const download = page.waitForEvent("download");
  await link.click();
  expect((await download).suggestedFilename()).toBe("photo.jpg");
  await expect(page.getByText(/Saved photo\.jpg \(19 B\)\./)).toBeVisible();
  await expect(page.locator("p[role=alert]")).toHaveCount(0);
});

test("slow downloads show a waiting state and progress, and can be canceled", async ({
  page,
}) => {
  let served = 0;
  await page.route("**/api/social.php", (route) =>
    route.fulfill({
      json: route.request().method() === "GET" ? status : result,
    }),
  );
  await page.route("**/api/social-download.php?token=*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    served++;
    await route
      .fulfill({
        contentType: "image/jpeg",
        body: Buffer.from("fixture-media-bytes"),
      })
      .catch(() => {});
  });
  await page.goto("/tools/social/instagram-downloader/");
  await page.locator("#social-input").fill("https://instagram.com/p/abc/");
  await page.getByRole("button", { name: "Find media", exact: true }).click();
  await page.getByRole("button", { name: "Download selected ZIP (1)" }).click();
  const bar = page.getByRole("progressbar", {
    name: "Downloading file 1 of 1",
  });
  await expect(bar).toBeVisible();
  // No bytes yet: the bar pulses rather than claiming a percentage.
  await expect(bar).not.toHaveAttribute("aria-valuenow", /.+/);
  await expect(page.getByText("Waiting for the server…")).toBeVisible();
  // Other downloads are unavailable while one is running.
  await expect(
    page.getByRole("link", { name: "Download photo", exact: true }),
  ).toHaveAttribute("aria-disabled", "true");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByText("Canceled.", { exact: true })).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Download photo", exact: true }),
  ).toHaveAttribute("aria-disabled", "false");
  await page.waitForTimeout(1800);
  expect(served).toBe(1);
  await expect(page.getByText(/^Saved /)).toHaveCount(0);

  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download photo", exact: true }).click();
  await expect(
    page.getByRole("progressbar", { name: /Downloading photo\.jpg/ }),
  ).toBeVisible();
  expect((await download).suggestedFilename()).toBe("photo.jpg");
  await expect(page.getByText(/Saved photo\.jpg/)).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveCount(0);
});

test("a failed highlight keeps the list so another choice costs no new lookup", async ({
  page,
}) => {
  const requests: string[] = [];
  let highlightCalls = 0;
  await page.route("**/api/social.php", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: status });
    const { input } = route.request().postDataJSON();
    requests.push(input);
    if (input === "creator")
      return route.fulfill({
        json: {
          title: "Highlights",
          items: [],
          collections: [
            { id: "111", title: "Travel" },
            { id: "222", title: "Food" },
          ],
          expiresAt: result.expiresAt,
        },
      });
    if (++highlightCalls === 1)
      return route.fulfill({
        status: 502,
        json: { error: "This public media is unavailable from the provider." },
      });
    return route.fulfill({ json: result });
  });
  await page.goto("/tools/social/instagram-highlights/");
  await page.locator("#social-input").fill("creator");
  await page
    .getByRole("button", { name: "Find highlights", exact: true })
    .click();
  await page.getByRole("button", { name: "Travel" }).click();
  await expect(page.locator("p[role=alert]")).toContainText("unavailable");
  await expect(page.getByRole("button", { name: "Travel" })).toBeVisible();
  await page.getByRole("button", { name: "Food" }).click();
  await expect(
    page.getByRole("heading", { name: "1 file found" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Food" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("button", { name: "Travel" })).toBeVisible();
  expect(requests).toEqual([
    "creator",
    "https://www.instagram.com/stories/highlights/111/",
    "https://www.instagram.com/stories/highlights/222/",
  ]);
});

test("social links pasted without https:// are completed before sending", async ({
  page,
}) => {
  const requests: { input: string }[] = [];
  await page.route("**/api/social.php", async (route) => {
    if (route.request().method() === "POST")
      requests.push(route.request().postDataJSON());
    await route.fulfill({
      json: route.request().method() === "GET" ? status : result,
    });
  });
  await page.goto("/tools/social/twitter-downloader/");
  await page.locator("#social-input").fill("x.com/creator/status/123");
  await page.getByRole("button", { name: "Find media", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "1 file found" }),
  ).toBeVisible();
  expect(requests.at(-1)?.input).toBe("https://x.com/creator/status/123");
});

test("large JSON stays responsive: colors are skipped and the tree renders lazily", async ({
  page,
}) => {
  await page.goto("/tools/developer/json-formatter/");
  const wide = JSON.stringify(
    Array.from({ length: 6000 }, (_, i) => ({
      id: i,
      name: `item ${i}`,
      ok: true,
    })),
  );
  const started = Date.now();
  await page.getByLabel("Input JSON").fill(wide);
  await expect(page.getByText(/Syntax colors are off/)).toBeVisible({
    timeout: 8000,
  });
  // A 130 KB document used to freeze the page for about three seconds.
  expect(Date.now() - started).toBeLessThan(8000);
  expect(await page.locator("pre span").count()).toBe(0);
  await expect(page.locator("pre")).toContainText('"name": "item 5999"');

  const cube = Object.fromEntries(
    Array.from({ length: 40 }, (_, a) => [
      `a${a}`,
      Object.fromEntries(
        Array.from({ length: 40 }, (_, b) => [
          `b${b}`,
          Object.fromEntries(
            Array.from({ length: 40 }, (_, c) => [`c${c}`, c]),
          ),
        ]),
      ),
    ]),
  );
  await page.getByLabel("Input JSON").fill(JSON.stringify(cube));
  await page.getByRole("button", { name: "Tree", exact: true }).click();
  await expect(page.getByText("{40 keys}").first()).toBeVisible({
    timeout: 8000,
  });
  // Only opened levels are rendered: 1 + 40 + 1,600 nodes rather than 65,000.
  const nodes = await page
    .locator('section[aria-label$="workspace"] details')
    .count();
  expect(nodes).toBeLessThan(2000);
});

test("Base64 download name can be cleared, is made safe, and large results are previewed", async ({
  page,
}) => {
  await page.goto("/tools/developer/base64/");
  await page.getByRole("button", { name: "Decode", exact: true }).click();
  await page.getByLabel("Base64 to decode").fill("SGVsbG8=");
  const name = page.getByLabel("Download filename");
  await name.fill("");
  await expect(name).toHaveValue("");
  await name.fill("../evil?.bin");
  let download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download bytes" }).click();
  expect((await download).suggestedFilename()).toBe("evil-.bin");
  await name.fill("");
  download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download bytes" }).click();
  expect((await download).suggestedFilename()).toBe("decoded.bin");

  await page.getByRole("button", { name: "Encode", exact: true }).click();
  await page.getByLabel("Text to encode").fill("a".repeat(600_000));
  await expect(
    page.getByText(/Showing the first 500,000 of 800,000 characters/),
  ).toBeVisible();
  expect(
    (await page.getByLabel("Result", { exact: true }).inputValue()).length,
  ).toBe(500_000);
});

test("QR codes warn when the colors will not scan", async ({ page }) => {
  await page.goto("/tools/generators/qr-code/");
  await expect(page.getByAltText("Generated QR code")).toBeVisible();
  await expect(page.getByText(/too similar|inverted/)).toHaveCount(0);
  await page.getByLabel("Foreground").fill("#f0f0f0");
  await expect(page.getByText(/colors are too similar/)).toBeVisible();
  await page.getByLabel("Foreground").fill("#ffffff");
  await page.getByLabel("Background").fill("#000000");
  await expect(page.getByText(/inverted/)).toBeVisible();
  await page.getByLabel("Foreground").fill("#000000");
  await page.getByLabel("Background").fill("#ffffff");
  await expect(page.getByText(/too similar|inverted/)).toHaveCount(0);
});

test("a crashing tool shows a recovery panel instead of a blank page", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(Intl, "NumberFormat", {
      value: function () {
        throw new Error("simulated crash");
      },
    });
  });
  await page.goto("/tools/calculators/compound-interest/");
  await expect(
    page.getByRole("heading", { name: "This tool ran into a problem" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  // The rest of the site keeps working.
  await expect(
    page.getByRole("link", { name: "Privacy Policy" }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Search tools" }),
  ).toBeVisible();
});

test("search supports arrow keys and Enter without reloading the page", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    (window as unknown as Record<string, boolean>).__spa = true;
  });
  const search = page.getByRole("combobox", { name: "Search tools" });
  await search.fill("pdf");
  await expect(page.getByRole("option", { selected: true })).toContainText(
    "PDF merger",
  );
  await search.press("ArrowDown");
  await expect(page.getByRole("option", { selected: true })).toContainText(
    "PDF splitter",
  );
  await search.press("Enter");
  await expect(page).toHaveURL(/\/tools\/pdf\/split-pdf\/$/);
  expect(
    await page.evaluate(
      () => (window as unknown as Record<string, boolean>).__spa,
    ),
  ).toBe(true);
});

test("the mobile menu scrolls when the screen is short", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 320 });
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  const menu = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(menu).toBeVisible();
  const fits = await menu.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return {
      withinScreen: box.bottom <= window.innerHeight + 1,
      scrollable: element.scrollHeight > element.clientHeight,
    };
  });
  expect(fits).toEqual({ withinScreen: true, scrollable: true });
});

test("every page fits a 320px phone without sideways scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  const paths = [
    "/",
    "/about/",
    "/privacy-policy/",
    ...categories.map((category) => `/tools/${category.slug}/`),
    ...tools.map(toolPath),
  ];
  const overflowing: string[] = [];
  for (const path of paths) {
    await page.goto(path);
    await expect(
      page.getByRole("status", { name: "Loading tool" }),
    ).toHaveCount(0);
    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    if (!fits) overflowing.push(path);
  }
  expect(overflowing).toEqual([]);
});

test("long file names and results do not break narrow layouts", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  const fits = () =>
    page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
  const longName = `${"quarterly-financial-report-".repeat(5)}final`;
  await page.goto("/tools/pdf/merge-pdf/");
  await page.locator('input[type="file"]').setInputFiles(
    [1, 2].map((n) => ({
      name: `${longName}-${n}.pdf`,
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n"),
    })),
  );
  await expect(
    page.getByRole("button", { name: /Move .* up/ }).first(),
  ).toBeVisible();
  expect(await fits()).toBeTruthy();

  await page.goto("/tools/media/image-compressor/");
  await page.locator('input[type="file"]').setInputFiles({
    name: `${longName}.png`,
    mimeType: "image/png",
    buffer: await png(),
  });
  await page
    .getByRole("button", { name: "Compress images", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Processed images" }),
  ).toBeVisible();
  expect(await fits()).toBeTruthy();
});
