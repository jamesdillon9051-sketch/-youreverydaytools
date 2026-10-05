import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Globe,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { createMetadata, SEOHeader } from "@/components/SEOHeader";
import { ToolDirectory } from "@/components/ToolDirectory";
import { ToolIcon, categoryColors } from "@/components/Icons";
import { categories } from "@/lib/catalog";

const title = "Free online tools, entirely in your browser";
const description =
  "15 free, private tools for images, PDFs, developers, calculators, and generators. Get everyday tasks done fast with no uploads or sign-up.";
export const metadata = createMetadata(title, description, "/");

export default function Home() {
  return (
    <>
      <SEOHeader
        title={title}
        description={description}
        path="/"
        steps={[
          "Choose a tool from the directory.",
          "Enter your data or select local files.",
          "Process and download your results in the browser.",
        ]}
      />
      <div className="mb-6 flex items-center justify-between text-xs">
        <span className="text-slate-400">
          Workspace <span className="mx-2 text-slate-300">/</span>{" "}
          <span className="font-medium text-slate-600 dark:text-slate-300">
            All tools
          </span>
        </span>
        <span className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] text-slate-500 dark:border-slate-800 dark:bg-slate-900 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Ready
          when you are
        </span>
      </div>
      <section className="relative overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-white via-violet-50/70 to-indigo-100/50 p-7 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-violet-950/40 sm:p-10 xl:p-12">
        <div className="relative z-10 max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-white/70 px-3 py-1.5 text-[10px] font-semibold text-violet-600 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300">
            <Sparkles className="h-3 w-3" /> SMALL TOOLS. BIG POSSIBILITIES.
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-[1.14] tracking-[-.04em] sm:text-5xl xl:text-[54px]">
            A little less work.
            <br />
            <span className="text-violet-600 dark:text-violet-400">
              A lot more done.
            </span>
          </h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
            Your everyday toolkit for files, code, and everything in between.
            Free, fast, and private — right in your browser.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <a href="#all-tools" className="btn">
              Explore the tools <ArrowRight className="h-4 w-4" />
            </a>
            <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Check className="h-3.5 w-3.5 text-emerald-500" /> No sign-up
              needed
            </span>
          </div>
        </div>
        <div
          aria-hidden="true"
          className="absolute -right-16 top-14 hidden h-64 w-80 rotate-[-8deg] xl:block 2xl:right-8"
        >
          <div className="absolute inset-8 rounded-full bg-violet-300/20 blur-3xl" />
          <div className="panel absolute left-3 top-0 flex h-24 w-24 rotate-[-7deg] items-center justify-center text-violet-500 shadow-xl shadow-violet-200/30 dark:shadow-none">
            <ToolIcon name="code" className="h-10 w-10" />
          </div>
          <div className="panel absolute left-36 top-5 flex h-24 w-24 rotate-[13deg] items-center justify-center text-rose-400 shadow-xl shadow-violet-200/30 dark:shadow-none">
            <ToolIcon name="image" className="h-10 w-10" />
          </div>
          <div className="panel absolute left-8 top-32 flex h-24 w-24 rotate-[6deg] items-center justify-center text-amber-500 shadow-xl shadow-violet-200/30 dark:shadow-none">
            <ToolIcon name="file" className="h-10 w-10" />
          </div>
          <div className="panel absolute left-40 top-36 flex h-24 w-24 rotate-[-8deg] items-center justify-center text-blue-500 shadow-xl shadow-violet-200/30 dark:shadow-none">
            <ToolIcon name="qr" className="h-10 w-10" />
          </div>
        </div>
      </section>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          {
            icon: ShieldCheck,
            title: "Private by default",
            text: "Your files never leave your device.",
          },
          {
            icon: Zap,
            title: "Built for speed",
            text: "No uploads. No waiting in line.",
          },
          {
            icon: Globe,
            title: "Free for everyone",
            text: "All the essentials. Zero subscriptions.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white/60 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/40"
          >
            <item.icon className="h-5 w-5 shrink-0 text-slate-400" />
            <div>
              <p className="text-xs font-semibold">{item.title}</p>
              <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                {item.text}
              </p>
            </div>
          </div>
        ))}
      </div>
      <ToolDirectory />
      <section className="mt-10">
        <h2 className="text-lg font-semibold">Explore by category</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/tools/${category.slug}/`}
              className="panel flex items-center gap-3 p-4 text-xs font-medium transition hover:border-violet-300"
            >
              <span
                className={`rounded-lg p-2 ${categoryColors[category.slug]}`}
              >
                <ToolIcon name={category.icon} className="h-4 w-4" />
              </span>
              {category.name}
              <ArrowUpRight className="ml-auto h-3 w-3 text-slate-400" />
            </Link>
          ))}
        </div>
      </section>
      <section id="how-to-use" className="mt-10 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold">How to Use</h2>
          <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
            <li>1. Choose a utility from the directory.</li>
            <li>2. Enter your data or select files on your device.</li>
            <li>3. Get your result and save it locally.</li>
          </ol>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Frequently Asked Questions</h2>
          <details className="mt-4 text-sm">
            <summary className="font-medium">Do I need an account?</summary>
            <p className="muted mt-2">
              No. Every tool is free and works without an account. Processing
              happens entirely in your browser.
            </p>
          </details>
          <details className="mt-4 text-sm">
            <summary className="font-medium">
              Do these tools work offline?
            </summary>
            <p className="muted mt-2">
              Processing needs no network calls. Load the page and its tool code
              first; you can then use it without an internet connection. This
              site is not an installable offline app.
            </p>
          </details>
        </div>
      </section>
    </>
  );
}
