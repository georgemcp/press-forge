import { describe, expect, it } from "vitest";
import {
  buildDataForSeoSummary,
  normalizeSeoKeyword,
  resolveToolPageForKeyword,
  type DataForSeoKeywordRow
} from "@/lib/seo/dataforseo-research";
import type { ToolPage } from "@/lib/seo/tool-pages";

function toolPage(overrides: Partial<ToolPage> = {}): ToolPage {
  return {
    slug: "demo-page",
    title: "Demo Page",
    metaDescription: "Demo page",
    h1: "Demo Page",
    pageType: "tool",
    answer: "Demo answer",
    intent: "Demo intent",
    checks: [],
    steps: [],
    relatedSlugs: [],
    sections: [],
    faq: [],
    keywords: ["demo keyword", "exact match"],
    ...overrides
  };
}

function row(overrides: Partial<DataForSeoKeywordRow>): DataForSeoKeywordRow {
  return {
    keyword: overrides.keyword ?? "exact match",
    locationName: overrides.locationName ?? "United States",
    locationCode: overrides.locationCode ?? 2840,
    countryCode: overrides.countryCode ?? "US",
    languageCode: overrides.languageCode ?? "en",
    searchPartners: overrides.searchPartners ?? false,
    searchVolume: overrides.searchVolume ?? 100,
    competition: overrides.competition ?? "LOW",
    competitionIndex: overrides.competitionIndex ?? 12,
    lowTopOfPageBid: overrides.lowTopOfPageBid ?? 1.2,
    highTopOfPageBid: overrides.highTopOfPageBid ?? 2.4,
    cpc: overrides.cpc ?? 1.8,
    monthlySearches: overrides.monthlySearches ?? [{ year: 2026, month: 6, searchVolume: 100 }],
    pageSlug: overrides.pageSlug,
    pageTitle: overrides.pageTitle,
    pageType: overrides.pageType
  };
}

describe("DataForSEO research helpers", () => {
  it("normalizes keywords and resolves page mappings", () => {
    expect(normalizeSeoKeyword("  Print  Ready PDF  ")).toBe("print ready pdf");

    const page = toolPage();
    const lookup = new Map<string, ToolPage>([[normalizeSeoKeyword("exact match"), page]]);
    expect(resolveToolPageForKeyword(" exact match ", lookup)).toBe(page);
  });

  it("summarizes keyword rows across countries and page mappings", () => {
    const summary = buildDataForSeoSummary([
      row({ countryCode: "US", searchVolume: 100, pageSlug: "demo-page", pageTitle: "Demo Page" }),
      row({ countryCode: "CA", searchVolume: 25, pageSlug: "demo-page", pageTitle: "Demo Page", competitionIndex: 20, cpc: 2.1 }),
      row({
        keyword: "unsupported query",
        countryCode: "US",
        searchVolume: 40,
        competition: "HIGH",
        competitionIndex: 77,
        pageSlug: undefined,
        pageTitle: undefined,
        cpc: 3.5
      })
    ]);

    expect(summary.totalKeywords).toBe(2);
    expect(summary.totalRows).toBe(3);
    expect(summary.totalSearchVolume).toBe(165);
    expect(summary.topPages[0]).toMatchObject({
      pageSlug: "demo-page",
      combinedSearchVolume: 125,
      keywordCount: 1,
      topKeywords: ["exact match"]
    });
    expect(summary.topKeywords[0]).toMatchObject({
      keyword: "exact match",
      combinedSearchVolume: 125,
      usSearchVolume: 100,
      caSearchVolume: 25
    });
    expect(summary.unmappedKeywords).toHaveLength(1);
    expect(summary.unmappedKeywords[0]).toMatchObject({
      keyword: "unsupported query",
      combinedSearchVolume: 40
    });
  });
});
