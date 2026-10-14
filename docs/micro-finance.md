# Micro Finance

Micro Finance is a private, offline-first budgeting app that was built separately (repository `jamesdillon9051-sketch/Micro-finance-`, branch `claude/finance-foundation`: Vite, React 19, TypeScript, Tailwind v4, Recharts). This site lists it under **Calculators** at `/tools/calculators/micro-finance/` and links to it. The app itself is **not** embedded in this site.

| Piece                                                                   | Where                                                          |
| ----------------------------------------------------------------------- | -------------------------------------------------------------- |
| Listing entry, the 17 modules, FAQ                                      | `lib/catalog.ts` (slug `micro-finance`)                        |
| Launch panel (link, install steps, limits)                              | `components/MicroFinanceLauncher.tsx`                          |
| "Tools and features" section, shown for any tool that defines `modules` | `components/ToolWrapper.tsx`                                   |
| Wallet icon                                                             | `components/Icons.tsx`                                         |
| Tests                                                                   | `tests/catalog.test.ts`, `tests/browser/micro-finance.spec.ts` |

## Turning the launch link on

The page links to the app only when the build knows its address. Set `NEXT_PUBLIC_MICRO_FINANCE_URL` to a plain `https://` address when building (next to `NEXT_PUBLIC_SITE_URL` in the `env:` block of `.github/workflows/hostinger.yml`, or in `.env.local`). Any other value (http, a script URL, an address with a password) is ignored. Until it is set the page says the app is not live yet instead of linking to an address that does not exist.

## Where to host it: a separate subdomain

| Option                                            | Verdict                                                                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1. Subdomain such as `finance.weeklydelight.com`  | **Recommended.** No change to the app; its storage, service worker and caches are isolated by origin.               |
| 2. Subpath such as `/tools/finance/` on this site | Not recommended. Needs the changes listed below, and the app's data would share an origin with this site's scripts. |
| 3. Link out to wherever it is hosted              | Equivalent to option 1 for the listing; the host decides the headers.                                               |
| 4. iframe                                         | Not recommended. Installing, notifications and the service worker work poorly in a frame.                           |

Why not the same origin, checked against both code bases:

- **Third-party scripts run on every page of this origin.** Google Analytics (`googletagmanager.com`) is in every page's head, and the Adsterra native banner and social bar scripts (`disembroildisembroildissipatespots.com`) load into the top-level document, along with a banner iframe. Any script on an origin can read that origin's `localStorage`, and Micro Finance keeps the whole budget there under `micro-finance:state`.
- **The app's service worker would take over this site's pages.** `sw.js` answers every same-origin GET in its scope. For a page navigation it falls back to the cached app shell whenever the network fails or takes longer than 3 seconds, and it overwrites its cached `/index.html` with any navigation that succeeds. At `/` on this origin that would serve the app in place of other tools' pages and corrupt its own cache.
- **The app assumes it is served from `/`.** A subpath needs all of these changed: Vite `base`; `public/manifest.json` (`id`, `start_url`, `scope`, icon and shortcut URLs); `public/sw.js` (`SHELL`, the `/assets/` pattern, the `/index.html` fetch and cache keys, the `notificationclick` default target); `registerServiceWorker` in `src/lib/pwa.ts` (script URL and scope); the icon path in `src/lib/notifier.ts`; the notification targets in `src/lib/notify.ts`; and the `/manifest.json`, `/favicon.svg` and `/icons/...` links in `index.html`.

A subdomain avoids all of that. Browsers key `localStorage`, service workers and Cache Storage by origin, so `finance.<domain>` cannot see this site's storage and this site's scripts cannot see its.

## Subdomain runbook

Nothing below has been done; each step that touches DNS, hosting or a deployment needs the owner's go-ahead.

1. Pick the hostname and create it in Hostinger hPanel (its own document root and SSL certificate; turn on Force HTTPS).
2. Build the app: `npm ci && npm run build`. `dist/` is about 1.2 MB: `index.html`, `manifest.json`, `sw.js`, `assets/`, `icons/`, `favicon.svg`.
3. Upload the **contents** of `dist/` to the subdomain's document root, together with the `.htaccess` below. File Manager, FTPS or hPanel Git from a compiled branch (the pattern this site's `hostinger` branch uses) all work. Re-upload the whole of `dist/` for every release: `sw.js` is stamped with a per-build hash, and that is what makes browsers install the update.
4. Set `NEXT_PUBLIC_MICRO_FINANCE_URL` for this site's build (see above) and redeploy this site.
5. Check the new address: it loads with no console errors; it works offline after one visit; `/?tab=bills` and `/?action=log` open the right screen; it installs to the Home Screen; this site's tools are unaffected.

### `.htaccess` for the app

```apache
# Micro Finance: place next to index.html and sw.js in the app's own document root.
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

These headers were tested by serving the built app with exactly this policy in Chromium (see below). The CSP needs `worker-src 'self'` for the service worker; the app's inline `style` props are applied through the CSSOM, which CSP does not restrict, so the app also passed with `style-src 'self'` alone. `'unsafe-inline'` is kept for styles as a safety margin for screens that were not exercised. The file itself has **not** been run on Hostinger. It uses only directives this site's own `.htaccess` already relies on, and the live host honours them: this site's `/_next/static/` files come back with `cache-control: public, max-age=31536000, immutable` through the same `expr=` form. Hostinger also adds `Content-Security-Policy: upgrade-insecure-requests` to its responses on its own; the app loads nothing over plain http, so it does not depend on that.

## What was verified about the app

Against commit `1355be2` of `claude/finance-foundation`:

- `npm test`: 14 files, 195 tests pass. `npm run build`: succeeds (one 799 kB script, 232 kB gzipped).
- No network calls of its own (`fetch`, XHR, beacons, WebSocket), no cookies, no analytics, no remote fonts or scripts; one `localStorage` key, `micro-finance:state`.
- Served at the root of an origin in Chromium, 31 checks pass, with plain headers, with the policy above, and with `style-src 'self'`: loads with no console errors or warnings; the service worker registers with scope `/`, controls the page and keeps one versioned cache; the manifest parses cleanly and Chromium reports no installability errors; `/?tab=bills`, `/?tab=budget`, `/?tab=vaults` and `/?action=log` open the right screen, unknown values are ignored and the address is cleaned up; Ctrl+K opens the quick logger; an expense lands in `micro-finance:state`; a test notification is shown through the service worker; every tab, the Insights charts, the bill form and calendar render; with the server stopped, a reload and an offline deep link still work and the data is still there; only the app's own origin is contacted.
- Not tested: installing to an iPhone or Android Home Screen, real notifications on a phone, and behavior on Hostinger itself.
