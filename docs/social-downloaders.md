# Social downloaders on Hostinger shared hosting

The existing 15 utilities remain browser-only. The new social tools use PHP 8.1 or newer with cURL on your existing Hostinger hosting; they do not need Node.js, a VPS, a database, or a Python service. Public media retrieval requires an external API account. The included adapters use documented Scrape Creators endpoints for posts, highlights, and profile pictures, and RocketAPI for active Instagram stories. Provider subscriptions or credits are separate from hosting. No paid account is created by this project.

## Activate the service

1. In hPanel, select PHP 8.3 or newer for this website and enable the cURL extension. Allow outgoing HTTPS requests. The normal shared-hosting PHP setup generally provides cURL.
2. Obtain an API key from [Scrape Creators](https://scrapecreators.com). This activates TikTok, Instagram posts/highlights/profile pictures, X, Facebook, Pinterest, and Reddit. Obtain a [RocketAPI](https://rocketapi.io) token to additionally activate active Instagram stories. Each provider can be enabled independently.
3. In File Manager, open your hosting account's home directory, outside `domains/`. On the normal Hostinger layout, if PHP's document root is `/home/u123456789/domains/weeklydelight.com/public_html/youreverydaytools`, the private file goes in `/home/u123456789/localtools-social-config.php`. The API derives the account home from the part before `/domains/`, so a nested subdomain does not place secrets in another website's public folder. If your hosting uses a different layout, the default is the document root's immediate parent: ensure it is outside every publicly served directory, or set `LOCALTOOLS_SOCIAL_CONFIG` to a private absolute path using PHP's environment configuration.
4. Create `localtools-social-config.php` with this complete configuration. Fill the empty strings locally in Hostinger, never in GitHub or browser JavaScript. Generate a signing key with `php -r 'echo bin2hex(random_bytes(32)), PHP_EOL;'` if PHP CLI is available, or use a securely generated 64-character hex string from a password manager.

```php
<?php
return [
    'scrapecreators_key' => '',
    'rocketapi_key' => '',
    'signing_key' => '',
    'hourly_requests' => 10,
    'daily_requests' => 500,
    'max_download_bytes' => 128 * 1024 * 1024,
];
```

An empty provider key deliberately disables its tools. An empty signing key derives the signing secret from a configured provider key; a separate random signing key is recommended. The configuration is never included in the website ZIP or repository. Restrict the private file's permissions to the hosting account. The service creates `localtools-social-cache/` in the same private account directory for rate limits; PHP must be able to write there. You may set `storage_dir` to a different private writable absolute directory in the configuration.

5. Deploy the `hostinger` branch or extract the hosting ZIP directly into this website's document root. Confirm `api/social.php`, `api/social-download.php`, and `api/.htaccess` are present. Check `/api/social.php`: it returns provider booleans and a readiness message without exposing keys. Open a social tool and test your own public post. Existing utilities work without API configuration.
6. Configure hPanel Git auto deployment for the `hostinger` branch if desired. Source edits belong on `main`; the GitHub workflow rebuilds and publishes compiled files plus the PHP gateway to `hostinger`. Keep the private configuration outside the deployment directory so later builds cannot overwrite it.

## Provider contracts

Scrape Creators: base `https://api.scrapecreators.com`, header `x-api-key`. The gateway sends only the validated public URL or username. It does not request paid media mirroring or permanent external storage.

| Tool | Endpoint | Query |
| --- | --- | --- |
| TikTok post | `/v2/tiktok/video` | `url` |
| TikTok profile | `/v1/tiktok/profile` | `handle` |
| Instagram post/reel | `/v1/instagram/post` | `url` |
| Instagram profile | `/v1/instagram/profile` | `handle` |
| Instagram highlights list | `/v1/instagram/user/highlights` | `handle` |
| Instagram highlight detail | `/v1/instagram/user/highlight/detail` | `id` |
| X post | `/v1/twitter/tweet` | `url` |
| X profile | `/v1/twitter/profile` | `handle` |
| Facebook post | `/v1/facebook/post` | `url` |
| Pinterest pin | `/v1/pinterest/pin` | `url` |
| Reddit post | `/v1/reddit/post/comments` | `url` |

RocketAPI: POST `https://v1.rocketapi.io/instagram/user/get_info_by_username` with `{"username":"creator"}`, then `/instagram/user/get_stories` with `{"ids":[123]}`. Header `Authorization: Token …`. Responses use the provider's `status: done` wrapper, `response.status_code`, and `response.body`; active stories are read from the user's reel items. See the [stories documentation](https://docs.rocketapi.io/api/instagram/user/get_stories/) and [profile documentation](https://docs.rocketapi.io/api/instagram/user/get_info_by_username/).

## Limits and behavior

Only supported public content is retrieved. Private accounts, expired stories, blocked posts, DRM, platform authentication, or unavailable provider results are not bypassed. Returned quality and watermarks depend on source availability. Reddit can supply video without audio; the UI discloses this because shared-hosting PHP does not mux separate audio tracks. YouTube downloads are not claimed or implemented.

Individual files are capped at 128 MB by default. Browser ZIPs are capped at 30 files and 64 MB. HMAC-signed links expire after 15 minutes. The download gateway allows known platform media CDN domains, validates every redirect, pins DNS to public IPv4 addresses, verifies TLS, and accepts only supported image MIME types or MP4. Temporary files are removed at request completion. No arbitrary user-supplied URL is proxied. Additional CDN hosts must be explicitly reviewed in `social_media_url` if providers change their delivery domains.

Rate limits default to 10 extraction requests per client per hour and 500 total extractions per day. Preview and download requests have a separate 80-per-hour client limit. Client identifiers are keyed IP hashes, not raw IP addresses; rate records older than two days are removed on subsequent requests. Hostinger and provider logs follow their own policies. Limits reduce provider usage but do not replace a provider account spending cap; set that cap in your provider dashboard.

## Verify changes

Run `npm test`, `php tests/social-api.test.php`, `npm run build`, and `npm run test:browser`. PHP tests cover signatures, expiry, unsafe addresses, provider fixture normalization, private profiles, public stories/highlights, quality selection, and usage limits. Browser tests mock provider responses and exercise selection, ZIP downloads, cancellations, and service-unavailable messages. Real upstream retrieval requires configured accounts and must be verified with your own public media after activation. CI runs PHP tests before publishing.
