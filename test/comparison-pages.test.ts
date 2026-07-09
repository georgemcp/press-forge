import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { comparisonPages, getComparisonPage } from "@/lib/seo/comparison-pages";

const canvaComparisonPageSource = readFileSync("src/app/compare/canva-print-ready-pdf/page.tsx", "utf8");

describe("comparison pages", () => {
  it("defines the Canva print-ready PDF comparison page", () => {
    const page = getComparisonPage("canva-print-ready-pdf");

    expect(comparisonPages.map((item) => item.path)).toContain("/compare/canva-print-ready-pdf");
    expect(page?.title).toContain("Canva Print-Ready PDF");
    expect(page?.shortAnswer).toContain("Use Canva when");
    expect(page?.shortAnswer).toContain("Use Trim Proof when");
    expect(page?.emailSource).toBe("comparison_canva_print_ready_pdf");
  });

  it("keeps the comparison factual, sourced, and bounded", () => {
    const page = getComparisonPage("canva-print-ready-pdf");
    const sourceText = page?.sourceNotes.map((source) => `${source.label} ${source.href} ${source.note}`).join(" ") ?? "";
    const boundaryText = page?.boundaries.join(" ") ?? "";
    const answerText = page?.faq.map((item) => item.answer).join(" ") ?? "";

    expect(sourceText).toContain("https://www.canva.com/help/margins-bleed-crop-marks/");
    expect(sourceText).toContain("https://www.canva.com/help/download-file-types/");
    expect(sourceText).toContain("PDF Print");
    expect(sourceText).toContain("300 dpi");
    expect(boundaryText).toContain("does not directly convert or repair every Canva export");
    expect(boundaryText).toContain("Neither Canva nor Trim Proof");
    expect(answerText).toContain("not a universal Canva repair service");
    expect(answerText).toContain("printer's requirements");
  });

  it("renders article and FAQ schema without untrusted HTML plumbing", () => {
    expect(canvaComparisonPageSource).toContain('"@type": "Article"');
    expect(canvaComparisonPageSource).toContain('"@type": "FAQPage"');
    expect(canvaComparisonPageSource).toContain("JSON.stringify(schema)");
    expect(canvaComparisonPageSource).not.toContain("await request");
    expect(canvaComparisonPageSource).not.toContain("searchParams");
  });
});
