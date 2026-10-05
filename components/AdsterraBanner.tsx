"use client";

import { useEffect, useRef, useState } from "react";

export function AdsterraBanner() {
  const viewport = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setScale(Math.min(1, entry.contentRect.width / 300));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <aside
      aria-label="Adsterra banner advertisement"
      className="mx-auto w-[302px] max-w-full overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
    >
      <p className="py-2 text-center text-[10px] font-medium uppercase tracking-[.18em] text-slate-400">
        Advertisement
      </p>
      <div ref={viewport} className="relative aspect-[6/5] w-full">
        <iframe
          title="Adsterra 300 by 250 advertisement"
          src="/ads/banner-300x250.html"
          width="300"
          height="250"
          loading="lazy"
          className="absolute left-0 top-0 block border-0"
          style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </aside>
  );
}
