import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const aboutPageSource = readFileSync("src/app/about/page.tsx", "utf8");

describe("SEO about page", () => {
  it("keeps a factual answer-engine product definition", () => {
    expect(aboutPageSource).toContain("What does Trim Proof do?");
    expect(aboutPageSource).toContain("print-ready PDF/X proofs");
    expect(aboutPageSource).toContain("bleed, crop marks, embedded vector text");
    expect(aboutPageSource).toContain("CMYK-oriented output");
    expect(aboutPageSource).toContain("preflight checks");
  });

  it("keeps supported products, pricing, and proof paths visible", () => {
    expect(aboutPageSource).toContain("Business cards, flyers, menus, posters, brochures, postcards, and letterhead.");
    expect(aboutPageSource).toContain("$12 one-export credit");
    expect(aboutPageSource).toContain("$49/month Trim Proof Pro");
    expect(aboutPageSource).toContain("/signup?intent=demo&next=/app");
  });

  it("keeps product boundaries explicit", () => {
    expect(aboutPageSource).toContain("not a universal repair tool");
    expect(aboutPageSource).toContain("not a client approval, annotation, or review-routing suite");
    expect(aboutPageSource).toContain("does not guarantee acceptance by every printer");
    expect(aboutPageSource).toContain("does not claim to repair every Canva export");
  });

  it("includes GEO-relevant structured data types", () => {
    expect(aboutPageSource).toContain('"@type": "AboutPage"');
    expect(aboutPageSource).toContain('"@type": "Organization"');
    expect(aboutPageSource).toContain('"@type": "SoftwareApplication"');
    expect(aboutPageSource).toContain('"@type": "FAQPage"');
    expect(aboutPageSource).toContain('"@type": "BreadcrumbList"');
  });
});
