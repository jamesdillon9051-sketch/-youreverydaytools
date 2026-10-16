"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { AdsterraBanner } from "./AdsterraBanner";

export function AdsterraAds() {
  const pathname = usePathname();
  const isToolPage = /^\/tools\/[^/]+\/[^/]+\/?$/.test(pathname);

  return (
    <>
      <div className="mt-10 space-y-6" aria-label="Advertisements">
        {!isToolPage && <AdsterraBanner />}
        <aside
          aria-label="Adsterra native advertisement"
          className="min-h-[180px] w-full overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900"
        >
          <p className="mb-3 text-center text-[10px] font-medium uppercase tracking-[.18em] text-slate-400">
            Advertisement
          </p>
          <div id="container-0e88314fb17fa625db79032082c11e5b" />
        </aside>
      </div>
      <Script
        id="adsterra-native-banner"
        async
        data-cfasync="false"
        src="https://disembroildisembroildissipatespots.com/0e88314fb17fa625db79032082c11e5b/invoke.js"
        strategy="afterInteractive"
      />
      <Script
        id="adsterra-social-bar"
        src="https://disembroildisembroildissipatespots.com/67/33/03/6733034dd0fa757f4485674ad089bfa7.js"
        strategy="afterInteractive"
      />
    </>
  );
}
