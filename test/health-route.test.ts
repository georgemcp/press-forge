import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/health/route";

vi.mock("@/lib/email/transactional", () => ({
  resolveEmailConfig: () => ({
    provider: "sendgrid"
  })
}));

vi.mock("@/lib/providers/model-config", () => ({
  getCreativeProviderStatus: () => ({
    mode: "required",
    openaiConfigured: true,
    openaiModel: "gpt-image-2",
    geminiConfigured: true,
    geminiModel: "gemini-3-pro-image"
  })
}));

describe("health route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reports payment, webhook, portal, and analytics readiness separately", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_ready");
    vi.stubEnv("STRIPE_EXPORT_PRICE_ID", "price_export");
    vi.stubEnv("STRIPE_SUBSCRIPTION_PRICE_ID", "price_subscription");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_ready");
    vi.stubEnv("STRIPE_PORTAL_CONFIGURATION_ID", "bpc_ready");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service_role");
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-READY");
    vi.stubEnv("GA4_API_SECRET", "ga4_secret");

    const response = await GET();
    const payload = await response.json();

    expect(payload.service).toBe("trimproof");
    expect(payload.checks).toMatchObject({
      stripeConfigured: true,
      stripeCheckoutConfigured: true,
      stripeWebhookConfigured: true,
      stripePortalConfigured: true,
      supabaseConfigured: true,
      serverAnalyticsConfigured: true,
      emailConfigured: true,
      emailProvider: "sendgrid",
      creativeProviders: {
        mode: "required",
        openaiConfigured: true,
        openaiModel: "gpt-image-2",
        geminiConfigured: true,
        geminiModel: "gemini-3-pro-image"
      }
    });
  });

  it("does not treat the Stripe portal as configured without a portal configuration", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_ready");
    vi.stubEnv("STRIPE_EXPORT_PRICE_ID", "price_export");
    vi.stubEnv("STRIPE_SUBSCRIPTION_PRICE_ID", "price_subscription");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_ready");

    const response = await GET();
    const payload = await response.json();

    expect(payload.checks).toMatchObject({
      stripeConfigured: true,
      stripeCheckoutConfigured: true,
      stripeWebhookConfigured: true,
      stripePortalConfigured: false
    });
  });
});
