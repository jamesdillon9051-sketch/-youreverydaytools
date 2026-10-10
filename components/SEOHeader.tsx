import type { Metadata } from "next";
import { absoluteUrl, type Tool } from "@/lib/catalog";

export function createMetadata(
  title: string,
  description: string,
  path: string,
  keywords: string[] = [],
): Metadata {
  return {
    title,
    description,
    keywords,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: {
      title,
      description,
      url: absoluteUrl(path),
      type: "website",
      siteName: "LocalTools",
      images: [
        {
          url: absoluteUrl("/og.png"),
          width: 1200,
          height: 630,
          alt: "LocalTools — everyday utilities and public social downloaders",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absoluteUrl("/og.png")],
    },
  };
}

export function SEOHeader({
  title,
  description,
  path,
  steps,
  category = "UtilitiesApplication",
  faq = [],
}: {
  title: string;
  description: string;
  path: string;
  steps: string[];
  category?: string;
  faq?: Tool["faq"];
}) {
  const url = absoluteUrl(path);
  const graph = [
    {
      "@type": "SoftwareApplication",
      "@id": `${url}#application`,
      name: title,
      description,
      url,
      applicationCategory: category,
      operatingSystem: "Any modern web browser",
      browserRequirements: "Requires JavaScript and modern Web APIs",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      isAccessibleForFree: true,
    },
    {
      "@type": "HowTo",
      "@id": `${url}#howto`,
      name: `How to use ${title}`,
      description,
      step: steps.map((text, index) => ({
        "@type": "HowToStep",
        position: index + 1,
        name: text,
        text,
        url: `${url}#how-to-use`,
      })),
    },
    ...(faq.length
      ? [
          {
            "@type": "FAQPage",
            mainEntity: faq.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: { "@type": "Answer", text: item.answer },
            })),
          },
        ]
      : []),
  ];
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": graph,
        }).replace(/</g, "\\u003c"),
      }}
    />
  );
}
