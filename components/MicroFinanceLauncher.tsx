import { ExternalLink, ShieldCheck } from "lucide-react";

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
 * Micro Finance runs as its own app on its own address, so this panel launches
 * it rather than embedding it. `url` is empty until the app is published.
 */
export function MicroFinanceLauncher({ url }: { url: string }) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-xs leading-5 text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          Micro Finance is a separate app that opens at its own address, so your
          budget stays apart from this site, its ads and its analytics. It has
          no server, no accounts and no sync: your budget never leaves your
          device.
        </p>
      </div>
      {url ? (
        <div className="flex flex-wrap items-center gap-3">
          <a
            className="btn"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Micro Finance
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Opens in a new tab. It works offline after your first visit.
          </span>
        </div>
      ) : (
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
        >
          <p className="text-sm font-semibold">
            Micro Finance is not live on this site yet.
          </p>
          <p className="mt-1 text-xs leading-5">
            Its launch link will appear here once the app is published.
          </p>
        </div>
      )}
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
