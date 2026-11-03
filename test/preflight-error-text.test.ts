import { beforeEach, describe, expect, it, vi } from "vitest";
import { runPreflight } from "@/lib/print/preflight";
import { publicPreflightReport } from "@/lib/print/proof";

const leak = "Command failed: pdfinfo -box /srv/jobs/user_1/job.pdf\nsk_live_abc123";

const mocks = vi.hoisted(() => ({ convert: vi.fn() }));

vi.mock("node:child_process", () => ({
  execFile: (_command: string, _args: string[], _options: unknown, callback: (error: Error | null, result?: unknown) => void) => {
    callback(new Error(leak));
  }
}));
vi.mock("@/lib/print/ghostscript", () => ({ convertToPdfX: mocks.convert }));

describe("preflight failures", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("report fixed evidence for tool and Ghostscript errors, never the raw command text", async () => {
    mocks.convert.mockResolvedValue({ available: true, error: leak, command: ["gs"], stdout: "", stderr: leak });
    const report = await runPreflight("/tmp/in.pdf", { productType: "business_card", printProfile: "USWebCoatedSWOP", pdfxLevel: "PDF/X-1a:2001" }, "/tmp");

    const evidence = report.checks.map((check) => check.evidence).join("\n");
    expect(evidence).not.toMatch(/Command failed|sk_live|\/srv\/jobs/);
    expect(report.checks.find((check) => check.id === "pdfinfo")?.evidence).toBe("pdfinfo could not inspect the PDF.");
    expect(report.checks.find((check) => check.id === "pdffonts")?.evidence).toBe("pdffonts could not inspect the PDF.");
    expect(report.checks.find((check) => check.id === "ghostscript_pdfx")?.evidence).toBe("PDF/X conversion did not complete.");
    expect(JSON.stringify(publicPreflightReport(report))).not.toMatch(/sk_live/);
  });
});
