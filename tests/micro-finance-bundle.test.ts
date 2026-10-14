import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { microFinancePath } from "../lib/catalog";

// The built Micro Finance app that ships inside this site, served at /finance/.
const publicFolder = new URL("../public/", import.meta.url);
const bundle = new URL("../public/finance/", import.meta.url);
const scripts = new URL("../scripts/micro-finance/", import.meta.url);
const read = (name: string, base: URL = bundle) =>
  readFileSync(new URL(name, base), "utf8");

/** Whether the file a site-absolute URL points at is part of the shipped site. */
function shipped(url: string) {
  let { pathname } = new URL(url, "https://example.test");
  if (pathname.endsWith("/")) pathname += "index.html";
  return existsSync(new URL(`.${pathname}`, publicFolder));
}

test("every file the page and the manifest name is in the bundle, inside /finance/", () => {
  const urls = [...read("index.html").matchAll(/(?:href|src)="([^"]+)"/g)].map(
    (match) => match[1],
  );
  assert.ok(
    urls.length >= 6,
    "index.html links its manifest, icons and assets",
  );
  const manifest = JSON.parse(read("manifest.json"));
  assert.equal(manifest.id, microFinancePath);
  assert.equal(manifest.scope, microFinancePath);
  urls.push(
    manifest.start_url,
    ...manifest.icons.map((icon: { src: string }) => icon.src),
    ...manifest.shortcuts.flatMap(
      (shortcut: { url: string; icons: { src: string }[] }) => [
        shortcut.url,
        ...shortcut.icons.map((icon) => icon.src),
      ],
    ),
  );
  assert.equal(manifest.shortcuts.length, 3);
  for (const url of urls) {
    assert.ok(url.startsWith(microFinancePath), `${url} is outside the folder`);
    assert.ok(shipped(url), `${url} is not in the bundle`);
  }
});

