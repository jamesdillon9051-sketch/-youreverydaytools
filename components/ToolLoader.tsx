"use client";

import dynamic from "next/dynamic";
import { socialModes } from "@/lib/social";

const loading = () => (
  <div
    className="h-64 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
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

export function ToolLoader({ slug }: { slug: string }) {
  if (["webp-to-jpg", "image-compressor", "image-resizer"].includes(slug))
    return <MediaTools mode={slug} />;
  if (["merge-pdf", "split-pdf", "image-to-pdf"].includes(slug))
    return <PdfTools mode={slug} />;
  if (["json-formatter", "base64", "regex-tester"].includes(slug))
    return <DeveloperTools mode={slug} />;
  if (["compound-interest", "mortgage-payoff", "freelance-rate"].includes(slug))
    return <CalculatorTools mode={slug} />;
  if (slug in socialModes) return <SocialTools mode={slug} />;
  return <GeneratorTools mode={slug} />;
}
