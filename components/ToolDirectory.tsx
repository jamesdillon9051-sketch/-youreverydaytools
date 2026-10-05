"use client";

import { useState } from "react";
import { ArrowUpRight, Grid2X2 } from "lucide-react";
import { categories, tools } from "@/lib/catalog";
import { ToolCard } from "./ToolCard";
import { ToolIcon } from "./Icons";

export function ToolDirectory() {
  const [filter, setFilter] = useState("all");
  const shown = tools.filter(
    (tool) => filter === "all" || tool.category === filter,
  );
  return (
    <section id="all-tools" className="mt-10">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[.16em] text-violet-500">
            Your everyday toolkit
          </p>
          <h2 className="text-xl font-bold tracking-tight">
            Find your next shortcut
          </h2>
        </div>
        <span className="hidden text-xs text-slate-400 sm:block">
          {shown.length} tools, zero friction{" "}
          <ArrowUpRight className="ml-1 inline h-3 w-3" />
        </span>
      </div>
      <div className="mb-6 flex flex-wrap gap-2" aria-label="Filter tools">
        <button
          onClick={() => setFilter("all")}
          aria-pressed={filter === "all"}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${filter === "all" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "border border-slate-200 bg-white text-slate-500 hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"}`}
        >
          <Grid2X2 className="h-3.5 w-3.5" /> All tools
        </button>
        {categories.map((category) => (
          <button
            key={category.slug}
            onClick={() => setFilter(category.slug)}
            aria-pressed={filter === category.slug}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${filter === category.slug ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "border border-slate-200 bg-white text-slate-500 hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"}`}
          >
            <ToolIcon name={category.icon} className="h-3.5 w-3.5" />
            {category.name}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {shown.map((tool) => (
          <ToolCard
            key={tool.slug}
            tool={tool}
            popular={["webp-to-jpg", "merge-pdf", "json-formatter"].includes(
              tool.slug,
            )}
          />
        ))}
      </div>
    </section>
  );
}
