import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/seo/site-url";
import { audiencePages } from "@/lib/seo/audience-pages";
import { comparisonPages } from "@/lib/seo/comparison-pages";
import { toolPages } from "@/lib/seo/tool-pages";

export default function sitemap(): MetadataRoute.Sitemap {
  const host = getSiteOrigin();
  const now = new Date();
  return [
    {
      url: `${host}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1
    },
    {
      url: `${host}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.65
    },
    {
      url: `${host}/tools`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85
    },
    {
      url: `${host}/pricing`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7
    },
    ...audiencePages.map((page) => ({
      url: `${host}${page.path}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.72
    })),
    {
      url: `${host}/prepress-checklist`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.76
    },
    {
      url: `${host}/sample-reports`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.74
    },
    {
      url: `${host}/pilot-application`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.78
    },
    ...comparisonPages.map((page) => ({
      url: `${host}${page.path}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.74
    })),
    {
      url: `${host}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3
    },
    ...toolPages.map((page) => ({
      url: `${host}/tools/${page.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.75
    }))
  ];
}
