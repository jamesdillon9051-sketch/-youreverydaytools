import type { MetadataRoute } from "next";
import { absoluteUrl, categories, tools, toolPath } from "@/lib/catalog";
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/about/"), changeFrequency: "monthly", priority: 0.5 },
    {
      url: absoluteUrl("/privacy-policy/"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...categories.map((category) => ({
      url: absoluteUrl(`/tools/${category.slug}/`),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...tools.map((tool) => ({
      url: absoluteUrl(toolPath(tool)),
      changeFrequency: "monthly" as const,
      priority: 0.9,
    })),
  ];
}
