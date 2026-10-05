import { notFound } from "next/navigation";
import { tools, toolPath } from "@/lib/catalog";
import { createMetadata, SEOHeader } from "@/components/SEOHeader";
import { ToolWrapper } from "@/components/ToolWrapper";
import { ToolLoader } from "@/components/ToolLoader";

export const dynamicParams = false;
export function generateStaticParams() {
  return tools.map((tool) => ({ category: tool.category, tool: tool.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; tool: string }>;
}) {
  const { category, tool: slug } = await params;
  const tool = tools.find(
    (item) => item.category === category && item.slug === slug,
  );
  if (!tool) return {};
  return createMetadata(
    tool.title,
    tool.description,
    toolPath(tool),
    tool.keywords,
  );
}
export default async function ToolPage({
  params,
}: {
  params: Promise<{ category: string; tool: string }>;
}) {
  const { category, tool: slug } = await params;
  const tool = tools.find(
    (item) => item.category === category && item.slug === slug,
  );
  if (!tool) notFound();
  return (
    <>
      <SEOHeader
        title={tool.title}
        description={tool.description}
        path={toolPath(tool)}
        steps={tool.steps}
        faq={tool.faq}
      />
      <ToolWrapper tool={tool}>
        <ToolLoader slug={tool.slug} />
      </ToolWrapper>
    </>
  );
}
