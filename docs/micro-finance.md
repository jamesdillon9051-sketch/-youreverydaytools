# Micro Finance

Micro Finance is a private, offline-first budgeting app that was built separately (repository `jamesdillon9051-sketch/Micro-finance-`, branch `claude/finance-foundation`: Vite, React 19, TypeScript, Tailwind v4, Recharts). This site ships the built app at **`/finance/`** and lists it under **Calculators** at `/tools/calculators/micro-finance/`, where the "Open Micro Finance" button opens it in a new tab.

| Piece                                                                   | Where                                                                                                                                           |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Listing entry, the 17 modules, FAQ                                      | `lib/catalog.ts` (slug `micro-finance`)                                                                                                         |
| Launch panel (button, install steps, limits)                            | `components/MicroFinanceLauncher.tsx`                                                                                                           |
| "Tools and features" section, shown for any tool that defines `modules` | `components/ToolWrapper.tsx`                                                                                                                    |
| The app, built for `/finance/`                                          | `public/finance/` (copied into the static export like any other file)                                                                           |
| Its cache rules                                                         | `public/finance/.htaccess` and `public/finance/assets/.htaccess`, written from `scripts/micro-finance/*.htaccess`                               |
| How the bundle is made                                                  | `scripts/build-micro-finance.mjs`, `scripts/micro-finance/source.json` (pinned commit) and `scripts/micro-finance/subpath.patch`                |
| Tests                                                                   | `tests/catalog.test.ts`, `tests/micro-finance-bundle.test.ts`, `tests/browser/micro-finance.spec.ts`, `tests/browser/micro-finance-app.spec.ts` |

## Deploying

Nothing extra. Merge to `main`; the existing workflow builds the site, `public/finance/` is part of the export, and it is published to the `hostinger` branch (or uploaded over FTPS) with everything else, including the two small `.htaccess` files. Then open `https://tools.weeklydelight.com/finance/`. The website's deploy never builds the app, so a problem in the app's repository cannot stop a deploy.

## One thing to know: it shares this site's address

Browsers key `localStorage`, Cache Storage and service workers by address (origin), and the app keeps the whole budget in one `localStorage` entry, `micro-finance:state`. This site loads Google Analytics and the Adsterra ad scripts on every page, and any script that runs on any page of the address can read that entry. The app itself makes no network requests and none of those scripts run on `/finance/`, but they run on the site's other pages. A browser check confirms it: after saving data in the app, a script on `/` can read `micro-finance:state`.

What is done about it:

- The listing says so where people read it: the launch panel and the privacy answer in the FAQ state that the app shares this site's address with its analytics and ads.
- The app's service worker is confined to `/finance/`. It controls only pages in that folder and answers only requests inside it, so the rest of the site is untouched (checked in a browser: other pages are not controlled and are not answered by the worker, and offline they fail like any page rather than showing the app).
- A tapped notification only reuses a window that is inside `/finance/`, never another tab of the site.

What cannot be done on a shared address is keep those scripts away from the data. That needs an address of its own.

### Moving it to its own address (recommended)

1. In Hostinger hPanel create a subdomain, for example `finance.weeklydelight.com`, with its own folder and SSL certificate, and turn on Force HTTPS.
2. In a checkout of the app's repository at the pinned commit run `npm ci && npm run build`. A root build needs no patch. Upload the **contents** of `dist/` to that folder, together with the `.htaccess` below. Re-upload all of `dist/` for every release: `sw.js` is stamped with a per-build hash, and that is what makes browsers install the update.
3. Set `NEXT_PUBLIC_MICRO_FINANCE_URL` to the new address in the `env:` block of `.github/workflows/hostinger.yml` (next to `NEXT_PUBLIC_SITE_URL`) and redeploy. The listing switches to its "separate app" wording by itself.
4. Remove `public/finance/`, `tests/micro-finance-bundle.test.ts` and `tests/browser/micro-finance-app.spec.ts`.

Browser storage does not move with the address. Anyone who already used the app at `/finance/` should export a backup there and import it at the new address (Settings → Backup & restore).

