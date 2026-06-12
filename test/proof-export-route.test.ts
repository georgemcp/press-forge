import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/exports/proof/route";

const mocks = vi.hoisted(() => ({
  accountSession: {
    userId: "user_test",
    email: "buyer@example.com"
  } as { userId: string; email: string } | undefined,
  generateProof: vi.fn(async () => ({
    report: {
      status: "pass",
      printProfile: "business-card",
      pdfxLevel: "PDF/X-1a"
    },
    reportPath: "/tmp/job/report.json",
    sourcePdfPath: "/tmp/job/source.pdf",
    svgMasterPath: "/tmp/job/source.svg",
    assets: [
      {
        slotId: "slot_1",
        provider: "openai",
        filePath: "/tmp/job/art.png",
        previewPath: "/tmp/job/art-preview.png",
        effectiveDpi: 300
      }
    ]
  })),
  writeProofDeliveryManifest: vi.fn(async () => ({
    canDownloadProductionFiles: false
  })),
  sendServerAnalyticsEvent: vi.fn(async () => ({ status: "sent", configured: true, provider: "ga4_measurement_protocol" }))
}));

vi.mock("@/lib/auth/account-server", () => ({
  getAccountSessionFromCookies: () => mocks.accountSession
}));

vi.mock("@/lib/print/proof", () => ({
  generateProof: (...args: unknown[]) => mocks.generateProof(...args)
}));

vi.mock("@/lib/print/delivery-manifest", () => ({
  writeProofDeliveryManifest: (...args: unknown[]) => mocks.writeProofDeliveryManifest(...args)
}));

vi.mock("@/lib/analytics/server-events", () => ({
  sendServerAnalyticsEvent: (...args: unknown[]) => mocks.sendServerAnalyticsEvent(...args)
}));

vi.mock("@/lib/billing/paid-session", () => ({
  claimExportCredit: vi.fn(),
  claimSubscriptionExport: vi.fn(),
  finalizeExportCredit: vi.fn(),
  finalizeSubscriptionExport: vi.fn(),
  releaseExportCredit: vi.fn(),
  releaseSubscriptionExport: vi.fn(),
  verifyPaidCheckoutSession: vi.fn()
}));

describe("proof export route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.accountSession = {
      userId: "user_test",
      email: "buyer@example.com"
    };
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("emits proof_export_completed analytics for a dummy export", async () => {
    const response = await POST(
      new Request("https://trimproof.com/api/exports/proof", {
        method: "POST",
        body: JSON.stringify({
          mode: "dummy",
          analytics: {
            gaClientId: "123.456",
            gaSessionId: "789",
            pagePath: "/app"
          }
        })
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      mode: "dummy",
      productionDownloadLocked: true,
      analytics: {
        status: "sent",
        configured: true,
        provider: "ga4_measurement_protocol"
      }
    });
    expect(mocks.sendServerAnalyticsEvent).toHaveBeenCalledWith({
      name: "proof_export_completed",
      clientId: "123.456",
      params: {
        mode: "dummy",
        product_type: "business_card",
        report_status: "pass",
        print_profile: "business-card",
        pdfx_level: "PDF/X-1a",
        asset_provider: "openai",
        production_download_locked: true,
        entitlement: "dummy",
        page_path: "/app",
        session_id: 789
      }
    });
  });

  it("rejects unauthenticated requests before analytics fire", async () => {
    mocks.accountSession = undefined;

    const response = await POST(
      new Request("https://trimproof.com/api/exports/proof", {
        method: "POST",
        body: JSON.stringify({
          mode: "dummy"
        })
      })
    );

    expect(response.status).toBe(401);
    expect(mocks.sendServerAnalyticsEvent).not.toHaveBeenCalled();
  });
});
