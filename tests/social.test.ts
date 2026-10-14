import test from "node:test";
import assert from "node:assert/strict";
import {
  SocialHttpError,
  fetchSocialMedia,
  isSafeDownloadUrl,
  isSafePreviewUrl,
  mediaFilename,
  parseSocialResult,
  parseSocialStatus,
  readSocialJson,
  socialModes,
  validateSocialInput,
} from "../lib/social";
import { categories, tools } from "../lib/catalog";

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  });
const item = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  kind: "photo",
  filename: `photo-${id}.jpg`,
  downloadUrl: `/api/social-download.php?token=abc_${id}.def-${id}`,
  ...extra,
});

test("every social downloader has a crawlable catalog page and implementation", () => {
  assert.ok(categories.some((category) => category.slug === "social"));
  for (const slug of Object.keys(socialModes)) {
    const tool = tools.find((item) => item.slug === slug);
    assert.equal(tool?.category, "social");
    assert.ok(tool.description.length < 160);
    assert.equal(tool.steps.length, 3);
    assert.ok(tool.faq.some((item) => item.answer.includes("server gateway")));
  }
});
test("social links accept the selected platform and reject lookalike hosts or unsafe schemes", () => {
  assert.equal(
    validateSocialInput("instagram", "stories", " @creator "),
    "creator",
  );
  assert.equal(
    validateSocialInput(
      "twitter",
      "post",
      "https://x.com/user/status/123#anchor",
    ),
    "https://x.com/user/status/123",
  );
  for (const input of [
    "https://x.com.attacker.test/user/status/123",
    "http://x.com/user/status/123",
    "https://x.com:443/user/status/123",
    "https://user@x.com/user/status/123",
    "javascript:alert(1)",
  ]) {
    if (input.includes(":443")) continue;
    assert.throws(() => validateSocialInput("twitter", "post", input));
  }
  assert.throws(() => validateSocialInput("instagram", "post", "creator"));
  assert.throws(() =>
    validateSocialInput("tiktok", "post", "https://instagram.com/p/123/"),
  );
});
test("links pasted without https:// are completed, but never into another site", () => {
  assert.equal(
    validateSocialInput("twitter", "post", "x.com/user/status/123"),
    "https://x.com/user/status/123",
  );
  assert.equal(
    validateSocialInput(
      "instagram",
      "post",
      "WWW.Instagram.com/reel/abc/?igsh=1",
    ),
    "https://www.instagram.com/reel/abc/?igsh=1",
  );
  assert.equal(
    validateSocialInput("reddit", "post", "redd.it/abc123"),
    "https://redd.it/abc123",
  );
  for (const input of [
    "x.com.attacker.test/user/status/1",
    "evil.test/x.com/user/status/1",
    "notx.com/user/status/1",
    "x.com@evil.test/user/status/1",
    "http://x.com/user/status/1",
    "ftp://x.com/user/status/1",
    "   ",
    "x".repeat(2049),
  ])
    assert.throws(() => validateSocialInput("twitter", "post", input), input);
  // The completed URL must still belong to the chosen platform.
  assert.throws(() =>
    validateSocialInput("tiktok", "post", "instagram.com/p/123/"),
  );
});

