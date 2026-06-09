import type { Metadata } from "next";
import type { ToolPage } from "@/lib/seo/tool-pages";

export function getToolPageMetadata(page: ToolPage): Metadata {
  const canonicalPath = `/tools/${page.slug}`;

  return {
    title: page.title,
    description: page.metaDescription,
    alternates: {
      canonical: canonicalPath
    },
    openGraph: {
      title: page.title,
      description: page.metaDescription,
      url: canonicalPath,
      siteName: "Trim Proof",
      images: [
        {
          url: "/trim-proof-workspace-concept.png",
          width: 1440,
          height: 1000,
          alt: "Trim Proof workspace with brief intake, print preview, preflight gate, and export controls."
        }
      ],
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.metaDescription,
      images: ["/trim-proof-workspace-concept.png"]
    }
  };
}