test("the service worker is stamped for its build and names nothing outside its own folder", () => {
  const worker = read("sw.js");
  assert.doesNotMatch(worker, /__BUILD_ID__/);
  assert.match(worker, /const BUILD_ID = '[0-9a-f]{12}';/);
  assert.doesNotMatch(worker, /https?:\/\//);
  assert.match(worker, /new URL\('\.\/', self\.location\.href\)\.pathname/);
});

type Listener = (event: Record<string, unknown>) => void;

/** Runs the shipped sw.js in a sandbox that stands in for a service worker's globals. */
function startWorker(
  scriptUrl: string,
  {
    page = "",
    network = "up",
  }: { page?: string; network?: "up" | "down" } = {},
) {
  const listeners: Record<string, Listener> = {};
  const precached: string[][] = [];
  const requested: { url: string; cache?: string }[] = [];
  const stored = new Map<string, unknown>();
  const opened: string[] = [];
  const windows: {
    url: string;
    focused: boolean;
    messages: unknown[];
    focus(): Promise<void>;
    postMessage(message: unknown): void;
  }[] = [];
  const cache = {
    addAll: async (urls: string[]) => void precached.push(Array.from(urls)),
    put: async (key: string, response: unknown) =>
      void stored.set(key, response),
    match: async (key: string) => stored.get(key),
  };
  const sandbox = {
    self: {
      location: new URL(scriptUrl),
      addEventListener: (type: string, listener: Listener) =>
        void (listeners[type] = listener),
      skipWaiting: async () => {},
      clients: {
        claim: async () => {},
        matchAll: async () => windows,
        openWindow: async (url: string) => void opened.push(url),
      },
    },
    caches: {
      open: async () => cache,
      keys: async () => [],
      delete: async () => true,
    },
    fetch: async (
      input: string | { url: string },
      init?: { cache?: string },
    ) => {
      requested.push({
        url: typeof input === "string" ? input : input.url,
        ...(init?.cache ? { cache: init.cache } : {}),
      });
      if (network === "down") throw new TypeError("Failed to fetch");
      return {
        ok: true,
        type: "basic",
        text: async () => page,
        clone() {
          return this;
        },
      };
    },
    Response: { error: () => "error-response" },
    URL,
    setTimeout: () => 0,
  };
  vm.runInNewContext(read("sw.js"), sandbox, { filename: "sw.js" });

  const settle = async (
    event: (waitUntil: (p: Promise<unknown>) => void) => void,
  ) => {
    const pending: Promise<unknown>[] = [];
    event((promise) => void pending.push(promise));
    await Promise.all(pending);
  };
  return {
    precached,
    requested,
    stored,
    opened,
    install: () => settle((waitUntil) => listeners.install({ waitUntil })),
    /** The promise the worker answered with, or undefined when it left the request alone. */
    request(url: string, { method = "GET", mode = "no-cors" } = {}) {
      let answer: Promise<unknown> | undefined;
      listeners.fetch({
        request: { method, url, mode },
        respondWith: (promise: Promise<unknown>) => void (answer = promise),
      });
      return answer;
    },
    tap: (data?: { url: string }) =>
      settle((waitUntil) =>
        listeners.notificationclick({
          notification: { close() {}, data },
          waitUntil,
        }),
      ),
    addWindow(url: string) {
      const window = {
        url,
        focused: false,
        messages: [] as unknown[],
        async focus() {
          window.focused = true;
        },
        postMessage(message: unknown) {
          window.messages.push(JSON.parse(JSON.stringify(message)));
        },
      };
      windows.push(window);
      return window;
    },
  };
}

test("inside /finance/ the worker caches the app shell and the hashed files from that folder only", async () => {
  const worker = startWorker("https://example.test/finance/sw.js", {
    page:
      '<link rel="icon" href="/finance/favicon.svg">' +
      '<script type="module" src="/finance/assets/index-aaaa1111.js"></script>' +
      '<link rel="stylesheet" href="/finance/assets/index-bbbb2222.css">' +
      '<script src="/assets/foreign.js"></script>',
  });
  await worker.install();
  assert.deepEqual(worker.precached, [
    [
      "/finance/",
      "/finance/index.html",
      "/finance/manifest.json",
      "/finance/favicon.svg",
      "/finance/icons/icon-192.png",
      "/finance/icons/icon-512.png",
      "/finance/icons/apple-touch-icon.png",
    ],
    ["/finance/assets/index-aaaa1111.js", "/finance/assets/index-bbbb2222.css"],
  ]);
  assert.deepEqual(worker.requested, [
    { url: "/finance/index.html", cache: "reload" },
  ]);
});

test("the same worker file still works at the root of an address of its own", async () => {
  const worker = startWorker("https://finance.example.test/sw.js", {
    page: '<script src="/assets/index-aaaa1111.js"></script>',
  });
  await worker.install();
  assert.deepEqual(worker.precached[0].slice(0, 3), [
    "/",
    "/index.html",
    "/manifest.json",
  ]);
  assert.deepEqual(worker.precached[1], ["/assets/index-aaaa1111.js"]);
  assert.ok(
    worker.request("https://finance.example.test/?tab=bills", {
      mode: "navigate",
    }),
  );
});

test("the worker answers only for requests inside its own folder, so the rest of the site is untouched", async () => {
  const worker = startWorker("https://example.test/finance/sw.js");
  const answers: (Promise<unknown> | undefined)[] = [];
  const answered = (url: string, init?: { method?: string; mode?: string }) => {
    const answer = worker.request(url, init);
    answers.push(answer);
    return answer !== undefined;
  };
  for (const url of [
    "https://example.test/finance/",
    "https://example.test/finance/?tab=bills",
    "https://example.test/finance/assets/index-aaaa1111.js",
  ])
    assert.ok(
      answered(url, { mode: url.endsWith(".js") ? "no-cors" : "navigate" }),
      url,
    );
  for (const url of [
    "https://example.test/",
    "https://example.test/tools/pdf/merge-pdf/",
    "https://example.test/_next/static/chunks/main.js",
    "https://example.test/api/social.php",
    "https://example.test/finance-tools/",
    "https://elsewhere.example/finance/app.js",
  ])
    assert.equal(answered(url, { mode: "navigate" }), false, url);
  assert.equal(
    answered("https://example.test/finance/", { method: "POST" }),
    false,
  );
  await Promise.all(answers);
});

test("offline, a page inside /finance/ falls back to the cached app and never to another page", async () => {
  const online = startWorker("https://example.test/finance/sw.js");
  await online.request("https://example.test/finance/?tab=bills", {
    mode: "navigate",
  });
  assert.deepEqual([...online.stored.keys()], ["/finance/index.html"]);

  const offline = startWorker("https://example.test/finance/sw.js", {
    network: "down",
  });
  offline.stored.set("/finance/index.html", "the cached app");
  assert.equal(
    await offline.request("https://example.test/finance/?action=log", {
      mode: "navigate",
    }),
    "the cached app",
  );

  const nothingCached = startWorker("https://example.test/finance/sw.js", {
    network: "down",
  });
  assert.equal(
    await nothingCached.request("https://example.test/finance/", {
      mode: "navigate",
    }),
    "error-response",
  );
});

test("tapping a notification reuses only a window that is inside the app", async () => {
  const worker = startWorker("https://example.test/finance/sw.js");
  const otherTab = worker.addWindow(
    "https://example.test/tools/pdf/merge-pdf/",
  );

  await worker.tap({ url: "/finance/?tab=bills" });
  assert.deepEqual(worker.opened, ["https://example.test/finance/?tab=bills"]);
  assert.equal(otherTab.focused, false);
  assert.deepEqual(otherTab.messages, []);

  const app = worker.addWindow("https://example.test/finance/");
  await worker.tap({ url: "/finance/?action=log" });
  assert.equal(app.focused, true);
  assert.deepEqual(app.messages, [
    { type: "navigate", url: "https://example.test/finance/?action=log" },
  ]);
  assert.equal(otherTab.focused, false);
  assert.equal(worker.opened.length, 1);

  // Without a target it goes to the app's home, not the site's.
  await worker.tap();
  assert.deepEqual(app.messages.at(-1), {
    type: "navigate",
    url: "https://example.test/finance/",
  });
});

test("cache rules revalidate the app shell and keep only content-hashed files for good", () => {
  const shellFiles = ["index.html", "sw.js", "manifest.json"];
  const rule = read(".htaccess").match(
    /<FilesMatch "([^"]+)">\s*Header set Cache-Control "no-cache"\s*<\/FilesMatch>/,
  );
  assert.ok(rule, "finance/.htaccess revalidates the shell");
  const revalidated = new RegExp(rule[1]);
  for (const name of shellFiles) assert.ok(revalidated.test(name), name);
  for (const name of readdirSync(bundle))
    if (!shellFiles.includes(name))
      assert.ok(!revalidated.test(name), `${name} should not be revalidated`);

  assert.match(
    read("assets/.htaccess"),
    /Header set Cache-Control "public, max-age=31536000, immutable"/,
  );
  const assets = readdirSync(new URL("assets/", bundle)).filter(
    (name) => !name.startsWith("."),
  );
  assert.ok(assets.length >= 2);
  for (const name of assets)
    assert.match(
      name,
      /-[A-Za-z0-9_-]{8}\.(js|css)$/,
      `${name} is not content-hashed`,
    );

  // The site-wide immutable rule must never reach the app's page, worker or manifest.
  const siteRules = [
    ...read(".htaccess", publicFolder).matchAll(
      /expr=%\{REQUEST_URI\} =~ m#([^#]+)#/g,
    ),
  ];
  assert.ok(siteRules.length >= 1);
  for (const [, pattern] of siteRules)
    for (const name of shellFiles)
      assert.ok(
        !new RegExp(pattern).test(`${microFinancePath}${name}`),
        `${pattern} matches ${name}`,
      );
});

test("the bundle is reproducible: a pinned commit and one patch with a known footprint", () => {
  const source = JSON.parse(read("source.json", scripts));
  assert.match(source.commit, /^[0-9a-f]{40}$/);
  assert.equal(`/${source.folder}/`, microFinancePath);
  const touched = [
    ...read("subpath.patch", scripts).matchAll(/^diff --git a\/(\S+) b\//gm),
  ]
    .map((match) => match[1])
    .sort();
  assert.deepEqual(touched, [
    "public/sw.js",
    "src/hooks/useNotifications.ts",
    "src/lib/appUrl.test.ts",
    "src/lib/appUrl.ts",
    "src/lib/notifier.ts",
    "src/lib/notify.test.ts",
    "src/lib/notify.ts",
    "src/lib/pwa.ts",
    "vite.config.ts",
  ]);
});
