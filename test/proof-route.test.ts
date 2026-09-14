import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/exports/proof/route";
import { canServeProofFile, deliveryManifestFileName } from "@/lib/print/delivery-manifest";
import type { PaidCheckoutSession } from "@/lib/billing/paid-session";
import type { PreflightStatus } from "@/lib/print/preflight";

const mocks = vi.hoisted(() => ({
  generateProof: vi.fn(),
  analytics: vi.fn(),
  verifyPaidCheckoutSession: vi.fn(),
  claimExportCredit: vi.fn(),
  claimSubscriptionExport: vi.fn(),
  finalizeExportCredit: vi.fn(),
  finalizeSubscriptionExport: vi.fn(),
  releaseExportCredit: vi.fn(),
  releaseSubscriptionExport: vi.fn()
}));

vi.mock("@/lib/auth/account-server", () => ({
  getAccountSessionFromCookies: () => ({ userId: "user_test", email: "buyer@example.com" })
}));
vi.mock("@/lib/security/request", () => ({
  checkRateLimit: () => ({ allowed: true }),
  getRequestIp: () => "127.0.0.1",
  rateLimitResponse: vi.fn()
}));
vi.mock("@/lib/billing/paid-session", () => mocks);
vi.mock("@/lib/analytics/server-events", () => ({ sendServerAnalyticsEvent: mocks.analytics }));
vi.mock("@/lib/print/proof", () => ({
  generateProof: mocks.generateProof,
  publicPreflightReport: (report: { pdfPath: string; status: PreflightStatus }) => ({ ...report, pdfPath: path.basename(report.pdfPath) })
}));

let generatedRoot: string;
let outputDir: string;
let reportStatus: PreflightStatus;
let missingArtifact: boolean;

function request(mode: "advanced" | "dummy" = "advanced") {
  return new Request("https://trimproof.com/api/exports/proof", {
    method: "POST",
    body: JSON.stringify({ mode, checkoutSessionId: "cs_paid" })
  });
}

function useEntitlement(entitlement: PaidCheckoutSession["entitlement"]) {
  mocks.verifyPaidCheckoutSession.mockResolvedValue({ id: "cs_paid", entitlement, mode: entitlement === "subscription" ? "subscription" : "payment" });
  return entitlement === "subscription"
    ? { claim: mocks.claimSubscriptionExport, finalize: mocks.finalizeSubscriptionExport, release: mocks.releaseSubscriptionExport }
    : { claim: mocks.claimExportCredit, finalize: mocks.finalizeExportCredit, release: mocks.releaseExportCredit };
}

