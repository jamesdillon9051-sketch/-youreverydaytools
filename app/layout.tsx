import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { SiteChrome } from "@/components/SiteChrome";
import { AdsterraAds } from "@/components/AdsterraAds";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { siteUrl } from "@/lib/catalog";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "LocalTools — Free, private browser utilities",
    template: "%s | LocalTools",
  },
  description:
    "15 free browser tools for images, PDFs, JSON, calculations, and more. Fast, private, and entirely on your device.",
  icons: { icon: "/favicon.svg" },
  robots: { index: true, follow: true },
};

const themeScript =
  "try{const t=localStorage.getItem('localtools-theme');document.documentElement.classList.toggle('dark',t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches))}catch{}";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <GoogleAnalytics />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <a
          href="#main-content"
          className="sr-only fixed left-4 top-4 z-[100] rounded-lg bg-violet-600 px-4 py-2 text-white focus:not-sr-only"
        >
          Skip to content
        </a>
        <SiteChrome />
        <div className="lg:ml-[240px]">
          <div className="sticky top-[76px] z-20 flex min-h-[38px] items-center justify-center gap-2 border-b border-emerald-100 bg-emerald-50/95 px-4 py-2 text-center text-[10px] font-medium leading-4 text-emerald-800 backdrop-blur-md dark:border-emerald-900/30 dark:bg-emerald-950/90 dark:text-emerald-300 sm:text-xs">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <span>
              🔒 Local processing — Our tools process files in your browser
              without uploading them. Third-party ads and analytics load
              separately.
            </span>
          </div>
          <main
            id="main-content"
            className="mx-auto max-w-[1600px] px-5 pb-8 pt-7 sm:px-8 xl:px-10"
          >
            {children}
            <AdsterraAds />
          </main>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-6 py-6 text-xs text-slate-500 dark:border-slate-800 sm:px-10">
            <span>
              © {new Date().getFullYear()} LocalTools. Built for everyday work.
            </span>
            <nav
              aria-label="Footer navigation"
              className="flex items-center gap-5"
            >
              <Link
                href="/about/"
                className="transition hover:text-violet-600 dark:hover:text-violet-400"
              >
                About Us
              </Link>
              <Link
                href="/privacy-policy/"
                className="transition hover:text-violet-600 dark:hover:text-violet-400"
              >
                Privacy Policy
              </Link>
            </nav>
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5" /> No sign-up. No uploads.
              Always free.
            </span>
          </footer>
        </div>
      </body>
    </html>
  );
}
