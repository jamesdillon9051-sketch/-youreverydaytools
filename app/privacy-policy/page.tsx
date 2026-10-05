import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { createMetadata } from "@/components/SEOHeader";

export const metadata = createMetadata(
  "Privacy Policy",
  "Learn how LocalTools processes files locally, stores your theme preference, and handles hosting and advertisement spaces.",
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
        Effective October 5, 2026. This policy describes the LocalTools website
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
            upload these inputs to a server. The application has no backend
            processing endpoints, account system, or database for your tool
            inputs.
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
          <h2 className="text-lg font-semibold">Local storage and cookies</h2>
          <p className="muted mt-3">
            We store a light or dark theme preference in your browser’s local
            storage under the key{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-slate-800">
              localtools-theme
            </code>
            . It is used only to restore your chosen appearance. You can remove
            it by clearing this site’s browser storage. The application does not
            set tracking cookies.
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
            Tool processing does not require external API calls. Loading another
            page or an unloaded tool may require additional static assets.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Analytics and advertising</h2>
          <p className="muted mt-3">
            This version does not integrate analytics, advertising scripts, or
            third-party trackers. Areas labeled “Advertisement” are empty layout
            spaces and do not load ad networks.
          </p>
          <p className="muted mt-3">
            If advertising or analytics services are introduced, this policy
            must be updated to identify the providers, data collection, and
            applicable consent controls before those services are enabled.
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
            in-memory inputs. We have no uploaded tool data to retrieve or
            delete.
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
