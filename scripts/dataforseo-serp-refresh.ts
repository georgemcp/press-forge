import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const outputJsonPath = path.join(repoRoot, "docs/seo/dataforseo-serp-refresh-2026-06-12.json");
const endpoint = "https://api.dataforseo.com/v3/serp/google/organic/live/advanced";

const trackedKeywords = [
  "ai flyer generator",
  "ai flyer maker",
  "ai business card generator",
  "postcard template",
  "brochure template",
  "letterhead template",
  "menu maker",
  "free menu maker",
  "menu template",
  "menu pdf template",
  "print ready PDF",
  "convert PDF to CMYK",
  "add bleed to PDF",
  "PDF preflight",
  "PDF/X-1a"
];

interface DataForSeoSerpOrganicItem {
  rank_group: number;
  title: string;
  url: string;
  domain: string;
  description: string | null;
}

interface DataForSeoSerpResponseItem {
  type?: string;
  rank_group?: number;
  title?: string | null;
  url?: string | null;
  domain?: string | null;
  description?: string | null;
}

interface DataForSeoSerpTaskResult {
  keyword: string;
  se_domain: string;
  check_url: string;
  items?: DataForSeoSerpResponseItem[];
}

function firstValue(...values: Array<string | undefined>) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim();
}

async function fetchSerpSnapshot(credentials: string, keyword: string) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify([
      {
        keyword,
        language_code: "en",
        location_code: 2840,
        device: "desktop",
        os: "windows"
      }
    ])
  });

  if (!response.ok) {
    throw new Error(`DataForSEO request failed with HTTP ${response.status} for ${keyword}.`);
  }

  const payload = (await response.json()) as {
    tasks?: Array<{
      status_code?: number;
      status_message?: string;
      result?: DataForSeoSerpTaskResult[];
    }>;
  };

  const task = payload.tasks?.[0];
  if (!task || task.status_code !== 20000) {
    throw new Error(`DataForSEO task for ${keyword} did not complete successfully.`);
  }

  const result = task.result?.[0];
  if (!result) {
    throw new Error(`DataForSEO task for ${keyword} returned no SERP result.`);
  }

  const items = (result.items ?? [])
    .filter((item): item is DataForSeoSerpResponseItem & DataForSeoSerpOrganicItem => {
      return item.type === "organic" && typeof item.rank_group === "number" && typeof item.title === "string" && typeof item.url === "string" && typeof item.domain === "string";
    })
    .sort((left, right) => left.rank_group - right.rank_group)
    .slice(0, 10)
    .map((item) => ({
      rank_group: item.rank_group,
      title: item.title,
      url: item.url,
      domain: item.domain,
      description: item.description ?? null
    })) satisfies DataForSeoSerpOrganicItem[];

  return {
    keyword: result.keyword,
    se_domain: result.se_domain,
    check_url: result.check_url,
    items
  };
}

async function main() {
  const login = firstValue(process.env.DATAFORSEO_LOGIN);
  const password = firstValue(process.env.DATAFORSEO_PASSWORD);
  if (!login || !password) {
    throw new Error("Set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD before running the refresh script.");
  }

  const credentials = Buffer.from(`${login}:${password}`).toString("base64");
  const snapshots = [];

  for (const keyword of trackedKeywords) {
    snapshots.push(await fetchSerpSnapshot(credentials, keyword));
  }

  const research = {
    generatedAt: new Date().toISOString(),
    market: "United States / English",
    regeneratedSparseAt: new Date().toISOString(),
    snapshots
  };

  await mkdir(path.dirname(outputJsonPath), { recursive: true });
  await writeFile(outputJsonPath, `${JSON.stringify(research, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        generatedAt: research.generatedAt,
        market: research.market,
        snapshots: research.snapshots.length,
        keywords: research.snapshots.map((snapshot) => snapshot.keyword)
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
