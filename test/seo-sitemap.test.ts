import { describe, expect, it } from "vitest";

import sitemap from "@/app/sitemap";
import { getSiteOrigin } from "@/lib/seo/site-url";
import { toolPages } from "@/lib/seo/tool-pages";

describe("SEO sitemap", () => {
  it("lists public acquisition pages and excludes account workspace routes", () => {
    const urls = sitemap().map((entry) => entry.url);
    const origin = getSiteOrigin();

    expect(urls).toContain(`${origin}/`);
    expect(urls).toContain(`${origin}/about`);
    expect(urls).toContain(`${origin}/tools`);
    expect(urls).toContain(`${origin}/pricing`);
    expect(urls).toContain(`${origin}/privacy`);
    expect(urls).not.toContain(`${origin}/signup`);
    expect(urls).not.toContain(`${origin}/app`);

    for (const page of toolPages) {
      expect(urls).toContain(`${origin}/tools/${page.slug}`);
    }
  });
});
