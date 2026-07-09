import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { toolPages } from "@/lib/seo/tool-pages";
import {
  buildDataForSeoSummary,
  buildToolPageKeywordLookup,
  type DataForSeoKeywordRow,
  type DataForSeoLocationConfig,
  type DataForSeoResearchFile
} from "@/lib/seo/dataforseo-research";

const repoRoot = process.cwd();
const jsonOutputPath = path.join(repoRoot, "src/data/seo/dataforseo-live-research.json");
const markdownOutputPath = path.join(repoRoot, "docs/seo/dataforseo-live-research-2026-06-12.md");
const endpoint = "https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live";

const locations: DataForSeoLocationConfig[] = [
  {
    label: "United States",
    countryCode: "US",
    locationName: "United States",
    locationCode: 2840,
    languageName: "English",
    languageCode: "en",
    searchPartners: false
  },
  {
    label: "Canada",
    countryCode: "CA",
    locationName: "Canada",
    locationCode: 2124,
    languageName: "English",
    languageCode: "en",
    searchPartners: false
  }
];

const extraKeywords = [
  "menu template",
  "menu maker",
  "free menu maker",
  "menu pdf template",
  "menu templates",
  "canva print quality",
  "canva cmyk",
  "canva bleed",
  "canva print ready pdf",
  "proofing software",
  "online proofing software",
  "prepress software",
  "prepress automation software",
  "prepress checklist",
  "how to prepare files for printing",
  "print file requirements",
  "pdf preflight",
  "pdf/x-4",
  "camera ready artwork",
  "print ready artwork"
];

function firstValue(...values: Array<string | undefined>) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim();
}

