import { AlertTriangle, Globe2, Layers3, Search, TrendingUp, type LucideIcon } from "lucide-react";
import { buildDataForSeoSerpSummary, normalizeSerpDomain, type DataForSeoSerpFile } from "@/lib/seo/dataforseo-serp";
import type { DataForSeoResearchFile } from "@/lib/seo/dataforseo-research";
import { keywordTakeaway } from "@/lib/seo/serp-takeaways";

function number(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function money(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "n/a";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value);
}

function percent(value: number) {
  return `${Math.round(value * 1000) / 10}%`;
}

function date(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  tone = "neutral"
}: {
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: "neutral" | "brand" | "success" | "warn";
}) {
  const iconTone = tone === "brand" ? "text-brand" : tone === "success" ? "text-success" : tone === "warn" ? "text-warning" : "text-accent";

  return (
    <article className="rounded-[8px] border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-muted">{title}</p>
          <p className="mt-2 font-display text-2xl font-bold text-surface-ink">{value}</p>
        </div>
        <Icon aria-hidden className={`h-5 w-5 ${iconTone}`} />
      </div>
      <p className="mt-3 text-sm leading-5 text-muted">{detail}</p>
    </article>
  );
}

export function SeoResearchSection({ research, serpResearch }: { research?: DataForSeoResearchFile; serpResearch?: DataForSeoSerpFile }) {
  if (!research) {
    return (
      <div className="rounded-[8px] border border-border bg-surface p-4 text-sm text-muted">
        Live DataForSEO research is not available yet. Run <span className="font-mono text-surface-ink">npm run seo:dataforseo-refresh</span> to populate the North America keyword dataset.
      </div>
    );
  }

  const unmappedSearchVolume = research.summary.unmappedKeywords.reduce((total, item) => total + item.combinedSearchVolume, 0);
  const mappedSearchVolume = research.summary.totalSearchVolume - unmappedSearchVolume;
  const mappedKeywords = research.summary.totalKeywords - research.summary.unmappedKeywords.length;
  const mappedKeywordRate = research.summary.totalKeywords ? mappedKeywords / research.summary.totalKeywords : 0;
  const mappedVolumeRate = research.summary.totalSearchVolume ? mappedSearchVolume / research.summary.totalSearchVolume : 0;
  const topOpportunity = research.summary.unmappedKeywords[0];
  const topPage = research.summary.topPages[0];
  const topKeywords = research.summary.topKeywords.slice(0, 12);
  const topPages = research.summary.topPages.slice(0, 8);
  const deferredKeywords = research.summary.unmappedKeywords.slice(0, 8);
  const serpSummary = serpResearch ? buildDataForSeoSerpSummary(serpResearch) : undefined;

  return (
    <div className="grid gap-4">
      <div className="rounded-[8px] border border-border bg-surface p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
          <div>
            <p className="text-xs font-semibold uppercase text-brand">Live research</p>
            <h3 className="mt-2 font-display text-2xl font-bold text-surface-ink">North America keyword coverage</h3>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
              Refreshed {date(research.generatedAt)} from DataForSEO live search volume across the United States and Canada. The supported starter-product pages already capture the biggest demand pools, including menu, and any remaining unmapped terms are smaller residual gaps.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[8px] border border-border bg-background p-3">
              <p className="text-[11px] font-semibold uppercase text-muted">Locations</p>
              <p className="mt-2 font-display text-xl font-bold text-surface-ink">US + Canada</p>
              <p className="mt-1 text-sm text-muted">Search partners disabled</p>
            </div>
            <div className="rounded-[8px] border border-border bg-background p-3">
              <p className="text-[11px] font-semibold uppercase text-muted">Pages mapped</p>
              <p className="mt-2 font-display text-xl font-bold text-surface-ink">{number(research.summary.topPages.length)}</p>
              <p className="mt-1 text-sm text-muted">{number(research.summary.totalKeywords)} keyword variants tracked</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard detail="Exact keyword variants grouped across US and Canada" icon={Search} title="Tracked keywords" tone="brand" value={number(research.summary.totalKeywords)} />
        <MetricCard detail="Combined live search volume across both countries" icon={Globe2} title="Combined volume" value={number(research.summary.totalSearchVolume)} />
        <MetricCard detail={`${number(mappedKeywords)} mapped variants · ${percent(mappedKeywordRate)} of keywords`} icon={TrendingUp} title="Mapped volume" tone="success" value={number(mappedSearchVolume)} />
        <MetricCard detail={`${number(research.summary.unmappedKeywords.length)} unmapped variants · ${percent(mappedVolumeRate)} of volume mapped`} icon={Layers3} title="Unmapped volume" tone="warn" value={number(unmappedSearchVolume)} />
      </div>

      {topOpportunity ? (
        <div className="rounded-[8px] border border-warning/30 bg-warning/10 p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle aria-hidden className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-wide">Remaining gap</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-surface-ink">
                The biggest remaining unmapped keyword family is <span className="font-semibold">{topOpportunity.keyword}</span> at {number(topOpportunity.combinedSearchVolume)} combined searches with {money(topOpportunity.maxCpc)} CPC. Keep this cluster out of the supported starter-product set until there is a matching page.
              </p>
            </div>
            {topPage ? (
              <div className="rounded-[8px] border border-warning/30 bg-background px-3 py-2 text-sm text-muted">
                <p className="text-[11px] font-semibold uppercase text-muted">Strongest mapped page</p>
                <p className="mt-1 font-semibold text-surface-ink">{topPage.pageTitle}</p>
                <p className="text-xs text-muted">{number(topPage.combinedSearchVolume)} combined searches</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.95fr]">
        <div className="rounded-[8px] border border-border bg-surface">
          <div className="flex flex-col gap-2 border-b border-border px-4 py-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-muted">Top keywords</p>
              <h4 className="font-display text-xl font-bold text-surface-ink">Highest-volume North America terms</h4>
            </div>
            <p className="text-sm text-muted">Grouped by exact keyword across US and Canada</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-sm">
              <thead className="bg-surface-strong text-left text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-3">Keyword</th>
                  <th className="px-3 py-3">US</th>
                  <th className="px-3 py-3">CA</th>
                  <th className="px-3 py-3">Combined</th>
                  <th className="px-3 py-3">CPC</th>
                  <th className="px-3 py-3">Competition</th>
                  <th className="px-3 py-3">Target</th>
                </tr>
              </thead>
              <tbody>
                {topKeywords.map((item) => (
                  <tr className="border-t border-border" key={item.keyword}>
                    <td className="px-3 py-3 font-medium text-surface-ink">{item.keyword}</td>
                    <td className="px-3 py-3">{number(item.usSearchVolume)}</td>
                    <td className="px-3 py-3">{number(item.caSearchVolume)}</td>
                    <td className="px-3 py-3 font-semibold">{number(item.combinedSearchVolume)}</td>
                    <td className="px-3 py-3">{money(item.maxCpc)}</td>
                    <td className="px-3 py-3">{item.competition}</td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-surface-ink">{item.pageTitle ?? "Unmapped"}</div>
                      {item.pageSlug ? <div className="font-mono text-[11px] text-muted">{item.pageSlug}</div> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-[8px] border border-border bg-surface">
          <div className="flex flex-col gap-2 border-b border-border px-4 py-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-muted">Top pages</p>
              <h4 className="font-display text-xl font-bold text-surface-ink">Supported pages with the most demand</h4>
            </div>
            <p className="text-sm text-muted">All pages already mapped from live research</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead className="bg-surface-strong text-left text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-3">Page</th>
                  <th className="px-3 py-3">Slug</th>
                  <th className="px-3 py-3">Combined</th>
                  <th className="px-3 py-3">Keywords</th>
                  <th className="px-3 py-3">Top terms</th>
                </tr>
              </thead>
              <tbody>
                {topPages.map((page) => (
                  <tr className="border-t border-border" key={page.pageSlug}>
                    <td className="px-3 py-3">
                      <div className="font-medium text-surface-ink">{page.pageTitle}</div>
                      {page.pageType ? <div className="text-xs uppercase tracking-wide text-muted">{page.pageType}</div> : null}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-muted">{page.pageSlug}</td>
                    <td className="px-3 py-3 font-semibold">{number(page.combinedSearchVolume)}</td>
                    <td className="px-3 py-3">{number(page.keywordCount)}</td>
                    <td className="px-3 py-3 text-muted">{page.topKeywords.slice(0, 3).join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {serpSummary ? (
        <div className="grid gap-4 rounded-[8px] border border-border bg-surface p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-brand">Page-one competition</p>
              <h4 className="font-display text-xl font-bold text-surface-ink">Who owns the SERP</h4>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-muted">
                The snapshot splits into three clear lanes: generic AI design queries are dominated by Adobe, Canva, Design.com, Template.net, and Venngage; postcard, brochure, letterhead, and menu template queries lean on Word, Canva, printer templates, and smaller libraries; and print-prepress questions lean on Adobe help, Reddit, and niche PDF or printer tools. Trim Proof should keep the checked print-handoff wedge in every lane.
              </p>
            </div>
            <p className="text-sm text-muted">{serpSummary.totalSnapshots} tracked keywords · {serpSummary.market}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {serpSummary.topDomains.slice(0, 4).map((domain) => (
              <article className="rounded-[8px] border border-border bg-background p-3" key={domain.domain}>
                <p className="text-[11px] font-semibold uppercase text-muted">{normalizeSerpDomain(domain.domain)}</p>
                <p className="mt-2 font-display text-xl font-bold text-surface-ink">{number(domain.appearances)} page-one hits</p>
                <p className="mt-1 text-sm text-muted">Best rank #{domain.bestRank} · {domain.keywords.slice(0, 2).join(" · ")}</p>
              </article>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead className="bg-surface-strong text-left text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-3">Keyword</th>
                  <th className="px-3 py-3">Page-one domains</th>
                  <th className="px-3 py-3">Takeaway</th>
                </tr>
              </thead>
              <tbody>
                {serpSummary.snapshots.map((snapshot) => (
                  <tr className="border-t border-border" key={snapshot.keyword}>
                    <td className="px-3 py-3 font-medium text-surface-ink">{snapshot.keyword}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {snapshot.topResults.map((result) => (
                          <span className="rounded-[999px] border border-border bg-surface px-2 py-1 font-mono text-[11px] text-muted" key={`${snapshot.keyword}-${result.rank_group}-${result.domain}`}>
                            #{result.rank_group} {normalizeSerpDomain(result.domain)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-muted">{keywordTakeaway(snapshot.keyword)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {deferredKeywords.length ? (
        <div className="rounded-[8px] border border-border bg-surface">
          <div className="flex flex-col gap-2 border-b border-border px-4 py-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-muted">Remaining opportunities</p>
              <h4 className="font-display text-xl font-bold text-surface-ink">Unmapped demand to keep on the watchlist</h4>
            </div>
            <p className="text-sm text-muted">Do not publish these as supported products yet</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-sm">
              <thead className="bg-surface-strong text-left text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-3">Keyword</th>
                  <th className="px-3 py-3">US</th>
                  <th className="px-3 py-3">CA</th>
                  <th className="px-3 py-3">Combined</th>
                  <th className="px-3 py-3">CPC</th>
                  <th className="px-3 py-3">Competition</th>
                  <th className="px-3 py-3">Why unmapped</th>
                </tr>
              </thead>
              <tbody>
                {deferredKeywords.map((item) => (
                  <tr className="border-t border-border" key={item.keyword}>
                    <td className="px-3 py-3 font-medium text-surface-ink">{item.keyword}</td>
                    <td className="px-3 py-3">{number(item.usSearchVolume)}</td>
                    <td className="px-3 py-3">{number(item.caSearchVolume)}</td>
                    <td className="px-3 py-3 font-semibold">{number(item.combinedSearchVolume)}</td>
                    <td className="px-3 py-3">{money(item.maxCpc)}</td>
                    <td className="px-3 py-3">{item.competition}</td>
                    <td className="px-3 py-3 text-muted">No supported page mapped yet.</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-[8px] border border-success/30 bg-success/10 p-4 text-sm font-semibold text-success">
          All tracked keyword families are mapped to supported pages.
        </div>
      )}

      <div className="rounded-[8px] border border-border bg-background px-4 py-4 text-sm leading-6 text-muted">
        <p>
          Supported coverage: {number(research.summary.topPages.length)} mapped pages, {number(research.summary.totalKeywords)} keyword variants, {number(research.summary.totalSearchVolume)} combined searches, and {percent(mappedVolumeRate)} of the tracked search volume already mapped to a page.
        </p>
      </div>
    </div>
  );
}
