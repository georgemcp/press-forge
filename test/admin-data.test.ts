import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminCenterData } from "@/lib/admin/data";

const mocks = vi.hoisted(() => ({
  supabase: undefined as unknown,
  stripeClient: undefined as unknown,
  emailConfig: undefined as unknown,
  analyticsConfigured: false,
  creativeStatus: {
    mode: "required",
    openaiConfigured: true,
    geminiConfigured: true
  }
}));

vi.mock("@/lib/db/supabase", () => ({
  createServiceSupabaseClient: () => mocks.supabase
}));

vi.mock("@/lib/billing/stripe", () => ({
  getStripeClient: () => mocks.stripeClient
}));

vi.mock("@/lib/analytics/server-events", () => ({
  isServerAnalyticsConfigured: () => mocks.analyticsConfigured
}));

vi.mock("@/lib/email/transactional", () => ({
  resolveEmailConfig: () => mocks.emailConfig
}));

vi.mock("@/lib/providers/model-config", () => ({
  getCreativeProviderStatus: () => mocks.creativeStatus
}));

describe("admin data loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.supabase = undefined;
    mocks.stripeClient = undefined;
    mocks.emailConfig = undefined;
    mocks.analyticsConfigured = false;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("includes SEO research and SERP research when Supabase is unavailable", async () => {
    const data = await getAdminCenterData("30d");

    expect(data.sourceErrors).toContain("Supabase service client is not configured.");
    expect(data.seoResearch).toBeDefined();
    expect(data.seoResearch?.summary.topPages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ pageSlug: "menu-maker" }),
        expect.objectContaining({ pageSlug: "free-menu-maker" }),
        expect.objectContaining({ pageSlug: "menu-pdf-template" })
      ])
    );
    expect(data.seoSerpResearch).toEqual(
      expect.objectContaining({
        market: "United States / English",
        snapshots: expect.arrayContaining([
          expect.objectContaining({ keyword: "menu maker" }),
          expect.objectContaining({ keyword: "free menu maker" }),
          expect.objectContaining({ keyword: "menu template" }),
          expect.objectContaining({ keyword: "postcard template" })
        ])
      })
    );
    expect(data.seoSerpResearch?.snapshots).toHaveLength(15);
  });
});
