import { describe, expect, it } from "vitest";
import type { PreflightReport } from "@/lib/print/preflight";
import {
  getPreflightReportSummary,
  renderPreflightReportHtml,
  renderPreflightReportText,
  scrubPreflightEvidence
} from "@/lib/print/preflight-report";

const report: PreflightReport = {
  status: "needs_attention",
  pdfPath: "/tmp/trimproof-job/trimproof-business-card.source.pdf",
  pdfxPath: "/tmp/trimproof-job/trimproof-business-card.pdfx.pdf",
  productType: "business_card",
  printProfile: "USWebCoatedSWOP",
  pdfxLevel: "PDF/X-1a:2001",
  generatedAt: "2026-06-15T12:00:00.000Z",
  ghostscript: {
    available: false,
    error: "Ghostscript is not installed or not on PATH."
  },
  checks: [
    {
      id: "pdf_exists",
      label: "PDF created",
      status: "passed",
      evidence: "/tmp/trimproof-job/trimproof-business-card.pdfx.pdf"
    },
    {
      id: "ghostscript_pdfx",
      label: "Ghostscript PDF/X conversion",
      status: "needs_attention",
      evidence: "Ghostscript needs review <script>alert(1)</script>"
    },
    {
      id: "fonts_embedded",
      label: "Fonts embedded",
      status: "failed",
      evidence: "No font rows were reported by pdffonts."
    }
  ]
};

describe("preflight report rendering", () => {
  it("summarizes status counts and recommendation copy", () => {
    const summary = getPreflightReportSummary(report);

    expect(summary).toMatchObject({
      status: "needs_attention",
      statusLabel: "Needs attention",
      productLabel: "Business card",
      counts: {
        passed: 1,
        needsAttention: 1,
        failed: 1,
        total: 3
      }
    });
    expect(summary.recommendation).toContain("Review the attention items");
  });

  it("renders shareable HTML without leaking local paths or unsafe markup", () => {
    const html = renderPreflightReportHtml(report);

    expect(html).toContain("Trim Proof preflight report");
    expect(html).toContain("trimproof-business-card.pdfx.pdf");
    expect(html).not.toContain("/tmp/trimproof-job");
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("not a guarantee");
  });

  it("renders a plain text summary for printer handoff notes", () => {
    const text = renderPreflightReportText(report);

    expect(text).toContain("Status: Needs attention");
    expect(text).toContain("Checks passed: 1/3");
    expect(text).toContain("Failed: Fonts embedded");
  });

  it("scrubs absolute evidence paths to basenames", () => {
    expect(scrubPreflightEvidence("/var/folders/run/trimproof-poster.pdfx.pdf")).toBe("trimproof-poster.pdfx.pdf");
    expect(scrubPreflightEvidence("Wrote /var/folders/run/trimproof-poster.pdfx.pdf.")).toBe("Wrote trimproof-poster.pdfx.pdf.");
  });
});
