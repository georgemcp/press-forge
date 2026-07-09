import fs from "node:fs/promises";
import path from "node:path";
import { PRODUCT_PROFILES } from "./constants";
import type { PreflightReport, PreflightStatus } from "./preflight";

export const preflightReportJsonFileName = "preflight-report.json";
export const preflightReportHtmlFileName = "preflight-report.html";
export const preflightReportTextFileName = "preflight-report.txt";

export interface PreflightReportCounts {
  passed: number;
  needsAttention: number;
  failed: number;
  total: number;
}

export interface PreflightReportSummary {
  status: PreflightStatus;
  statusLabel: string;
  productLabel: string;
  counts: PreflightReportCounts;
  recommendation: string;
}

export interface PreflightReportFiles {
  jsonPath: string;
  htmlPath: string;
  textPath: string;
}

const statusLabels: Record<PreflightStatus, string> = {
  passed: "Passed",
  needs_attention: "Needs attention",
  failed: "Failed"
};

function formatProductLabel(productType: PreflightReport["productType"]) {
  return PRODUCT_PROFILES[productType]?.label ?? productType.replaceAll("_", " ");
}

export function getPreflightReportCounts(report: Pick<PreflightReport, "checks">): PreflightReportCounts {
  const counts = report.checks.reduce(
    (total, check) => {
      if (check.status === "passed") {
        total.passed += 1;
      } else if (check.status === "needs_attention") {
        total.needsAttention += 1;
      } else {
        total.failed += 1;
      }
      total.total += 1;
      return total;
    },
    { passed: 0, needsAttention: 0, failed: 0, total: 0 }
  );
  return counts;
}