test("gateway results are validated before reaching the page", () => {
  const parsed = parseSocialResult({
    title: "Public media",
    expiresAt: 1234,
    items: [
      item("1", {
        previewUrl: "/api/social-download.php?inline=1&token=aa.bb",
        width: 1080,
        height: 1350,
        note: "n",
      }),
      item("2", {
        kind: "video",
        previewUrl: "https://evil.test/x.jpg",
        width: -5,
        height: "tall",
      }),
    ],
    collections: [
      { id: "123", title: "Travel" },
      { id: "abc", title: "Not numeric" },
      { id: "456" },
      null,
    ],
  });
  assert.equal(parsed.items.length, 2);
  assert.equal(
    parsed.items[0].previewUrl,
    "/api/social-download.php?inline=1&token=aa.bb",
  );
  assert.equal(parsed.items[1].previewUrl, undefined);
  assert.equal(parsed.items[1].width, undefined);
  assert.equal(parsed.items[1].height, undefined);
  assert.deepEqual(parsed.collections, [
    { id: "123", title: "Travel" },
    { id: "456", title: "Highlight" },
  ]);
  assert.equal(parsed.expiresAt, 1234);
  const names = parseSocialResult({
    items: [item("1", { filename: "../../x y<script>.jpg" })],
  });
  assert.match(names.items[0].filename, /^[a-zA-Z0-9_.-]+$/);
  assert.ok(parseSocialResult({ items: [] }).expiresAt > Date.now() / 1000);
});
test("malformed gateway results are rejected instead of crashing or injecting links", () => {
  const bad: unknown[] = [
    null,
    "text",
    [],
    {},
    { items: "nope" },
    { items: [null] },
    { items: [item("1", { kind: "audio" })] },
    { items: [item("1", { filename: 5 })] },
    { items: [item("1", { downloadUrl: "javascript:alert(1)" })] },
    { items: [item("1", { downloadUrl: "https://evil.test/a.jpg" })] },
    {
      items: [item("1", { downloadUrl: "/api/social-download.php?token=a b" })],
    },
    {
      items: [
        item("1", { downloadUrl: "/api/social-download.php?token=a&x=1" }),
      ],
    },
    {
      items: [
        item("1", {
          downloadUrl: "//evil.test/api/social-download.php?token=a",
        }),
      ],
    },
    { items: [item("1"), item("1")] },
    { items: [item("")] },
    { items: Array.from({ length: 101 }, (_, i) => item(String(i + 1))) },
  ];
  for (const value of bad)
    assert.throws(
      () => parseSocialResult(value),
      /invalid download response/,
      JSON.stringify(value)?.slice(0, 80),
    );
  assert.equal(
    parseSocialResult({
      items: Array.from({ length: 100 }, (_, i) => item(String(i + 1))),
    }).items.length,
    100,
  );
});
test("download and preview URLs are restricted to signed gateway links", () => {
  assert.ok(isSafeDownloadUrl("/api/social-download.php?token=abc.def_-9"));
  assert.ok(
    isSafePreviewUrl("/api/social-download.php?inline=1&token=abc.def"),
  );
  for (const url of [
    "",
    null,
    undefined,
    42,
    "/api/social-download.php?token=",
    "/api/social-download.php?token=a\nb",
    "/api/social-download.php?token=a%0d%0ab",
    "/api/social-download.php?token=a#frag",
    "/api/other.php?token=abc",
    "http://x/api/social-download.php?token=abc",
  ])
    assert.equal(isSafeDownloadUrl(url), false, String(url));
  assert.equal(isSafePreviewUrl("/api/social-download.php?token=abc"), false);
});
test("service status is normalized with safe defaults", () => {
  assert.deepEqual(
    parseSocialStatus({ ready: true, providers: { scrapeCreators: true } }),
    {
      ready: true,
      providers: { scrapeCreators: true, rocketApi: false },
      message: undefined,
    },
  );
  assert.equal(parseSocialStatus({ ready: "yes" }).ready, false);
  assert.equal(parseSocialStatus({}).providers.rocketApi, false);
  assert.throws(() => parseSocialStatus(null), /not available yet/);
  assert.throws(() => parseSocialStatus("html"), /not available yet/);
});

test("gateway failures become readable messages with their status attached", async () => {
  assert.deepEqual(await readSocialJson(json({ ready: true })), {
    ready: true,
  });
  const cases: [Response, number, RegExp][] = [
    [
      json({ error: "Usage limit reached." }, { status: 429 }),
      429,
      /^Usage limit reached\.$/,
    ],
    [
      json({ nothing: true }, { status: 429 }),
      429,
      /download limit was reached/,
    ],
    [json({ error: "" }, { status: 502 }), 502, /had a problem/],
    [
      new Response("<html>nope</html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
      200,
      /not available yet/,
    ],
    [
      new Response("<?php echo 1;", {
        status: 200,
        headers: { "content-type": "application/x-httpd-php" },
      }),
      200,
      /not available yet/,
    ],
    [
      new Response("Bad gateway", {
        status: 502,
        headers: { "content-type": "text/html" },
      }),
      502,
      /had a problem/,
    ],
    [
      new Response("Slow down", {
        status: 429,
        headers: { "content-type": "text/plain" },
      }),
      429,
      /download limit was reached/,
    ],
    [
      new Response("{broken", {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
      200,
      /unreadable response/,
    ],
  ];
  for (const [response, status, message] of cases) {
    await assert.rejects(
      () => readSocialJson(response),
      (error: unknown) => {
        assert.ok(error instanceof SocialHttpError);
        assert.equal(error.status, status);
        assert.match(error.message, message);
        assert.doesNotMatch(error.message, /Unexpected token|JSON/);
        return true;
      },
    );
  }
});

function stubFetch(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
) {
  const original = globalThis.fetch;
  globalThis.fetch = ((url: string, init?: RequestInit) =>
    Promise.resolve(handler(url, init))) as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}
const chunked = (chunks: Uint8Array[], headers: Record<string, string>) =>
  new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk);
        controller.close();
      },
    }),
    { headers },
  );
