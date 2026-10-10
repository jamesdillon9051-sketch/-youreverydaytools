# GitHub → Hostinger automatic deployment

Website: **https://youreverydaytools.weeklydelight.com**

Repository: **https://github.com/jamesdillon9051-sketch/-youreverydaytools**

## Hostinger hPanel Git deployment

Use **main** to edit the source and **hostinger** to deploy the compiled website. Hostinger's shared-hosting Git deployment copies repository files; it does not automatically install npm dependencies or build Next.js. Deploying the source branch therefore leaves the website folder without `index.html` and can produce a 403 response.

1. Wait for **Actions → Build and deploy to Hostinger** to finish its **Update compiled website branch for Hostinger Git** job. It creates or updates the `hostinger` branch with `index.html`, `_next/`, `tools/`, `.htaccess`, and the other built files directly at its root.
2. In this subdomain's **Hostinger hPanel → Git** deployment settings, use the same repository URL and change the branch from `main` to **hostinger**.
3. Deploy into this subdomain's actual document root. When the Git deployment screen already targets that document root, leave its extra directory field empty. Do not append `out/` or create a nested project folder.
4. Click **Deploy**. Check File Manager: `index.html` and `_next/` must be directly inside the folder served by `youreverydaytools.weeklydelight.com`.
5. Open the homepage, a tool page, `/sitemap.xml`, and `/robots.txt`. If `/index.html` returns 404, the built files have not reached the directory serving this subdomain. If that file exists but is forbidden, check file/folder permissions and the hosting access rules.

Future edits go to `main`. GitHub tests and builds them, then commits the generated website to `hostinger`. Click Deploy after that branch updates, or enable Hostinger's automatic Git deployment and configure its webhook for pushes to this repository. No FTP secrets are needed for the hPanel Git route. Do not edit generated files directly on `hostinger`; the next successful build replaces them.

The upload-ready Hostinger ZIP is an alternative to Git deployment: extract its contents directly into the same document root. It already contains the compiled website.

The included `.github/workflows/hostinger.yml` runs on changes to `main`, pull requests, and manual requests from the Actions tab. It uses Node.js 24, installs the lockfile dependencies, runs the calculation tests, and builds the complete Next.js static export. TypeScript is checked during the build.

Successful builds on `main` publish the compiled `hostinger` branch. They also upload `out/` over verified FTPS when all four FTP secrets are configured. Pull requests only test and build; they cannot publish. GitHub builds the static frontend; Hostinger serves it and runs the standalone PHP social download gateway. The original 15 utilities remain browser-only. See [social service activation](social-downloaders.md) for private API configuration.

## Optional direct FTPS deployment

1. Create a GitHub repository with `main` as its default branch. A private repository is suitable.
2. Push the source project to that repository, including the hidden `.github/` folder. Do not push `out/`, `.next/`, `node_modules/`, credentials, or `.env.local`.
3. In Hostinger hPanel, select the website and open **Files → FTP Accounts**. Create a dedicated FTP account restricted to this subdomain's actual document root. Confirm that it supports explicit TLS on port 21.
4. In GitHub, open the repository's **Settings → Secrets and variables → Actions**. Create the four secrets below. Paste the FTP password only into GitHub's secret field; do not add it to source code, a workflow file, a commit, or a chat message.
5. If you already use a GitHub Environment named `production`, verify its branch rules allow `main`. Do not add required reviewers if you want deployments to run without manual approval.
6. Open **Actions → Build and deploy to Hostinger → Run workflow**, select `main`, and start the first deployment.

| GitHub Actions secret     | Value from your Hostinger account                                  |
| ------------------------- | ------------------------------------------------------------------ |
| `HOSTINGER_FTP_SERVER`    | FTP hostname or IPv4 address, with no `ftp://` prefix or directory |
| `HOSTINGER_FTP_USERNAME`  | Username of the dedicated FTP account                              |
| `HOSTINGER_FTP_PASSWORD`  | Password of the dedicated FTP account                              |
| `HOSTINGER_FTP_DIRECTORY` | Absolute destination as seen after logging in through FTP          |

The directory is relative to the FTP account's root, which can differ from the File Manager's filesystem path. For an account restricted directly to this website's document root, use `/`. For an account whose root contains a `public_html` folder, use `/public_html/` only if that is this subdomain's document root. For a broader account, use the exact domain-specific path shown by FTP. Do not assume the parent domain and subdomain share the same directory.

An optional Actions **variable** named `HOSTINGER_FTP_PORT` overrides port 21. The workflow requires explicit FTPS and does not downgrade to unencrypted FTP or disable certificate validation. If your plan only supports SFTP, the upload step needs an SFTP configuration instead.

## Make a website change

1. Edit a file in GitHub and commit it to `main`, or merge a pull request into `main`.
2. Open **Actions** to watch tests, build, and deployment.
3. For hPanel Git, deploy the updated `hostinger` branch or let its configured webhook do so. For configured FTPS, the workflow uploads directly. HTML updates immediately unless Hostinger/CDN caching is enabled; purge that cache if it still serves an older page.

Useful files to edit:

| Change                                                | File                                        |
| ----------------------------------------------------- | ------------------------------------------- |
| Homepage                                              | `app/page.tsx`                              |
| Tool names, SEO copy, instructions, FAQs              | `lib/catalog.ts`                            |
| Global header, sidebar, theme, search                 | `components/SiteChrome.tsx`                 |
| Layout, privacy banner, footer                        | `app/layout.tsx`                            |
| Image, PDF, developer, calculator, generator behavior | Corresponding module in `components/tools/` |
| Privacy Policy                                        | `app/privacy-policy/page.tsx`               |
| About Us                                              | `app/about/page.tsx`                        |
| Styling                                               | `app/globals.css`                           |

## Deployment behavior

The build artifact includes hidden files so `.htaccess` reaches Hostinger. Deployments to a branch are queued rather than cancelled halfway through an upload. The upload overwrites changed generated files and retains other remote files, including old hashed JavaScript assets that an open browser tab may still need. It does not delete existing hosting files. Removed pages will therefore require manual removal from Hostinger if their old files remain.

FTP updates are performed file by file, rather than as an atomic release. Retaining older assets reduces broken references during updates. To roll back, revert the offending GitHub commit and let the workflow rebuild and publish the previous source. Back up any pre-existing website before the initial upload.

Missing FTP secrets skip only direct FTPS deployment; the compiled branch is still published. Invalid configured credentials fail the FTPS job. Build/test failures prevent both publication methods. After an FTPS upload, the workflow verifies that the homepage and sitemap respond successfully over HTTPS. The branch publication job cannot access your hPanel settings and does not itself upload hosting files. Website SSL and DNS remain configured in Hostinger.
