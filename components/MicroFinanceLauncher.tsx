import { ExternalLink, ShieldCheck } from "lucide-react";
import { sharesSiteOrigin } from "@/lib/catalog";

const limits = [
  "US dollars (USD) only.",
  "Your data stays on the device you use. There is no sync between devices; move a budget with Backup & Restore.",
  "No bank connection: you enter income and spending yourself.",
  "Reminders are checked by the app itself, so they appear while it is open or the next time you open it, not while your phone has it suspended.",
  "Rollover of unspent money applies to Needs and Wants only.",
];
const installSteps = [
  "iPhone: open it in Safari, tap Share, then Add to Home Screen.",
  "Android and desktop Chrome or Edge: use the Install app button in Settings, or your browser's install option.",
];

/**
 * Micro Finance is its own app with its own page, so this panel launches it
 * rather than embedding it. The notice says where it is served from, because
 * an app on this site's own address shares browser storage with the site's
 * scripts (analytics and ads), and one on its own address does not.
 */
export function MicroFinanceLauncher({ url }: { url: string }) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-xs leading-5 text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {sharesSiteOrigin(url) ? (
          <p>
            Micro Finance is its own app, with no server, accounts, ads or
            analytics, and your budget never leaves your device. It opens from
            this site&apos;s own address, so the scripts that run on the
            site&apos;s other pages (analytics and ads) share the browser
            storage it uses.
          </p>
        ) : (
          <p>
            Micro Finance is a separate app that opens at its own address, so
            your budget stays apart from this site, its ads and its analytics.
            It has no server, no accounts and no sync: your budget never leaves
            your device.
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <a className="btn" href={url} target="_blank" rel="noopener noreferrer">
          Open Micro Finance
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Opens in a new tab. It works offline after your first visit.
        </span>
      </div>
      <section>
        <h2 className="text-sm font-semibold">Install it like an app</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {installSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-sm font-semibold">Good to know</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {limits.map((limit) => (
            <li key={limit}>{limit}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
