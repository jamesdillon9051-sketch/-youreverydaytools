import { notFound } from "next/navigation";
import Link from "next/link";
import { categories, tools } from "@/lib/catalog";
import { createMetadata, SEOHeader } from "@/components/SEOHeader";
import { ToolCard } from "@/components/ToolCard";
import { ToolIcon, categoryColors } from "@/components/Icons";

export const dynamicParams = false;
export function generateStaticParams() {
  return categories.map((category) => ({ category: category.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  const category = categories.find((item) => item.slug === slug);
  if (!category) return {};
  return createMetadata(
    `Free ${category.name} online`,
    `Free, private ${category.name.toLowerCase()} that run entirely in your browser. ${category.description}`,
    `/tools/${slug}/`,
    tools
      .filter((tool) => tool.category === slug)
      .flatMap((tool) => tool.keywords),
  );
}
export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  const category = categories.find((item) => item.slug === slug);
  if (!category) notFound();
  return (
    <>
      <SEOHeader
        title={`Free ${category.name} online`}
        description={category.description}
        path={`/tools/${slug}/`}
        steps={[
          "Choose a tool from this category.",
          "Enter your data or select local files.",
          "Process and save the result locally.",
        ]}
      />
      <p className="mb-8 text-xs text-slate-400">
        <Link href="/" className="hover:text-violet-600">
          All tools
        </Link>{" "}
        <span className="mx-2">/</span> {category.name}
      </p>
      <span
        className={`mb-5 inline-flex rounded-2xl p-4 ${categoryColors[slug]}`}
      >
        <ToolIcon name={category.icon} className="h-7 w-7" />
      </span>
      <h1 className="text-3xl font-bold tracking-tight">
        Free {category.name.toLowerCase()} online
      </h1>
      <p className="muted mt-3">
        {category.description} Your data stays on your device.
      </p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {tools
          .filter((tool) => tool.category === slug)
          .map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
      </div>
      <section id="how-to-use" className="panel mt-10 p-6">
        <h2 className="text-xl font-semibold">How to Use</h2>
        <ol className="muted mt-4 list-inside list-decimal space-y-2">
          <li>Pick a tool from the cards above.</li>
          <li>Provide your inputs and adjust the settings.</li>
          <li>Review the result and download or copy it.</li>
        </ol>
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-semibold">Frequently Asked Questions</h2>
        <details className="panel mt-4 p-5">
          <summary className="text-sm font-medium">
            Are these tools free and private?
          </summary>
          <p className="muted mt-3">
            Yes. All computations run in your browser without uploading your
            files. Practical file sizes depend on your device memory.
          </p>
        </details>
      </section>
    </>
  );
}
