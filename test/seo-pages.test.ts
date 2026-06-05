import { describe, expect, it } from "vitest";

import { getToolPage, toolPages } from "@/lib/seo/tool-pages";

describe("SEO tool pages", () => {
  it("keeps tool page slugs unique", () => {
    const slugs = toolPages.map((page) => page.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("keeps related links resolvable", () => {
    for (const page of toolPages) {
      for (const relatedSlug of page.relatedSlugs) {
        expect(
          getToolPage(relatedSlug),
          `${page.slug} related slug ${relatedSlug}`
        ).toBeDefined();
      }
    }
  });

  it("keeps answer-engine fields populated", () => {
    for (const page of toolPages) {
      expect(page.answer.length, `${page.slug} answer`).toBeGreaterThan(80);
      expect(page.checks.length, `${page.slug} checks`).toBeGreaterThanOrEqual(5);
      expect(page.steps.length, `${page.slug} steps`).toBeGreaterThanOrEqual(5);
      expect(page.sections.length, `${page.slug} sections`).toBeGreaterThanOrEqual(2);
      expect(page.faq.length, `${page.slug} faq`).toBeGreaterThanOrEqual(1);
      expect(page.keywords.length, `${page.slug} keywords`).toBeGreaterThanOrEqual(3);
    }
  });
});
