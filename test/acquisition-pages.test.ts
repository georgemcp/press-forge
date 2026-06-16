import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { audiencePages, getAudiencePage } from "@/lib/seo/audience-pages";
import { prepressChecklistFaq, prepressChecklistFacts, prepressChecklistSections } from "@/lib/seo/prepress-checklist";

const marketingSiteSource = readFileSync("src/components/marketing-site.tsx", "utf8");
const audiencePageSource = readFileSync("src/components/audience-page.tsx", "utf8");
const checklistPageSource = readFileSync("src/app/prepress-checklist/page.tsx", "utf8");
const toolsPageSource = readFileSync("src/app/tools/page.tsx", "utf8");
const productScreenshot = readFileSync("public/images/product/trim-proof-workspace-app.png");

describe("acquisition pages", () => {
  it("defines buyer use-case pages for the core launch personas", () => {
    expect(audiencePages.map((page) => page.path)).toEqual([
      "/for-print-shops",
      "/for-marketers",
      "/for-designers"
    ]);

    expect(getAudiencePage("print-shops")?.emailSource).toBe("print_shop_page");
    expect(getAudiencePage("marketers")?.emailSource).toBe("marketer_page");
    expect(getAudiencePage("designers")?.emailSource).toBe("designer_page");
  });

  it("keeps buyer pages useful, bounded, and schema-ready", () => {
    for (const page of audiencePages) {
      expect(page.h1.length, page.path).toBeGreaterThan(40);
      expect(page.shortAnswer, page.path).toContain("Trim Proof");
      expect(page.proofPoints.length, page.path).toBeGreaterThanOrEqual(4);
      expect(page.useCases.length, page.path).toBeGreaterThanOrEqual(3);
      expect(page.workflow.length, page.path).toBeGreaterThanOrEqual(5);
      expect(page.boundaries.join(" "), page.path).toMatch(/does not|should not|not /);
      expect(page.faq.length, page.path).toBeGreaterThanOrEqual(3);
    }

    expect(audiencePageSource).toContain('"@type": "WebPage"');
    expect(audiencePageSource).toContain('"@type": "SoftwareApplication"');
    expect(audiencePageSource).toContain('"@type": "FAQPage"');
  });

  it("links homepage buyer cards to use-case pages", () => {
    expect(marketingSiteSource).toContain("/for-print-shops");
    expect(marketingSiteSource).toContain("/for-marketers");
    expect(marketingSiteSource).toContain("/for-designers");
  });

  it("uses a real product screenshot as homepage evidence", () => {
    expect(marketingSiteSource).toContain("/images/product/trim-proof-workspace-app.png");
    expect(marketingSiteSource).toContain("Local product screenshot captured from the current Trim Proof workspace");
    expect(marketingSiteSource).toContain("non-customer sample content");
    expect(productScreenshot.length).toBeGreaterThan(100_000);
  });

  it("links the Canva comparison from homepage and tools hub", () => {
    expect(marketingSiteSource).toContain("/compare/canva-print-ready-pdf");
    expect(toolsPageSource).toContain("/compare/canva-print-ready-pdf");
    expect(toolsPageSource).toContain("Canva PDF Print or a checked Trim Proof handoff?");
  });

  it("keeps the prepress checklist visible and tied to email capture", () => {
    const checklistText = prepressChecklistSections
      .flatMap((section) => [section.heading, ...section.items])
      .join(" ");

    expect(checklistText).toContain("trim size");
    expect(checklistText).toContain("bleed");
    expect(checklistText).toContain("crop marks");
    expect(checklistText).toContain("vector text");
    expect(checklistText).toContain("300 DPI");
    expect(checklistText).toContain("PDF/X");
    expect(prepressChecklistFacts.map((item) => item.join(" ")).join(" ")).toContain("printer's exact spec controls");
    expect(prepressChecklistFaq.map((item) => item.answer).join(" ")).toContain("every printer can set its own");
    expect(checklistPageSource).toContain('source="prepress_checklist"');
    expect(checklistPageSource).toContain('"@type": "Article"');
    expect(checklistPageSource).toContain('"@type": "HowTo"');
  });
});