function chunk<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function normalizeKeywordList(keywords: string[]) {
  return [...new Set(keywords.map((keyword) => keyword.trim()).filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function formatMoney(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "n/a";
  }
  return `$${value.toFixed(2)}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

async function postSearchVolume(credentials: string, location: DataForSeoLocationConfig, keywords: string[]) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify([
      {
        keywords,
        location_name: location.locationName,
        language_name: location.languageName,
        search_partners: location.searchPartners
      }
    ])
  });

  if (!response.ok) {
    throw new Error(`DataForSEO request failed with HTTP ${response.status} for ${location.label}.`);
  }

  const payload = (await response.json()) as {
    tasks?: Array<{
      status_code?: number;
      status_message?: string;
      data?: { keywords?: string[] };
      result?: Array<{
        keyword: string;
        location_code: number;
        language_code: string;
        search_partners: boolean;
        competition: string;
        competition_index: number;
        search_volume: number;
        low_top_of_page_bid?: number | null;
        high_top_of_page_bid?: number | null;
        cpc?: number | null;
        monthly_searches?: Array<{ year: number; month: number; search_volume: number }>;
      }>;
    }>;
  };

  const task = payload.tasks?.[0];
  if (!task || task.status_code !== 20000) {
    throw new Error(`DataForSEO task for ${location.label} did not complete successfully.`);
  }

  return task.result ?? [];
}

function renderMarkdown(research: DataForSeoResearchFile) {
  const lines: string[] = [];
  lines.push("# Trim Proof North America Keyword Research");
  lines.push("");
  lines.push("Live DataForSEO Google Ads Search Volume was refreshed for the United States and Canada on 2026-06-12.");
  lines.push("");
  lines.push("## Method");
  lines.push("");
  lines.push(`- Endpoint: \`${research.source.endpoint}\``);
  lines.push(`- Locations: ${research.source.locations.map((location) => `${location.label} (\`${location.locationCode}\`)`).join(", ")}`);
  lines.push(`- Language: ${research.source.languageName}`);
  lines.push(`- Search partners: ${research.source.searchPartners ? "enabled" : "disabled"}`);
  lines.push(`- Mapped pages: ${research.summary.topPages.length}`);
  lines.push("");
  lines.push("## Top Keywords");
  lines.push("");
  lines.push("| Keyword | US | Canada | Combined | CPC | Competition | Target page |");
  lines.push("| --- | ---: | ---: | ---: | ---: | --- | --- |");
  for (const item of research.summary.topKeywords.slice(0, 20)) {
    lines.push(
      `| ${item.keyword} | ${formatNumber(item.usSearchVolume)} | ${formatNumber(item.caSearchVolume)} | ${formatNumber(item.combinedSearchVolume)} | ${formatMoney(item.maxCpc)} | ${item.competition} | ${item.pageTitle ?? "Unmapped"} |`
    );
  }
  lines.push("");
  lines.push("## Top Pages");
  lines.push("");
  lines.push("| Page | Combined volume | Keywords |");
  lines.push("| --- | ---: | --- |");
  for (const page of research.summary.topPages.slice(0, 12)) {
    lines.push(`| ${page.pageTitle} | ${formatNumber(page.combinedSearchVolume)} | ${page.topKeywords.join(", ")} |`);
  }
  lines.push("");
  lines.push("## Unmapped Demand");
  lines.push("");
  if (research.summary.unmappedKeywords.length === 0) {
    lines.push("No high-value unmapped keywords were found in this refresh.");
  } else {
    for (const item of research.summary.unmappedKeywords.slice(0, 12)) {
      lines.push(`- ${item.keyword}: ${formatNumber(item.combinedSearchVolume)} combined searches, ${formatMoney(item.maxCpc)} CPC`);
    }
  }
  lines.push("");
  lines.push("## Notes");
  lines.push("");
  lines.push("- The live refresh is intended to keep Trim Proof focused on the highest-volume print-production and proof-generation queries that match the product.");
  lines.push("- Unmapped high-volume terms are the best signals for future page expansion.");
  lines.push("- The repository already covers the main supported starter products: flyers, posters, brochures, business cards, postcards, and letterhead.");
  return `${lines.join("\n")}\n`;
}

async function main() {
  const login = firstValue(process.env.DATAFORSEO_LOGIN);
  const password = firstValue(process.env.DATAFORSEO_PASSWORD);
  if (!login || !password) {
    throw new Error("Set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD before running the refresh script.");
  }

  const credentials = Buffer.from(`${login}:${password}`).toString("base64");
  const keywordLookup = buildToolPageKeywordLookup(toolPages);
  const keywords = normalizeKeywordList([
    ...toolPages.flatMap((page) => page.keywords),
    ...extraKeywords
  ]);

  const rows: DataForSeoKeywordRow[] = [];
  for (const location of locations) {
    for (const keywordBatch of chunk(keywords, 1000)) {
      const results = await postSearchVolume(credentials, location, keywordBatch);
      for (const result of results) {
        const matchingPage = keywordLookup.get(result.keyword.trim().toLowerCase());
        rows.push({
          keyword: result.keyword,
          locationName: location.locationName,
          locationCode: result.location_code,
          countryCode: location.countryCode,
          languageCode: result.language_code,
          searchPartners: result.search_partners,
          searchVolume: result.search_volume,
          competition: result.competition,
          competitionIndex: result.competition_index,
          lowTopOfPageBid: result.low_top_of_page_bid ?? null,
          highTopOfPageBid: result.high_top_of_page_bid ?? null,
          cpc: result.cpc ?? null,
          monthlySearches: (result.monthly_searches ?? []).map((item) => ({
            year: item.year,
            month: item.month,
            searchVolume: item.search_volume
          })),
          pageSlug: matchingPage?.slug,
          pageTitle: matchingPage?.title,
          pageType: matchingPage?.pageType
        });
      }
    }
  }

  const summary = buildDataForSeoSummary(rows);
  const research: DataForSeoResearchFile = {
    generatedAt: new Date().toISOString(),
    source: {
      provider: "DataForSEO",
      endpoint,
      searchPartners: false,
      languageName: "English",
      locations: locations.map((location) => ({
        label: location.label,
        countryCode: location.countryCode,
        locationName: location.locationName,
        locationCode: location.locationCode
      }))
    },
    rows,
    summary
  };

  await mkdir(path.dirname(jsonOutputPath), { recursive: true });
  await mkdir(path.dirname(markdownOutputPath), { recursive: true });
  await writeFile(jsonOutputPath, `${JSON.stringify(research, null, 2)}\n`, "utf8");
  await writeFile(markdownOutputPath, renderMarkdown(research), "utf8");

  console.log(
    JSON.stringify(
      {
        generatedAt: research.generatedAt,
        keywords: summary.totalKeywords,
        rows: summary.totalRows,
        totalSearchVolume: summary.totalSearchVolume,
        topPages: summary.topPages.slice(0, 5).map((page) => ({
          pageSlug: page.pageSlug,
          combinedSearchVolume: page.combinedSearchVolume
        })),
        unmappedKeywords: summary.unmappedKeywords.slice(0, 5).map((item) => ({
          keyword: item.keyword,
          combinedSearchVolume: item.combinedSearchVolume
        }))
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
