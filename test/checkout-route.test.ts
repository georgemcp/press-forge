import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/billing/checkout/route";

const mocks = vi.hoisted(() => ({
  checkoutCreate: vi.fn()
}));

vi.mock("@/lib/billing/stripe", () => ({
  getAppUrl: () => "https://trimproof.com",
  getStripeClient: () => ({
    checkout: {
      sessions: {
        create: mocks.checkoutCreate
      }
    }
  })
}));

describe("checkout route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("STRIPE_EXPORT_PRICE_ID", "price_export");
    vi.stubEnv("STRIPE_SUBSCRIPTION_PRICE_ID", "price_subscription");
    mocks.checkoutCreate.mockResolvedValue({ url: "https://checkout.stripe.com/c/test" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("stores GA attribution in Stripe metadata", async () => {
    const response = await POST(
      new Request("https://trimproof.com/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({
          mode: "payment",
          email: "buyer@example.com",
          analytics: {
            gaClientId: "123.456",
            gaSessionId: "789",
            pagePath: "/app?mode=advanced"
          }
        })
      })
    );

    await expect(response.json()).resolves.toMatchObject({
      url: "https://checkout.stripe.com/c/test"
    });
    expect(mocks.checkoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          product: "trimproof",
          entitlement: "export_credit",
          ga_client_id: "123.456",
          ga_session_id: "789",
          page_path: "/app?mode=advanced"
        })
      })
    );
  });
});
