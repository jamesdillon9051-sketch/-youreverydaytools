"use client";

import dynamic from "next/dynamic";
import { microFinanceUrl } from "@/lib/catalog";
import { isSocialSlug } from "@/lib/social";
import { MicroFinanceLauncher } from "./MicroFinanceLauncher";
import { ToolErrorBoundary } from "./ToolErrorBoundary";

const loading = () => (
  <div
    className="h-64 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
    role="status"
    aria-label="Loading tool"
  />
);
const MediaTools = dynamic(() => import("./tools/MediaTools"), {
  loading,
  ssr: false,
});
const PdfTools = dynamic(() => import("./tools/PdfTools"), {
  loading,
  ssr: false,
});
const DeveloperTools = dynamic(() => import("./tools/DeveloperTools"), {
  loading,
  ssr: false,
});
const CalculatorTools = dynamic(() => import("./tools/CalculatorTools"), {
  loading,
  ssr: false,
});
const GeneratorTools = dynamic(() => import("./tools/GeneratorTools"), {
  loading,
  ssr: false,
});

const SocialTools = dynamic(() => import("./tools/SocialTools"), {
  loading,
  ssr: false,
});

function Tool({ slug }: { slug: string }) {
  if (["webp-to-jpg", "image-compressor", "image-resizer"].includes(slug))
    return <MediaTools mode={slug} />;
  if (["merge-pdf", "split-pdf", "image-to-pdf"].includes(slug))
    return <PdfTools mode={slug} />;
  if (["json-formatter", "base64", "regex-tester"].includes(slug))
    return <DeveloperTools mode={slug} />;
  if (["compound-interest", "mortgage-payoff", "freelance-rate"].includes(slug))
    return <CalculatorTools mode={slug} />;
  if (isSocialSlug(slug)) return <SocialTools mode={slug} />;
  if (slug === "micro-finance")
    return <MicroFinanceLauncher url={microFinanceUrl} />;
  return <GeneratorTools mode={slug} />;
}

export function ToolLoader({ slug }: { slug: string }) {
  return (
    <ToolErrorBoundary>
      <Tool slug={slug} />
    </ToolErrorBoundary>
  );
}
