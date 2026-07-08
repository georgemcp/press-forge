import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { toolPages } from "@/lib/seo/tool-pages";

const llmsText = readFileSync("public/llms.txt", "utf8");

describe("llms.txt", () => {
  it("lists public entity and trust pages for answer-engine crawlers", () => {
    expect(llmsText).toContain("- /: overview");
    expect(llmsText).toContain("- /about: factual entity page");
    expect(llmsText).toContain("- /tools: indexable hub");
    expect(llmsText).toContain("- /pricing: public pricing source of truth");
    expect(llmsText).toContain("- /privacy: privacy policy");
  });

  it("lists every public tool page for answer-engine crawlers", () => {
    for (const page of toolPages) {
      expect(llmsText, page.slug).toContain(`/tools/${page.slug}`);
    }
  });

  it("keeps account and admin routes out of the public crawler catalog", () => {
    const blockedRoutes = ["/app", "/signup", "/login", "/admin"];

    for (const route of blockedRoutes) {
      expect(llmsText).not.toContain(`- ${route}:`);
    }
  });

  it("keeps pricing and extractable product facts current", () => {
    expect(llmsText).toContain("$12 for one export credit");
    expect(llmsText).toContain("$49/month for Trim Proof Pro");
    expect(llmsText).not.toContain("$9");
    expect(llmsText).not.toContain("$29");
    expect(llmsText).toContain("deterministic prepress validation");
    expect(llmsText).toContain("PDF/X, CMYK, bleed, crop marks, embedded fonts, and preflight checks");
  });
});
