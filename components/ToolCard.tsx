import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { type Tool, toolPath } from "@/lib/catalog";
import { categoryColors, ToolIcon } from "./Icons";

export function ToolCard({
  tool,
  popular = false,
}: {
  tool: Tool;
  popular?: boolean;
}) {
  return (
    <Link
      href={toolPath(tool)}
      className="panel group flex h-full flex-col p-5 transition duration-200 hover:-translate-y-1 hover:border-violet-300 hover:shadow-md dark:hover:border-violet-700"
    >
      <div className="flex items-start justify-between">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${categoryColors[tool.category]}`}
        >
          <ToolIcon name={tool.icon} className="h-5 w-5" />
        </span>
        {popular ? (
          <span className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
            POPULAR
          </span>
        ) : (
          <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-violet-500 dark:text-slate-600" />
        )}
      </div>
      <h3 className="mt-5 text-[15px] font-semibold tracking-tight">
        {tool.name}
      </h3>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {tool.description}
      </p>
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
        <span className="text-[10px] text-slate-400">{tool.features[0]}</span>
        <span className="flex items-center gap-1 text-[10px] font-semibold text-violet-600 dark:text-violet-400">
          Open tool <ArrowUpRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}