describe("proof export delivery and allowance", () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    generatedRoot = await fs.mkdtemp(path.join(os.tmpdir(), "trimproof-route-"));
    vi.stubEnv("TRIMPROOF_GENERATED_DIR", generatedRoot);
    reportStatus = "passed";
    missingArtifact = false;
    useEntitlement("export_credit");
    mocks.analytics.mockResolvedValue({ status: "skipped", configured: false, provider: "ga4_measurement_protocol" });
    mocks.generateProof.mockImplementation(async (_spec, directory: string) => {
      outputDir = directory;
      await fs.mkdir(directory, { recursive: true });
      const sourcePdfPath = path.join(directory, "pressforge-business-card.source.pdf");
      const pdfPath = path.join(directory, "pressforge-business-card.pdfx.pdf");
      const svgMasterPath = path.join(directory, "pressforge-business-card.master.svg");
      const reportPath = path.join(directory, "preflight-report.json");
      const report = { status: reportStatus, pdfPath, printProfile: "us_web_coated_swop", pdfxLevel: "PDF/X-1a", checks: [] };
      await Promise.all([sourcePdfPath, pdfPath, reportPath, ...(missingArtifact ? [] : [svgMasterPath])].map((filePath) => fs.writeFile(filePath, "test artifact")));
      return { outputDir: directory, sourcePdfPath, svgMasterPath, reportPath, report, assets: [] };
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    await fs.rm(generatedRoot, { recursive: true, force: true });
  });

  for (const entitlement of ["export_credit", "subscription"] as const) {
    describe(entitlement, () => {
      it.each(["failed", "needs_attention"] as const)("rejects %s preflight and restores the allowance", async (status) => {
        const billing = useEntitlement(entitlement);
        reportStatus = status;
        const response = await POST(request());
        const result = await response.json();

        expect(response.status).toBe(422);
        expect(result).toMatchObject({ mode: "advanced", productionDownloadLocked: true, report: { status }, error: expect.stringContaining("restored"), reportUrl: expect.stringContaining("preflight-report.json") });
        expect(result).not.toHaveProperty("downloadUrl");
        expect(result).not.toHaveProperty("sourceUrl");
        expect(result).not.toHaveProperty("svgUrl");
        expect(billing.claim).toHaveBeenCalledOnce();
        expect(billing.finalize).not.toHaveBeenCalled();
        expect(billing.release).toHaveBeenCalledOnce();
        expect(billing.release.mock.calls[0].at(-1)).toBe(false);
        expect(mocks.analytics).not.toHaveBeenCalled();
        await expect(canServeProofFile(outputDir, "pressforge-business-card.pdfx.pdf", "user_test")).resolves.toBe(false);
        await expect(canServeProofFile(outputDir, "preflight-report.json", "user_test")).resolves.toBe(true);
      });

      it("unlocks a passed proof and consumes its allowance once", async () => {
        const billing = useEntitlement(entitlement);
        const response = await POST(request());
        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({ productionDownloadLocked: false, report: { status: "passed" }, downloadUrl: expect.stringContaining("pdfx.pdf"), sourceUrl: expect.stringContaining("source.pdf"), svgUrl: expect.stringContaining("master.svg") });
        expect(billing.finalize).toHaveBeenCalledOnce();
        expect(billing.release).not.toHaveBeenCalled();
        await expect(canServeProofFile(outputDir, "pressforge-business-card.pdfx.pdf", "user_test")).resolves.toBe(true);
      });

      it("restores the allowance when generation throws", async () => {
        const billing = useEntitlement(entitlement);
        mocks.generateProof.mockRejectedValue(new Error("Render failed"));
        const response = await POST(request());
        expect(response.status).toBe(500);
        expect(billing.finalize).not.toHaveBeenCalled();
        expect(billing.release).toHaveBeenCalledOnce();
      });

      it("does not consume an allowance when a promised output is missing", async () => {
        const billing = useEntitlement(entitlement);
        missingArtifact = true;
        const response = await POST(request());
        expect(response.status).toBe(500);
        expect(billing.finalize).not.toHaveBeenCalled();
        expect(billing.release).toHaveBeenCalledOnce();
        await expect(canServeProofFile(outputDir, "pressforge-business-card.pdfx.pdf", "user_test")).resolves.toBe(false);
      });

      it("restores the allowance when the delivery manifest cannot be written", async () => {
        const billing = useEntitlement(entitlement);
        const originalWrite = fs.writeFile;
        vi.spyOn(fs, "writeFile").mockImplementation((file, ...args) => {
          if (String(file).endsWith(deliveryManifestFileName)) return Promise.reject(new Error("Disk full"));
          return originalWrite(file, ...args);
        });
        const response = await POST(request());
        expect(response.status).toBe(500);
        expect(billing.finalize).not.toHaveBeenCalled();
        expect(billing.release).toHaveBeenCalledOnce();
        await expect(canServeProofFile(outputDir, "pressforge-business-card.pdfx.pdf", "user_test")).resolves.toBe(false);
      });

      it("removes delivery access and releases the reservation when finalization fails", async () => {
        const billing = useEntitlement(entitlement);
        billing.finalize.mockRejectedValue(new Error("Finalize failed"));
        const response = await POST(request());
        expect(response.status).toBe(500);
        expect(billing.release).toHaveBeenCalledOnce();
        expect(billing.release.mock.calls[0].at(-1)).toBe(true);
        expect(mocks.analytics).not.toHaveBeenCalled();
        await expect(canServeProofFile(outputDir, "pressforge-business-card.pdfx.pdf", "user_test")).resolves.toBe(false);
      });

      it("reports a failed release without claiming the allowance was restored", async () => {
        const billing = useEntitlement(entitlement);
        reportStatus = "failed";
        billing.release.mockRejectedValue(new Error("Database unavailable"));
        vi.spyOn(console, "error").mockImplementation(() => {});
        const response = await POST(request());
        expect(response.status).toBe(500);
        await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining("could not be restored"), jobId: expect.any(String) });
        expect(billing.finalize).not.toHaveBeenCalled();
        await expect(canServeProofFile(outputDir, "pressforge-business-card.pdfx.pdf", "user_test")).resolves.toBe(false);
      });
    });
  }

  it.each(["passed", "failed", "needs_attention"] as const)("keeps %s demos inspectable without spending credits", async (status) => {
    reportStatus = status;
    const response = await POST(request("dummy"));
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result).toMatchObject({ productionDownloadLocked: true, demoArtWatermarked: true, report: { status } });
    expect(result).not.toHaveProperty("downloadUrl");
    expect(mocks.verifyPaidCheckoutSession).not.toHaveBeenCalled();
    expect(mocks.claimExportCredit).not.toHaveBeenCalled();
    expect(mocks.claimSubscriptionExport).not.toHaveBeenCalled();
    expect(mocks.finalizeExportCredit).not.toHaveBeenCalled();
    expect(mocks.finalizeSubscriptionExport).not.toHaveBeenCalled();
    await expect(canServeProofFile(outputDir, "preflight-report.json", "user_test")).resolves.toBe(true);
    await expect(canServeProofFile(outputDir, "pressforge-business-card.pdfx.pdf", "user_test")).resolves.toBe(false);
  });

  it("delivers the successful export even when analytics throws", async () => {
    mocks.analytics.mockRejectedValue(new Error("Analytics network failure"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await POST(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ productionDownloadLocked: false, analytics: { status: "failed" } });
    expect(mocks.finalizeExportCredit).toHaveBeenCalledOnce();
    expect(mocks.releaseExportCredit).not.toHaveBeenCalled();
  });
});
