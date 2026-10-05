import Link from "next/link";
import { ArrowRight, Globe, ShieldCheck, Zap } from "lucide-react";
import { createMetadata } from "@/components/SEOHeader";
import { categories } from "@/lib/catalog";
import { ToolIcon, categoryColors } from "@/components/Icons";

export const metadata = createMetadata(
  "About Us",
  "Meet LocalTools: 15 free browser utilities built to make everyday work simpler, with local processing, no accounts, and no uploads.",
  "/about/",
);

export default function About() {
  return (
    <article className="mx-auto max-w-4xl">
      <p className="mb-8 text-xs text-slate-400">
        <Link href="/" className="hover:text-violet-500">
          Home
        </Link>{" "}
        <span className="mx-2">/</span> About Us
      </p>
      <div className="rounded-3xl border border-violet-100 bg-gradient-to-br from-white to-violet-50 p-7 dark:border-slate-800 dark:from-slate-900 dark:to-violet-950/30 sm:p-10">
        <span className="text-[10px] font-bold uppercase tracking-[.18em] text-violet-500">
          A toolkit for everyday work
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          About Us
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
          LocalTools makes the small tasks in your day simpler. Convert an
          image, organize a PDF, inspect some JSON, or plan a financial goal —
          all in one place.
        </p>
        <p className="muted mt-4 max-w-2xl">
          Our approach is simple: useful tools, clear controls, and processing
          that stays on your device. You can get straight to work without
          creating an account or uploading your files.
        </p>
      </div>
      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: ShieldCheck,
            title: "Privacy by design",
            text: "Your files and tool inputs are processed locally using browser APIs. We do not collect them.",
          },
          {
            icon: Zap,
            title: "Less friction",
            text: "No upload queues or sign-up steps. Open a tool, enter your inputs, and get a result.",
          },
          {
            icon: Globe,
            title: "Free essentials",
            text: "All 15 utilities are available without a subscription. Use them on a modern desktop or mobile browser.",
          },
        ].map((item) => (
          <div key={item.title} className="panel p-5">
            <item.icon className="mb-4 h-6 w-6 text-violet-500" />
            <h2 className="text-base font-semibold">{item.title}</h2>
            <p className="muted mt-3 text-xs">{item.text}</p>
          </div>
        ))}
      </section>
      <section className="panel mt-8 p-6 sm:p-8">
        <h2 className="text-xl font-semibold">
          One workspace, five categories
        </h2>
        <div className="mt-5 space-y-3">
          {categories.map((category) => (
            <Link
              href={`/tools/${category.slug}/`}
              key={category.slug}
              className="flex items-center gap-4 rounded-xl p-3 transition hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <span
                className={`rounded-xl p-3 ${categoryColors[category.slug]}`}
              >
                <ToolIcon name={category.icon} />
              </span>
              <div>
                <h3 className="text-sm font-semibold">{category.name}</h3>
                <p className="muted text-xs">{category.description}</p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-400" />
            </Link>
          ))}
        </div>
      </section>
      <section className="panel mt-8 p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Clear about the limits</h2>
        <p className="muted mt-4">
          Large files are limited by your device’s available memory. Lossless
          PNG re-encoding does not guarantee a smaller file. PDF operations do
          not support encrypted documents, and document features such as
          bookmarks and forms may not carry over.
        </p>
        <p className="muted mt-3">
          Financial calculators provide illustrations rather than financial
          advice. Currency conversion uses reference rates that you enter
          yourself, not live market data. QR codes should be tested before
          printing. Individual tool pages explain their behavior and
          assumptions.
        </p>
        <p className="muted mt-3">
          You need a connection to load a page and its code. After those assets
          load, processing uses your browser without sending your inputs
          elsewhere.
        </p>
      </section>
      <section className="panel mt-8 p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Supported by advertising</h2>
        <p className="muted mt-4">
          Adsterra advertisements help support free access to the tools. Tool
          processing stays in your browser, while advertising loads third-party
          scripts and may use cookies or other identifiers. Our Privacy Policy
          explains these requests and your browser controls.
        </p>
      </section>
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <Link href="/" className="btn">
          Explore all tools <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/privacy-policy/" className="btn-secondary">
          Read our Privacy Policy
        </Link>
      </div>
    </article>
  );
}
