export interface DataForSeoSerpItem {
  rank_group: number;
  title: string;
  url: string;
  domain: string;
  description: string | null;
}

export interface DataForSeoSerpSnapshot {
  keyword: string;
  se_domain: string;
  check_url: string;
  items: DataForSeoSerpItem[];
}

export interface DataForSeoSerpFile {
  generatedAt: string;
  market: string;
  regeneratedSparseAt?: string;
  snapshots: DataForSeoSerpSnapshot[];
}

export interface DataForSeoSerpKeywordSummary {
  keyword: string;
  topResults: DataForSeoSerpItem[];
  leadingDomains: string[];
}

export interface DataForSeoSerpDomainSummary {
  domain: string;
  appearances: number;
  bestRank: number;
  keywords: string[];
}

export interface DataForSeoSerpSummary {
  generatedAt: string;
  market: string;
  totalSnapshots: number;
  topDomains: DataForSeoSerpDomainSummary[];
  snapshots: DataForSeoSerpKeywordSummary[];
}

function uniquePush(values: string[], value: string, limit?: number) {
  if (values.includes(value)) {
    return;
  }
  if (typeof limit === "number" && values.length >= limit) {
    return;
  }
  values.push(value);
}

export function normalizeSerpDomain(domain: string) {
  return domain.replace(/^www\./i, "");
}

export function buildDataForSeoSerpSummary(file: DataForSeoSerpFile): DataForSeoSerpSummary {
  const domainSummaries = new Map<string, DataForSeoSerpDomainSummary>();

  const snapshots = file.snapshots.map((snapshot) => {
    const topResults = snapshot.items
      .slice()
      .sort((left, right) => left.rank_group - right.rank_group)
      .slice(0, 5);

    const leadingDomains: string[] = [];

    for (const result of topResults) {
      uniquePush(leadingDomains, normalizeSerpDomain(result.domain), 3);

      const existing = domainSummaries.get(result.domain) ?? {
        domain: result.domain,
        appearances: 0,
        bestRank: Number.POSITIVE_INFINITY,
        keywords: []
      };
      existing.appearances += 1;
      existing.bestRank = Math.min(existing.bestRank, result.rank_group);
      uniquePush(existing.keywords, snapshot.keyword, 4);
      domainSummaries.set(result.domain, existing);
    }

    return {
      keyword: snapshot.keyword,
      topResults,
      leadingDomains
    } satisfies DataForSeoSerpKeywordSummary;
  });

  const topDomains = [...domainSummaries.values()]
    .map((item) => ({
      ...item,
      bestRank: Number.isFinite(item.bestRank) ? item.bestRank : 0
    }))
    .sort((left, right) => {
      if (right.appearances !== left.appearances) {
        return right.appearances - left.appearances;
      }
      if (left.bestRank !== right.bestRank) {
        return left.bestRank - right.bestRank;
      }
      return left.domain.localeCompare(right.domain);
    });

  return {
    generatedAt: file.generatedAt,
    market: file.market,
    totalSnapshots: file.snapshots.length,
    topDomains,
    snapshots
  };
}
