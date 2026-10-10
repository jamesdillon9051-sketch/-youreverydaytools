# LocalTools

A complete Next.js App Router and Tailwind CSS utility suite. All 15 tools process inputs in the browser. The production website is a static export with no Node.js runtime, backend endpoints, remote processing service, or database required.

## Start locally

Requires Node.js 20.9 or newer. Node.js 24 is recommended for the included PDF.js package.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. The appearance follows your system preference on first load; the theme button saves your chosen appearance locally.

## Build for your domain

Set the actual HTTPS domain before building so canonical URLs, sitemap entries, social image URLs, and robots.txt point to the live site:

```sh
NEXT_PUBLIC_SITE_URL=https://youreverydaytools.weeklydelight.com npm run build
```

Alternatively create `.env.local` with `NEXT_PUBLIC_SITE_URL` set to your domain, then run `npm run build`. This source defaults to `https://youreverydaytools.weeklydelight.com`, your supplied Hostinger domain. Set the variable to override that address when moving to another domain.

The generated `out/` folder is the complete website. `npm run start` serves that folder locally. It does not run a processing backend. The build uses webpack for compatibility with restricted build environments.

Run `npm run package` after building to generate `artifacts/localtools-hostinger.zip`, `artifacts/localtools-source.zip`, a complete source-code document, and an upload guide. The hosting archive contains the contents of `out/` directly at its root.

## Upload to Hostinger

For updates from GitHub, follow [GitHub → Hostinger deployment](docs/GITHUB-HOSTINGER.md). Edit the source on `main`. The workflow builds each successful change and publishes a compiled `hostinger` branch. In Hostinger hPanel's Git section, deploy **hostinger**, with its files directly in this subdomain's document root. The `main` source branch has no built `index.html` and cannot be served directly by shared hosting. For automatic updates, configure Hostinger's Git deployment webhook, or use the optional direct FTPS upload with the four documented GitHub secrets.

1. Build with your real domain as described above, or use a Hostinger ZIP already configured for that domain.
2. In Hostinger hPanel, open Websites → your website → File Manager → `public_html`.
3. Back up an existing site before replacing its files.
4. Upload the **Hostinger website ZIP**, then extract its contents directly into `public_html`.
5. Confirm `public_html/index.html`, `public_html/_next/`, `public_html/tools/`, and `public_html/.htaccess` exist. There must not be an extra `out` folder between `public_html` and `index.html`.
6. Enable HTTPS and verify the homepage, a tool page, `/about/`, `/privacy-policy/`, `/sitemap.xml`, and `/robots.txt`.
7. Submit the live sitemap URL in Google Search Console. A sitemap helps discovery; it does not guarantee indexing or ranking.

Do not upload the source ZIP into `public_html`. Source code, `node_modules`, and `.next` are not needed on Hostinger. The static export supports standard Hostinger shared hosting.

`public/.htaccess` sets the index page, custom 404, static asset caching, useful content types, compression, and basic response headers. If hosting under a subdirectory instead of a domain root, configure a Next.js `basePath` and adjust the 404 URL before rebuilding.

## Included pages

- Homepage and five category landing pages.
- Fifteen dedicated tool pages with canonical metadata, OpenGraph PNG cards, SoftwareApplication, HowTo, FAQ JSON-LD, instructions, and related-tool links.
- About Us (`/about/`) and Privacy Policy (`/privacy-policy/`), linked in the footer and sitemap.
- Static `robots.txt`, `sitemap.xml`, and custom 404.

## Implemented utilities

| Category    | Utilities                                                                                                                                                         |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Media       | Batch WebP/JPG/PNG conversion, quality-based image compression, resizing with aspect ratio lock, individual and ZIP downloads                                     |
| PDFs        | Merge with drag and keyboard reordering, page range extraction, image-to-PDF with page margins and 1/2/4-image layouts                                            |
| Developer   | JSON beautify/minify and tree viewer, UTF-8 and binary Base64, JavaScript regex highlighting with isolated worker timeout                                         |
| Calculators | Monthly compound interest and interactive yearly chart, mortgage payoff with extra payments and CSV schedule, freelance hourly rate with overhead and tax reserve |
| Generators  | QR colors and logos with SVG/PNG exports, cryptographic password generation, length/mass/temperature/data conversions and manual reference currency rates         |