export function getPreflightReportSummary(report: PreflightReport): PreflightReportSummary {
  const counts = getPreflightReportCounts(report);
  const recommendation =
    report.status === "passed"
      ? "Ready for a production-oriented PDF/X handoff for the selected profile. Send this report with the proof if the printer wants the check summary."
      : report.status === "needs_attention"
        ? "Review the attention items before using this proof for production. A production specialist may still accept or adjust the file."
        : "Do not use this proof for production until the failed checks are resolved.";

  return {
    status: report.status,
    statusLabel: statusLabels[report.status],
    productLabel: formatProductLabel(report.productType),
    counts,
    recommendation
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function scrubPreflightEvidence(value: string) {
  return value
    .replace(/[A-Za-z]:\\(?:[^\\/:*?"<>|\r\n]+\\)*([^\\/:*?"<>|\r\n]+\.[A-Za-z0-9.]+)/g, "$1")
    .replace(/(?:\/[^\s|;:,<>"']+)+\/([^/\s|;:,<>"']+\.[A-Za-z0-9.]+)/g, "$1")
    .trim();
}

function statusClass(status: PreflightStatus) {
  if (status === "passed") {
    return "passed";
  }
  if (status === "needs_attention") {
    return "attention";
  }
  return "failed";
}

function renderCheckRows(report: PreflightReport) {
  return report.checks
    .map((check) => {
      const status = statusLabels[check.status];
      const evidence = scrubPreflightEvidence(check.evidence);
      return `<tr>
        <td>${escapeHtml(check.label)}</td>
        <td><span class="status ${statusClass(check.status)}">${escapeHtml(status)}</span></td>
        <td>${escapeHtml(evidence)}</td>
      </tr>`;
    })
    .join("\n");
}

export function renderPreflightReportHtml(report: PreflightReport) {
  const summary = getPreflightReportSummary(report);
  const outputFile = path.basename(report.pdfxPath ?? report.pdfPath);
  const generatedAt = Number.isNaN(Date.parse(report.generatedAt)) ? report.generatedAt : new Date(report.generatedAt).toISOString();

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Trim Proof preflight report</title>
  <style>
    :root {
      color-scheme: light;
      --ink: oklch(0.23 0.022 248);
      --muted: oklch(0.48 0.026 248);
      --paper: oklch(0.99 0.006 88);
      --line: oklch(0.86 0.018 248);
      --brand: oklch(0.54 0.17 164);
      --warn: oklch(0.63 0.16 73);
      --danger: oklch(0.55 0.19 30);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--paper);
      color: var(--ink);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.5;
    }
    main {
      width: min(980px, calc(100% - 32px));
      margin: 0 auto;
      padding: 40px 0;
    }
    h1, h2, p { margin: 0; }
    h1 { font-size: 32px; line-height: 1.1; letter-spacing: 0; }
    h2 { margin-top: 28px; font-size: 18px; letter-spacing: 0; }
    .lede { margin-top: 10px; color: var(--muted); font-weight: 650; }
    .summary {
      margin-top: 24px;
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    }
    .metric, .recommendation {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: white;
      padding: 14px;
    }
    .metric span { display: block; color: var(--muted); font-size: 12px; font-weight: 750; text-transform: uppercase; }
    .metric strong { display: block; margin-top: 4px; font-size: 18px; }
    .recommendation { margin-top: 14px; }
    .status {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      border-radius: 999px;
      padding: 2px 9px;
      font-size: 12px;
      font-weight: 800;
      white-space: nowrap;
    }
    .passed { background: oklch(0.95 0.052 164); color: oklch(0.37 0.13 164); }
    .attention { background: oklch(0.96 0.07 73); color: oklch(0.43 0.12 73); }
    .failed { background: oklch(0.95 0.055 30); color: oklch(0.42 0.15 30); }
    table {
      width: 100%;
      margin-top: 12px;
      border-collapse: collapse;
      border: 1px solid var(--line);
      background: white;
      border-radius: 8px;
      overflow: hidden;
    }
    th, td {
      padding: 11px 12px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
      font-size: 14px;
    }
    th { color: var(--muted); font-size: 12px; text-transform: uppercase; }
    tr:last-child td { border-bottom: 0; }
    footer { margin-top: 28px; color: var(--muted); font-size: 12px; }
  </style>
</head>
<body>
  <main>
    <h1>Trim Proof preflight report</h1>
    <p class="lede">${escapeHtml(summary.productLabel)} - ${escapeHtml(summary.statusLabel)} - generated ${escapeHtml(generatedAt)}</p>
    <section class="summary" aria-label="Preflight summary">
      <div class="metric"><span>Status</span><strong><span class="status ${statusClass(summary.status)}">${escapeHtml(summary.statusLabel)}</span></strong></div>
      <div class="metric"><span>Output</span><strong>${escapeHtml(outputFile)}</strong></div>
      <div class="metric"><span>PDF/X target</span><strong>${escapeHtml(report.pdfxLevel)}</strong></div>
      <div class="metric"><span>Print profile</span><strong>${escapeHtml(report.printProfile)}</strong></div>
      <div class="metric"><span>Checks passed</span><strong>${summary.counts.passed}/${summary.counts.total}</strong></div>
      <div class="metric"><span>Needs review</span><strong>${summary.counts.needsAttention + summary.counts.failed}</strong></div>
    </section>
    <section class="recommendation" aria-label="Recommendation">
      <p>${escapeHtml(summary.recommendation)}</p>
    </section>
    <h2>Checks</h2>
    <table>
      <thead>
        <tr>
          <th scope="col">Check</th>
          <th scope="col">Status</th>
          <th scope="col">Evidence</th>
        </tr>
      </thead>
      <tbody>
        ${renderCheckRows(report)}
      </tbody>
    </table>
    <footer>
      This report summarizes automated checks for a supported Trim Proof proof. It is not a guarantee that every printer, RIP, or production workflow will accept the file unchanged.
    </footer>
  </main>
</body>
</html>
`;
}

export function renderPreflightReportText(report: PreflightReport) {
  const summary = getPreflightReportSummary(report);
  const lines = [
    "Trim Proof preflight report",
    `Status: ${summary.statusLabel}`,
    `Product: ${summary.productLabel}`,
    `Generated: ${report.generatedAt}`,
    `Output: ${path.basename(report.pdfxPath ?? report.pdfPath)}`,
    `PDF/X target: ${report.pdfxLevel}`,
    `Print profile: ${report.printProfile}`,
    `Checks passed: ${summary.counts.passed}/${summary.counts.total}`,
    `Needs review: ${summary.counts.needsAttention + summary.counts.failed}`,
    "",
    summary.recommendation,
    "",
    "Checks:"
  ];

  for (const check of report.checks) {
    lines.push(`- ${statusLabels[check.status]}: ${check.label} - ${scrubPreflightEvidence(check.evidence)}`);
  }

  lines.push(
    "",
    "This report summarizes automated checks for a supported Trim Proof proof. It is not a guarantee that every printer, RIP, or production workflow will accept the file unchanged."
  );

  return `${lines.join("\n")}\n`;
}

export async function writePreflightReportFiles(outputDir: string, report: PreflightReport): Promise<PreflightReportFiles> {
  const jsonPath = path.join(outputDir, preflightReportJsonFileName);
  const htmlPath = path.join(outputDir, preflightReportHtmlFileName);
  const textPath = path.join(outputDir, preflightReportTextFileName);

  await Promise.all([
    fs.writeFile(jsonPath, JSON.stringify(report, null, 2)),
    fs.writeFile(htmlPath, renderPreflightReportHtml(report)),
    fs.writeFile(textPath, renderPreflightReportText(report))
  ]);

  return {
    jsonPath,
    htmlPath,
    textPath
  };
}
