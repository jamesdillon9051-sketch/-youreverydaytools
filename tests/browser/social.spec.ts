import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { unzipSync } from "fflate";
import { socialModes } from "../../lib/social";
import { mockAdsterra } from "./ad-fixture";

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
    {
      id: "2",
      kind: "video",
      filename: "video.mp4",
      downloadUrl: "/api/social-download.php?token=fixture-video",
      note: "Provider media",
    },
  ],
};
test.beforeEach(async ({ page }) => {
  await mockAdsterra(page);
  await page
    .context()
    .route("**/api/social-download.php?token=*", async (route) =>
      route.fulfill({
        contentType: route.request().url().includes("photo")
          ? "image/jpeg"
          : "video/mp4",
        body: Buffer.from("fixture-media-bytes"),
      }),
    );
});
test("all nine tools send the correct public input and display downloadable results", async ({
  page,
}) => {
  const requests: unknown[] = [];
  await page.route("**/api/social.php", async (route) => {
    if (route.request().method() === "POST")
      requests.push(route.request().postDataJSON());
    await route.fulfill({
      json: route.request().method() === "GET" ? status : result,
    });
  });
  for (const [slug, settings] of Object.entries(socialModes)) {
    await page.goto(`/tools/social/${slug}/`);
    await expect(page.locator("h1")).toHaveCount(1);
    const input =
      settings.mode === "post"
        ? {
            tiktok: "https://www.tiktok.com/@creator/video/123",
            instagram: "https://instagram.com/reel/abc/",
            twitter: "https://x.com/creator/status/123",
            facebook: "https://facebook.com/reel/123",
            pinterest: "https://pinterest.com/pin/123/",
            reddit: "https://reddit.com/r/test/comments/abc/title/",
          }[settings.platform]
        : "creator";
    await page.locator("#social-input").fill(input);
    await page
      .getByRole("button", {
        name: settings.mode === "highlights" ? "Find highlights" : "Find media",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("heading", { name: "2 files found" }),
    ).toBeVisible();
    expect(requests.at(-1)).toEqual({
      platform: settings.platform,
      mode: settings.mode,
      input,
    });
    await expect(
      page.getByRole("link", { name: "Download photo", exact: true }),
    ).toHaveAttribute("href", result.items[0].downloadUrl);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
  }
  await page.setViewportSize({ width: 320, height: 760 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});
test("selection and media filters control ZIP contents with real response bytes", async ({
  page,
}) => {
  await page.route("**/api/social.php", (route) =>
    route.fulfill({
      json: route.request().method() === "GET" ? status : result,
    }),
  );
  await page.goto("/tools/social/instagram-downloader/");
  await page.locator("#social-input").fill("https://instagram.com/p/abc/");
  await page.getByRole("button", { name: "Find media", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Filter media" })
    .selectOption("photo");
  await expect(
    page.getByRole("link", { name: "Download video", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Select visible files").uncheck();
  await expect(
    page.getByRole("button", { name: "Download selected ZIP (1)" }),
  ).toBeEnabled();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download selected ZIP (1)" }).click();
  const downloaded = await pending;
  expect(downloaded.suggestedFilename()).toBe("instagram-media.zip");
  const archive = unzipSync(await readFile((await downloaded.path())!));
  expect(Object.keys(archive)).toEqual(["1-video.mp4"]);
  expect(Buffer.from(archive["1-video.mp4"]).toString()).toBe(
    "fixture-media-bytes",
  );
  await expect(
    page.getByRole("link", { name: "Download photo", exact: true }),
  ).toHaveAttribute("download", "photo.jpg");
});
test("highlight browsing requests selected collection and rejects mismatched links", async ({
  page,
}) => {
  const requests: { input: string }[] = [];
  await page.route("**/api/social.php", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: status });
    const body = route.request().postDataJSON();
    requests.push(body);
    await route.fulfill({
      json:
        body.input === "creator"
          ? {
              title: "Highlights",
              items: [],
              collections: [{ id: "12345", title: "Travel" }],
              expiresAt: result.expiresAt,
            }
          : result,
    });
  });
  await page.goto("/tools/social/instagram-highlights/");
  await page.locator("#social-input").fill("https://x.com/creator/status/123");
  await page
    .getByRole("button", { name: "Find highlights", exact: true })
    .click();
  await expect(page.locator("p[role=alert]")).toContainText("instagram");
  expect(requests).toHaveLength(0);
  await page.locator("#social-input").fill("creator");
  await page
    .getByRole("button", { name: "Find highlights", exact: true })
    .click();
  await page.getByRole("button", { name: "Travel" }).click();
  await expect(
    page.getByRole("heading", { name: "2 files found" }),
  ).toBeVisible();
  expect(requests.at(-1)?.input).toBe(
    "https://www.instagram.com/stories/highlights/12345/",
  );
});
test("unconfigured and limited providers show honest messages; canceled requests do not repopulate results", async ({
  page,
}) => {
  let active = false;
  let pending = false;
  await page.route("**/api/social.php", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({
        json: active
          ? status
          : {
              ready: false,
              providers: { scrapeCreators: false, rocketApi: false },
            },
      });
    if (pending) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.fulfill({ json: result }).catch(() => {});
      return;
    }
    await route.fulfill({
      status: 429,
      json: { error: "Usage limit reached. Try again later." },
    });
  });
  await page.goto("/tools/social/tiktok-downloader/");
  await expect(
    page.getByText(/awaiting activation by the site operator/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Find media", exact: true }),
  ).toBeDisabled();
  active = true;
  await page.getByRole("button", { name: "Check again" }).click();
  await page
    .locator("#social-input")
    .fill("https://tiktok.com/@creator/video/123");
  await page.getByRole("button", { name: "Find media", exact: true }).click();
  await expect(page.locator("p[role=alert]")).toContainText(
    "Usage limit reached",
  );
  pending = true;
  await page.getByRole("button", { name: "Find media", exact: true }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByText("Canceled.", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "2 files found" }),
  ).toHaveCount(0);
});