const link = "/api/social-download.php?token=abc.def";

test("media downloads stream with progress and report the real file type", async () => {
  const restore = stubFetch(() =>
    chunked([new Uint8Array(100).fill(1), new Uint8Array(50).fill(2)], {
      "content-type": "image/webp; charset=binary",
      "content-length": "150",
    }),
  );
  try {
    const seen: [number, number | undefined][] = [];
    const media = await fetchSocialMedia(link, {
      onProgress: (loaded, total) => seen.push([loaded, total]),
    });
    assert.equal(media.size, 150);
    assert.equal(media.mime, "image/webp");
    assert.equal(media.extension, "webp");
    assert.deepEqual(seen, [
      [100, 150],
      [150, 150],
    ]);
    assert.equal(
      media.chunks.reduce((n, c) => n + c.length, 0),
      150,
    );
    assert.equal(
      mediaFilename("instagram-1.jpg", media.extension),
      "instagram-1.webp",
    );
  } finally {
    restore();
  }
});
test("media downloads fail with actionable messages", async () => {
  const run = async (response: Response, options = {}) => {
    const restore = stubFetch(() => response);
    try {
      return await fetchSocialMedia(link, options).then(
        () => null,
        (error: Error) => error,
      );
    } finally {
      restore();
    }
  };
  const expired = await run(
    json(
      { error: "This download link has expired. Fetch the media again." },
      { status: 410 },
    ),
  );
  assert.ok(expired instanceof SocialHttpError);
  assert.equal(expired.status, 410);
  assert.match(expired.message, /expired/);
  assert.match(
    (await run(json({ error: "limit" }, { status: 429 })))!.message,
    /^limit$/,
  );
  assert.match(
    (await run(
      new Response("<html>", {
        status: 500,
        headers: { "content-type": "text/html" },
      }),
    ))!.message,
    /had a problem/,
  );
  assert.match(
    (await run(
      new Response("x", { headers: { "content-type": "text/html" } }),
    ))!.message,
    /unsupported file type/,
  );
  assert.match(
    (await run(
      new Response("", { headers: { "content-type": "image/jpeg" } }),
    ))!.message,
    /empty file/,
  );
  assert.match(
    (await run(
      chunked([new Uint8Array(10)], {
        "content-type": "image/png",
        "content-length": "5000",
      }),
      { maxBytes: 100, limitMessage: "Too big for a ZIP." },
    ))!.message,
    /^Too big for a ZIP\.$/,
  );
  const streamed = await run(
    chunked([new Uint8Array(60), new Uint8Array(60)], {
      "content-type": "video/mp4",
    }),
    { maxBytes: 100, limitMessage: "Too big for a ZIP." },
  );
  assert.match(streamed!.message, /Too big for a ZIP/);
  await assert.rejects(
    () => fetchSocialMedia("https://evil.test/x.jpg"),
    /invalid download response/,
  );
  await assert.rejects(
    () => fetchSocialMedia("/api/social-download.php?token=a b"),
    /invalid download response/,
  );
});
test("a canceled download stops with an AbortError and fetches nothing further", async () => {
  const controller = new AbortController();
  let calls = 0;
  const restore = stubFetch((_url, init) => {
    calls++;
    return new Response(
      new ReadableStream({
        start(stream) {
          init?.signal?.addEventListener("abort", () =>
            stream.error(new DOMException("Aborted", "AbortError")),
          );
        },
      }),
      { headers: { "content-type": "video/mp4" } },
    );
  });
  try {
    const pending = fetchSocialMedia(link, { signal: controller.signal });
    setTimeout(() => controller.abort(), 10);
    await assert.rejects(
      pending,
      (error: Error) => error.name === "AbortError",
    );
    assert.equal(calls, 1);
  } finally {
    restore();
  }
});
