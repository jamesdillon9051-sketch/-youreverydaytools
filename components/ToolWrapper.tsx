import Link from "next/link";
import { Check, ChevronRight, ShieldCheck } from "lucide-react";
import { categories, tools, toolPath, type Tool } from "@/lib/catalog";
import { AdSlot } from "./AdSlot";
import { ToolIcon, categoryColors } from "./Icons";
import { ToolCard } from "./ToolCard";

export function ToolWrapper({
  tool,
  children,
}: {
  tool: Tool;
  children: React.ReactNode;
}) {
  const category = categories.find((item) => item.slug === tool.category)!;
  return (
    <>
      <nav
        aria-label="Breadcrumb"
        className="mb-7 flex flex-wrap items-center gap-2 text-xs text-slate-400"
      >
        <Link href="/" className="hover:text-violet-500">
          All tools
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link
          href={`/tools/${category.slug}/`}
          className="hover:text-violet-500"
        >
          {category.name}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-slate-600 dark:text-slate-300">{tool.name}</span>
      </nav>
      <div className="flex items-start gap-4">
        <span
          className={`hidden rounded-2xl p-3.5 sm:block ${categoryColors[tool.category]}`}
        >
          <ToolIcon name={tool.icon} className="h-7 w-7" />
        </span>
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[.15em] text-violet-500">
              {category.name}
            </span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              Free & private
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {tool.title}
          </h1>
          <p className="muted mt-3 max-w-2xl">{tool.description}</p>
        </div>
      </div>
      <div className="mt-8 grid items-start gap-6 min-[1500px]:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <section
            aria-label={`${tool.name} workspace`}
            className="panel overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <span className="text-sm font-semibold">{tool.name}</span>
              <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5" /> Local processing
              </span>
            </div>
            <div className="p-5 sm:p-7">{children}</div>
          </section>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {tool.features.map((feature) => (
              <div key={feature} className="panel p-4">
                <Check className="mb-2 h-4 w-4 text-violet-500" />
                <h3 className="text-xs font-semibold">{feature}</h3>
              </div>
            ))}
          </div>
          <section id="how-to-use" className="panel mt-7 p-6">
            <h2 className="text-xl font-semibold tracking-tight">How to Use</h2>
            <ol className="mt-5 space-y-4">
              {tool.steps.map((step, i) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-50 text-xs font-semibold text-violet-600 dark:bg-violet-950 dark:text-violet-300">
                    {i + 1}
                  </span>
                  <p className="muted pt-0.5">{step}</p>
                </li>
              ))}
            </ol>
          </section>
          <section className="mt-8">
            <h2 className="text-xl font-semibold tracking-tight">
              Frequently Asked Questions
            </h2>
            <div className="mt-4 space-y-3">
              {tool.faq.map((item) => (
                <details className="panel p-5" key={item.question}>
                  <summary className="text-sm font-medium">
                    {item.question}
                  </summary>
                  <p className="muted mt-3">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
          <div className="my-8">
            <AdSlot type="action" />
          </div>
          <h2 className="text-lg font-semibold">
            More in {category.name.toLowerCase()}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {tools
              .filter(
                (item) =>
                  item.category === tool.category && item.slug !== tool.slug,
              )
              .map((item) => (
                <ToolCard key={item.slug} tool={item} />
              ))}
          </div>
        </div>
        <div className="sticky top-36 hidden min-[1500px]:block">
          <AdSlot type="rail" />
        </div>
      </div>
    </>
  );
}
