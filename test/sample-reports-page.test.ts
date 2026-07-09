import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import sitemap from "@/app/sitemap";
import { sampleReportExamples, sampleReportHandoffExamples, sampleReportProofRules } from "@/lib/seo/sample-reports";
import { getSiteOrigin } from "@/lib/seo/site-url";

const pageSource = readFileSync("src/app/sample-reports/page.tsx", "utf8");
const marketingSiteSource = readFileSync("src/components/marketing-site.tsx", "utf8");
const launchPlan = readFileSync("docs/superpowers/plans/2026-06-15-trim-proof-business-launch.md", "utf8");
const businessBlueprint = readFileSync("docs/business/trim-proof-business-blueprint.md", "utf8");

describe("sample reports public proof page", () => {
  it("defines bounded non-customer sample reports for supported Trim Proof workflows", () => {
    expect(sampleReportExamples.length).toBeGreaterThanOrEqual(3);
    expect(sampleReportExamples.map((example) => example.productType)).toContain("business_card");
    expect(sampleReportExamples.map((example) => example.productType)).toContain("menu");

    for (const example of sampleReportExamples) {
      expect(example.title).toContain("sample");
      expect(example.sourceMaterial).toMatch(/sample|non-customer|demo/i);
      expect(example.checks.length).toBeGreaterThanOrEqual(4);
      expect(example.boundary).toMatch(/not a guarantee|sample|printer/i);
    }
  });

  it("frames before-and-after handoff examples without customer outcome claims", () => {
    expect(sampleReportHandoffExamples.length).toBeGreaterThanOrEqual(3);
    expect(sampleReportHandoffExamples.map((example) => example.after).join(" ")).toContain("preflight report");
    expect(sampleReportProofRules.join(" ")).toContain("No customer logos");
    expect(sampleReportProofRules.join(" ")).toContain("approved_public");
  });

  it("renders a public sample reports route with schema and conversion paths", () => {
    expect(pageSource).toContain("export const metadata");
    expect(pageSource).toContain("Sample Trim Proof preflight reports");
    expect(pageSource).toContain("Non-customer sample reports");
    expect(pageSource).toContain("Before and after handoff examples");
    expect(pageSource).toContain("Pilot learnings will be added only after approved evidence records exist.");
    expect(pageSource).toContain('"@type": "CollectionPage"');
    expect(pageSource).toContain('"@type": "FAQPage"');
    expect(pageSource).toContain("/signup?intent=demo&next=/app");
    expect(pageSource).toContain("/prepress-checklist");
  });

  it("links sample reports from the homepage and sitemap", () => {
    const urls = sitemap().map((entry) => entry.url);
    const origin = getSiteOrigin();

    expect(marketingSiteSource).toContain("/sample-reports");
    expect(marketingSiteSource).toContain("View sample reports");
    expect(urls).toContain(`${origin}/sample-reports`);
  });

  it("updates launch docs so Week 4 proof has a public non-customer surface", () => {
    expect(launchPlan).toContain("Add the public sample reports page");
    expect(businessBlueprint).toContain("/sample-reports");
    expect(businessBlueprint).toContain("non-customer sample reports");
  });
});
