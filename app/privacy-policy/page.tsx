import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { createMetadata } from "@/components/SEOHeader";

export const metadata = createMetadata(
  "Privacy Policy",
  "Learn how LocalTools processes files locally and uses theme storage, Google Analytics, hosting, and Adsterra advertising.",
  "/privacy-policy/",
);

export default function PrivacyPolicy() {
  return (
    <article className="mx-auto max-w-3xl">
      <p className="mb-8 text-xs text-slate-400">
        <Link href="/" className="hover:text-violet-500">
          Home
        </Link>{" "}
        <span className="mx-2">/</span> Privacy Policy
      </p>
      <span className="inline-flex rounded-2xl bg-emerald-50 p-4 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
        <ShieldCheck className="h-7 w-7" />
      </span>
      <h1 className="mt-5 text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="muted mt-3">
        Effective October 10, 2026. This policy describes the LocalTools website
        as currently implemented.
      </p>
      <div className="panel mt-8 space-y-8 p-6 sm:p-8">
        <section>
          <h2 className="text-lg font-semibold">
            Your files stay on your device
          </h2>
          <p className="muted mt-3">
            Images, PDFs, text, calculator inputs, generated passwords, and QR
            code content are processed in your browser. LocalTools does not
            upload these inputs to a server. Core utilities have no remote
            processing endpoints. Social downloaders use the separate service
            described below.
          </p>
          <p className="muted mt-3">
            Results stay in page memory until you leave or reload the page,
            unless you choose to copy or download them. Files you download are
            saved according to your browser and device settings. Information you
            copy is placed on your device’s clipboard, which may be accessible
            to other applications according to your operating system settings.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold">
            Public social media downloads
          </h2>
          <p className="muted mt-3">
            When you use a social downloader, the pasted public URL or username
            is sent to our PHP gateway on Hostinger and to Scrape Creators, or
            RocketAPI for active Instagram stories. These services receive the
            requested link or username and routine connection metadata. Media
            downloads pass through our hosting service. Images, PDFs, passwords,
            and other core utility inputs are not sent through this gateway.
          </p>
          <p className="muted mt-3">
            The gateway does not create accounts or store social post results in
            a database. Download links expire after 15 minutes. Media is
            buffered in temporary server files while downloading and removed at
            request completion. Usage limits store a keyed hash of your IP
            address and request counts for up to two days in private server
            storage. Hosting access logs may contain requested addresses and
            signed download tokens, with retention controlled by Hostinger. The
            data providers handle their own processing and retention under their
            policies.
          </p>
          <p className="muted mt-3">
            Use public content you own or have permission to download. We do not
            request your social platform password or cookies. Private accounts,
            expired stories, and access restrictions are not bypassed. Visit{" "}
            <a
              href="https://scrapecreators.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-600 underline"
            >
              Scrape Creators
            </a>{" "}
            and{" "}
            <a
              href="https://rocketapi.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-600 underline"
            >
              RocketAPI
            </a>{" "}
            for their current service terms and privacy information.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Local storage and cookies</h2>
          <p className="muted mt-3">
            We store a light or dark theme preference in your browser’s local
            storage under the key{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-slate-800">
              localtools-theme
            </code>
            . It is used only to restore your chosen appearance. You can remove
            it by clearing this site’s browser storage. Our tool code does not
            set tracking cookies. Google Analytics and third-party advertising
            may use cookies, local storage, or similar technologies as described
            below.
          </p>
          <p className="muted mt-3">
            Currency reference rates and tool inputs are not saved to local
            storage. They remain in the current page session.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold">
            Hosting and routine network requests
          </h2>
          <p className="muted mt-3">
            Your browser requests static HTML, JavaScript, CSS, images, and
            other application files from the site’s hosting provider. These
            ordinary requests expose information such as your IP address,
            browser details, requested URLs, and request times to that provider.
            The hosting provider may maintain access or security logs under its
            own policy. Hosting log retention depends on the provider’s
            configuration.
          </p>
          <p className="muted mt-3">
            The application bundles its tool libraries and uses system fonts.
            Core utility processing does not require external API calls. Social
            downloads do require external provider requests. Loading another
            page or an unloaded tool may require additional static assets.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Analytics and advertising</h2>
          <p className="muted mt-3">
            LocalTools displays Adsterra native banners, a social bar, and 300 ×
            250 banner advertisements across the website. Your browser loads
            advertising scripts from disembroildisembroildissipatespots.com and
            may contact additional domains used by Adsterra or its advertising
            partners. These requests can disclose your IP address, browser and
            device information, referring page, request times, and advertising
            interactions.
          </p>
          <p className="muted mt-3">
            Advertising providers may use cookies, browser storage, or similar
            identifiers to deliver ads, measure performance, and prevent fraud.
            Third-party scripts run in your browser under the permissions your
            browser allows; local tool processing does not make advertising
            requests private. We do not send your selected files or tool inputs
            to Adsterra through our tool code. Adsterra’s own data handling and
            retention are governed by its{" "}
            <a
              href="https://adsterra.com/privacy-policy/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-600 underline underline-offset-4 dark:text-violet-400"
            >
              Privacy Policy
            </a>
            .
          </p>
          <p className="muted mt-3">
            You can manage cookies and third-party storage through your browser
            settings or block advertising scripts. The tools do not depend on
            ads being available. Advertiser links lead to external websites with
            their own privacy policies.
          </p>
          <p className="muted mt-3">
            We use Google Analytics 4, with measurement ID G-8SNLQK3R0B, to
            understand website traffic and usage. The Google tag loads from
            www.googletagmanager.com and sends analytics requests to Google.
            Depending on the property settings, these requests include page
            addresses and titles, referring pages, device and browser details,
            approximate location, and interactions such as page views and
            scrolling. Google Analytics may set cookies, including _ga cookies,
            to distinguish visits. Google receives network information when your
            browser contacts its services.
          </p>
          <p className="muted mt-3">
            Our tools do not deliberately send selected files, text inputs,
            generated passwords, or calculation values to Google Analytics.
            Analytics data retention depends on the settings of this website’s
            Google Analytics property. Google’s handling of data is described in
            its{" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-600 underline underline-offset-4 dark:text-violet-400"
            >
              Privacy Policy
            </a>
            . You can block analytics scripts or cookies through your browser
            settings, or use Google’s{" "}
            <a
              href="https://tools.google.com/dlpage/gaoptout"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-600 underline underline-offset-4 dark:text-violet-400"
            >
              Analytics opt-out browser add-on
            </a>
            . Tool functionality does not depend on analytics being available.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Security and your choices</h2>
          <p className="muted mt-3">
            Browser-only processing reduces the need to share files with a
            remote service. Your device, browser extensions, clipboard,
            downloaded files, and other applications remain under your control.
            Use a trusted device and keep your browser updated when processing
            sensitive information.
          </p>
          <p className="muted mt-3">
            You can use the tools without creating an account, clear the theme
            preference through browser settings, and close a page to discard its
            in-memory inputs. Core file inputs are not uploaded. Social download
            data and hosting logs are handled as described above.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Policy updates and contact</h2>
          <p className="muted mt-3">
            The effective date above will change when this policy is revised.
            For questions about a deployed instance, contact the site operator
            through the contact information provided by its hosting or
            publishing profile. This source project does not configure a contact
            form or collect messages.
          </p>
        </section>
      </div>
      <p className="muted mt-6">
        Read more about the tools and their limitations on our{" "}
        <Link
          href="/about/"
          className="font-medium text-violet-600 underline underline-offset-4 dark:text-violet-400"
        >
          About Us
        </Link>{" "}
        page.
      </p>
    </article>
  );
}