## Accuracy and resource limits

PNG output preserves decoded pixels and does not apply lossy quality compression. Canvas re-encoding is not guaranteed to reduce file size. Existing PNG files are retained if lossless re-encoding produces a larger output.

There are no artificial PDF file-count restrictions. Available browser memory limits practical document sizes. Encrypted PDFs are unsupported. Merging/extracting page content may not preserve interactive forms, bookmarks, signatures, or other document-level features.

Currency exchange rates are entered by the user in units per USD. No live exchange-rate API is used. Initial values are explicitly uncalibrated and conversion is paused until the user confirms the rates.

Financial calculations are estimates in USD that exclude jurisdiction-specific rules, inflation, fees, and taxes except the simple freelance tax reserve. Compound interest uses monthly compounding and month-end deposits. Mortgage calculations use fixed monthly principal-and-interest payments and apply extra payments to principal. Freelance overhead is assumed deductible.

QR logo mode uses high error correction and a small logo. Scan-test exported codes before publishing. The password generator uses `crypto.getRandomValues`, unbiased rejection sampling, and conditions results on representing each chosen set. Passwords are never persisted.

Processing requires modern browser APIs. Text/binary limits and image dimension guards keep the tools responsive. Pages and code must load first; the application does not include a service worker or guaranteed offline navigation.

## Privacy and ads

Only the light/dark preference is saved in local storage. Tool inputs stay in page memory. Fonts, icons, libraries, and the regex worker are served with the website; tool processing does not call remote APIs.

Adsterra native banners and the social bar load once through the shared layout after hydration, so they persist through client-side navigation without duplicate scripts. Every page also has one 300 × 250 banner. Tool pages use their action slot; other pages use the shared layout. The banner uses `public/ads/banner-300x250.html` in a dedicated iframe so its supplied synchronous script and `atOptions` configuration retain normal HTML parser behavior. Unconfigured desktop rail spaces remain reserved for a future 300 × 600 placement.

Advertising makes third-party network requests and may use cookies or other identifiers. The Privacy Policy and local-processing banner disclose this. Tool code does not send inputs to advertising providers, but external scripts operate under browser permissions. Ads are independent of tool functionality. Ad availability depends on Adsterra inventory, account approval, browser settings, and ad blockers. Provider-specific consent requirements must be configured for the site's actual audience and jurisdiction.

Google Analytics 4 uses measurement ID `G-8SNLQK3R0B`. The shared layout includes the supplied async Google tag and initialization code in the head of every content page, with one instance per document. Google Analytics Enhanced Measurement can track client-side history navigation when its page-view history option is enabled in the property's web stream settings. This implementation does not add duplicate manual page-view events. Google controls the loaded tag; verify receipt in Analytics Realtime or Tag Assistant after uploading the site. Tool inputs are not passed to analytics by application code. Browser tests mock third-party scripts to avoid reporting test traffic to the live property.

## Verification

```sh
npm run typecheck
npm test
npx playwright install chromium
npm run build
npm run test:browser
```

Calculation tests cover page ranges, known growth values, amortization invariants, freelance rates, exact unit factors, Unicode/binary Base64, and password constraints. Browser checks verify the static site, information pages, theme/search, real image and PDF downloads, regex timeout, QR logo export, calculator results, currency rate confirmation, and absence of file upload requests.

`pdf-lib`, `pdfjs-dist`, `browser-image-compression`, `qrcode`, and `lucide-react` are included as requested. PDF manipulation uses `pdf-lib`; the provided tools do not load PDF.js because they do not rasterize PDF pages. Heavy processing libraries load only when their tool needs them.
