import { toolPages, type ToolPage } from "@/lib/seo/tool-pages";

export type DataForSeoCountryCode = "US" | "CA";

export interface DataForSeoLocationConfig {
  label: string;
  countryCode: DataForSeoCountryCode;
  locationName: string;
  locationCode: number;
  languageName: string;
  languageCode: string;
  searchPartners: boolean;
}

export interface DataForSeoMonthlySearch {
  year: number;
  month: number;
  searchVolume: number;
}

export interface DataForSeoKeywordRow {
  keyword: string;
  locationName: string;
  locationCode: number;
  countryCode: DataForSeoCountryCode;
  languageCode: string;
  searchPartners: boolean;
  searchVolume: number;
  competition: string;
  competitionIndex: number;
  lowTopOfPageBid: number | null;
  highTopOfPageBid: number | null;
  cpc: number | null;
  monthlySearches: DataForSeoMonthlySearch[];
  pageSlug?: string;
  pageTitle?: string;
  pageType?: ToolPage["pageType"];
}

export interface DataForSeoKeywordSummary {
  keyword: string;
  pageSlug?: string;
  pageTitle?: string;
  pageType?: ToolPage["pageType"];
  combinedSearchVolume: number;
  usSearchVolume: number;
  caSearchVolume: number;
  usCpc: number | null;
  caCpc: number | null;
  maxCpc: number | null;
  competition: string;
  competitionIndex: number;
  locationCodes: number[];
}

export interface DataForSeoPageSummary {
  pageSlug: string;
  pageTitle: string;
  pageType?: ToolPage["pageType"];
  combinedSearchVolume: number;
  keywordCount: number;
  topKeywords: string[];
}

export interface DataForSeoResearchSummary {
  totalKeywords: number;
  totalRows: number;
  totalSearchVolume: number;
  topKeywords: DataForSeoKeywordSummary[];
  topPages: DataForSeoPageSummary[];
  unmappedKeywords: DataForSeoKeywordSummary[];
}

export interface DataForSeoResearchFile {
  generatedAt: string;
  source: {
    provider: "DataForSEO";
    endpoint: string;
    searchPartners: boolean;
    languageName: string;
    locations: Array<{
      label: string;
      countryCode: DataForSeoCountryCode;
      locationName: string;
      locationCode: number;
    }>;
  };
  rows: DataForSeoKeywordRow[];
  summary: DataForSeoResearchSummary;
}

export function normalizeSeoKeyword(keyword: string) {
  return keyword.trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildToolPageKeywordLookup(pages: ToolPage[] = toolPages) {
  const lookup = new Map<string, ToolPage>();
  for (const page of pages) {
    const values = new Set([page.title, page.h1, ...page.keywords]);
    for (const value of values) {
      lookup.set(normalizeSeoKeyword(value), page);
    }
  }
  return lookup;
}

export function resolveToolPageForKeyword(keyword: string, lookup = buildToolPageKeywordLookup()) {
  return lookup.get(normalizeSeoKeyword(keyword));
}

export function buildDataForSeoSummary(rows: DataForSeoKeywordRow[]): DataForSeoResearchSummary {
  const byKeyword = new Map<string, DataForSeoKeywordRow[]>();
  for (const row of rows) {
    const key = normalizeSeoKeyword(row.keyword);
    const existing = byKeyword.get(key) ?? [];
    existing.push(row);
    byKeyword.set(key, existing);
  }

  const keywordSummaries = [...byKeyword.entries()].map(([, keywordRows]) => {
    const usRow = keywordRows.find((row) => row.countryCode === "US");
    const caRow = keywordRows.find((row) => row.countryCode === "CA");
    const combinedSearchVolume = keywordRows.reduce((total, row) => total + row.searchVolume, 0);
    const cpcCandidates = keywordRows.flatMap((row) => [row.cpc, row.highTopOfPageBid, row.lowTopOfPageBid]).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    const maxCpc = cpcCandidates.length ? Math.max(...cpcCandidates) : null;
    const competitionIndex = Math.max(...keywordRows.map((row) => row.competitionIndex), 0);
    const representative = keywordRows[0];

    return {
      keyword: representative.keyword,
      pageSlug: representative.pageSlug,
      pageTitle: representative.pageTitle,
      pageType: representative.pageType,
      combinedSearchVolume,
      usSearchVolume: usRow?.searchVolume ?? 0,
      caSearchVolume: caRow?.searchVolume ?? 0,
      usCpc: usRow?.cpc ?? null,
      caCpc: caRow?.cpc ?? null,
      maxCpc,
      competition: representative.competition,
      competitionIndex,
      locationCodes: [...new Set(keywordRows.map((row) => row.locationCode))].sort((left, right) => left - right)
    } satisfies DataForSeoKeywordSummary;
  });

  const topPagesBySlug = new Map<string, DataForSeoPageSummary>();
  for (const keywordSummary of keywordSummaries) {
    if (!keywordSummary.pageSlug || !keywordSummary.pageTitle) {
      continue;
    }
    const existing = topPagesBySlug.get(keywordSummary.pageSlug) ?? {
      pageSlug: keywordSummary.pageSlug,
      pageTitle: keywordSummary.pageTitle,
      pageType: keywordSummary.pageType,
      combinedSearchVolume: 0,
      keywordCount: 0,
      topKeywords: []
    };
    existing.combinedSearchVolume += keywordSummary.combinedSearchVolume;
    existing.keywordCount += 1;
    existing.topKeywords.push(keywordSummary.keyword);
    topPagesBySlug.set(keywordSummary.pageSlug, existing);
  }

  const topPages = [...topPagesBySlug.values()]
    .map((page) => ({
      ...page,
      topKeywords: page.topKeywords
        .slice()
        .sort((left, right) => {
          const leftSummary = keywordSummaries.find((summary) => summary.keyword === left);
          const rightSummary = keywordSummaries.find((summary) => summary.keyword === right);
          return (rightSummary?.combinedSearchVolume ?? 0) - (leftSummary?.combinedSearchVolume ?? 0);
        })
        .slice(0, 5)
    }))
    .sort((left, right) => right.combinedSearchVolume - left.combinedSearchVolume);

  const topKeywords = keywordSummaries
    .slice()
    .sort((left, right) => {
      if (right.combinedSearchVolume !== left.combinedSearchVolume) {
        return right.combinedSearchVolume - left.combinedSearchVolume;
      }
      if (right.maxCpc !== left.maxCpc) {
        return (right.maxCpc ?? 0) - (left.maxCpc ?? 0);
      }
      return left.keyword.localeCompare(right.keyword);
    });

  const unmappedKeywords = topKeywords.filter((item) => !item.pageSlug);

  return {
    totalKeywords: keywordSummaries.length,
    totalRows: rows.length,
    totalSearchVolume: keywordSummaries.reduce((total, item) => total + item.combinedSearchVolume, 0),
    topKeywords,
    topPages,
    unmappedKeywords
  };
}
