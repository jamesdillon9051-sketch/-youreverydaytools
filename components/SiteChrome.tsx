"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Command,
  Menu,
  Moon,
  Search,
  ShieldCheck,
  Sun,
  X,
} from "lucide-react";
import { categories, tools, toolPath } from "@/lib/catalog";
import { ToolIcon, categoryColors } from "./Icons";

export function SiteChrome() {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const search = useRef<HTMLInputElement>(null);
  const results = tools
    .filter((tool) =>
      `${tool.name} ${tool.title} ${tool.keywords.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .slice(0, 6);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        search.current?.focus();
      }
      if (event.key === "Escape") {
        setFocused(false);
        setOpen(false);
        search.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    setOpen(false);
    setFocused(false);
    setQuery("");
  }, [pathname]);
  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("localtools-theme", next ? "dark" : "light");
    } catch {}
  }
  const navigation = (
    <>
      <Link
        href="/"
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${pathname === "/" ? "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300" : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"}`}
      >
        <ToolIcon name="home" /> All tools{" "}
        <span className="ml-auto rounded-md bg-violet-100 px-1.5 py-0.5 text-[10px] text-violet-600 dark:bg-violet-900 dark:text-violet-300">
          15
        </span>
      </Link>
      <p className="mb-3 mt-8 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">
        Your workspace
      </p>
      {categories.map((category) => (
        <Link
          key={category.slug}
          href={`/tools/${category.slug}/`}
          className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${pathname.includes(`/tools/${category.slug}/`) ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"}`}
        >
          <span
            className={categoryColors[category.slug]
              .split(" ")
              .filter((c) => !c.startsWith("bg-") && !c.startsWith("dark:bg-"))
              .join(" ")}
          >
            <ToolIcon name={category.icon} />
          </span>
          {category.name}
          <ChevronRight className="ml-auto h-3.5 w-3.5 text-slate-400" />
        </Link>
      ))}
    </>
  );
  return (
    <>
      <header className="sticky top-0 z-40 flex h-[76px] items-center gap-4 border-b border-slate-200 bg-white/90 px-5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90 sm:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 lg:w-[208px]"
          aria-label="LocalTools home"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-lg font-extrabold text-white shadow-sm">
            L<span className="text-violet-300">.</span>
          </span>
          <span className="hidden text-xl font-bold tracking-tight sm:block">
            Local
            <span className="text-violet-600 dark:text-violet-400">Tools</span>
          </span>
        </Link>
        <div className="relative mx-auto w-full max-w-xl">
          <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            ref={search}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 180)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && results[0]) {
                window.location.assign(toolPath(results[0]));
              }
            }}
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-12 text-sm transition placeholder:text-slate-400 dark:border-slate-800 dark:bg-slate-900"
            placeholder="Search for a tool…"
            aria-label="Search tools"
            role="combobox"
            aria-expanded={focused}
            aria-controls="search-results"
            autoComplete="off"
          />
          <span className="pointer-events-none absolute right-3 top-2.5 hidden items-center gap-0.5 rounded border border-slate-200 px-1 text-[10px] text-slate-400 dark:border-slate-700 sm:flex">
            <Command className="h-3 w-3" /> K
          </span>
          {focused && (
            <div
              id="search-results"
              className="panel absolute left-0 right-0 top-12 max-h-80 overflow-auto p-2"
              role="listbox"
            >
              {results.length ? (
                results.map((tool) => (
                  <Link
                    role="option"
                    aria-selected={false}
                    key={tool.slug}
                    href={toolPath(tool)}
                    className="flex items-center gap-3 rounded-lg p-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <ToolIcon name={tool.icon} />
                    <span>{tool.name}</span>
                    <ArrowUpRight className="ml-auto h-4 w-4 text-slate-400" />
                  </Link>
                ))
              ) : (
                <p className="muted p-4">
                  No tools found. Try “image”, “PDF”, or “JSON”.
                </p>
              )}
            </div>
          )}
        </div>
        <span className="hidden items-center gap-1.5 text-xs font-medium text-slate-500 xl:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> All
          systems local
        </span>
        <button
          onClick={toggleTheme}
          className="rounded-xl border border-slate-200 p-2.5 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg p-2 lg:hidden"
          aria-label="Toggle navigation"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>
      <aside className="fixed bottom-0 left-0 top-[76px] z-30 hidden w-[240px] flex-col border-r border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 lg:flex">
        <nav aria-label="Main navigation">{navigation}</nav>
        <div className="mt-auto rounded-2xl border border-violet-100 bg-violet-50/60 p-4 dark:border-violet-900/40 dark:bg-violet-950/20">
          <ShieldCheck className="mb-3 h-6 w-6 text-violet-500" />
          <p className="text-sm font-semibold">Your files. Your device.</p>
          <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
            No uploads. No accounts.
            <br />
            Just tools that work for you.
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-[10px] font-medium text-violet-600 dark:text-violet-400">
            <Check className="h-3 w-3" /> Private by design
          </div>
        </div>
        <p className="mt-5 text-center text-[10px] text-slate-400">
          Made for your everyday.
        </p>
      </aside>
      {open && (
        <nav
          aria-label="Mobile navigation"
          className="fixed inset-x-0 top-[76px] z-50 border-b border-slate-200 bg-white p-5 shadow-lg dark:border-slate-800 dark:bg-slate-950 lg:hidden"
        >
          {navigation}
        </nav>
      )}
    </>
  );
}