```apache
# Micro Finance on an address of its own: place next to index.html and sw.js.
<IfModule mod_headers.c>
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "no-referrer"
  Header always set X-Frame-Options "DENY"
  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
  Header always set Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'"
  # Pages and the service worker are always revalidated so releases arrive.
  <FilesMatch "^(index\.html|sw\.js|manifest\.json)$">
    Header set Cache-Control "no-cache"
  </FilesMatch>
  # Everything under /assets/ has a content hash in its name.
  Header set Cache-Control "public, max-age=31536000, immutable" "expr=%{REQUEST_URI} =~ m#^/assets/#"
</IfModule>
<IfModule mod_mime.c>
  AddType application/manifest+json .json
</IfModule>
```

This header set was tested by serving the root build in Chromium with exactly this policy. The CSP needs `worker-src 'self'` for the service worker; the app's inline `style` props are applied through the CSSOM, which CSP does not restrict, so the app also passed with `style-src 'self'` alone, and `'unsafe-inline'` is kept as a safety margin. Hostinger adds its own `Content-Security-Policy: upgrade-insecure-requests` to responses; the app loads nothing over plain http, so it does not depend on it.

## Refreshing the bundle

The app's code is not copied into this repository, only its build. To pick up a newer version:

1. Put the new commit in `scripts/micro-finance/source.json`.
2. Run `node scripts/build-micro-finance.mjs`. It clones the app, applies `subpath.patch` (and stops with a clear error if the patch no longer fits), installs, type-checks, runs the app's own tests, builds for `/finance/` and rewrites `public/finance/`. Run it twice and the bundle comes out byte for byte the same.
3. If the patch no longer applies, redo its changes on the new commit (below), regenerate the patch with `git diff --cached --binary <commit>`, and update the list of files in `tests/micro-finance-bundle.test.ts`.
4. Run `npm test` and `npm run test:browser`, then commit `public/finance/` and `scripts/micro-finance/` together.

`subpath.patch` is the only change made to the app (9 files, nothing in its data model, and its default build for the root of an address is unchanged). It adds `appUrl()` in `src/lib/appUrl.ts` and uses it where the app named a root-absolute URL (service worker registration and scope, the notification icon, the notification targets and the test notification). `public/sw.js` now works out its own folder from where it is served, uses it for every URL, answers only for requests inside it, and only reuses windows inside it when a notification is tapped. `vite.config.ts` moves the manifest's URLs, Home Screen shortcuts included, under the base when building for a folder, and refuses a base it cannot handle. The app's own tests gained three cases for this (198 in total). `index.html` needs no change: Vite prefixes its links with the base.

## What was verified

- **The app (198 tests):** all pass, including the new cases. Built for the root, the app still passes the original 31-check browser run.
- **The bundle:** `tests/micro-finance-bundle.test.ts` checks that every file the page and manifest name exists inside `/finance/`, runs the shipped `sw.js` in a sandbox (install under `/finance/` and at a root, answering only inside its folder, offline fallback, notification taps) and checks the cache rules. With the old root-only worker swapped in, five of those tests fail.
- **In a browser (42 checks), against the site's real static export served the way the host serves it and against Apache 2.4 using the site's actual `.htaccess` files:** the launch button opens the app; it loads with no console errors; the service worker registers with scope `/finance/`, controls the page and keeps one versioned cache; Chromium reports a clean manifest and no installability errors; every icon is served; `/finance/?tab=bills`, `?tab=budget`, `?tab=vaults` and `?action=log` open the right screen and the address is left at `/finance/`; every tab and the charts render; a test notification goes through the worker with its icon and tap target inside `/finance/`; with the server stopped the app reloads from the worker with its data, and an offline deep link works; the rest of the site is not controlled by the worker.
- **The cache headers on Apache:** the page, worker and manifest are `no-cache`, the hashed files are `immutable`, other files get no forced header, and the site's own `/_next/static/` rule still works.
- **The rest of the site:** typecheck, build, 46 unit tests, 72 PHP checks and 39 browser tests pass. Across the 37 pages that existed before, 34 render identically, 2 have identical markup with sub-pixel screenshot noise (random password, QR code), and 1 changed on purpose: the Micro Finance page.

Not tested: the app on Hostinger itself (its LiteSpeed server and the two small `.htaccess` files, although the site's own `.htaccess` already relies on `Header set` there and the live host honours it), installing to an iPhone or Android Home Screen, and real notifications on a phone.
