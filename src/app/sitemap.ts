import type { MetadataRoute } from "next";
import { toolPages } from "@/lib/seo/tool-pages";

export default function sitemap(): MetadataRoute.Sitemap {
  const host = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const now = new Date();
  return [
    {
      url: `${host}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1
    },
    {
      url: `${host}/app`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8
    },
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
