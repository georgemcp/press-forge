import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/billing/checkout/route";

const mocks = vi.hoisted(() => ({
  checkoutCreate: vi.fn(),
  accountSession: {
    userId: "user_test",
    email: "buyer@example.com"
  } as { userId: string; email: string } | undefined
}));

vi.mock("@/lib/auth/account-server", () => ({
  getAccountSessionFromCookies: () => mocks.accountSession
}));

vi.mock("@/lib/billing/stripe", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/billing/stripe")>()),
  getStripeClient: () => ({
    checkout: {
      sessions: {
        create: mocks.checkoutCreate
      }
    }
  })
}));

vi.mock("@/lib/db/supabase", () => ({
  createServiceSupabaseClient: () => undefined
}));

describe("checkout route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.accountSession = {
      userId: "user_test",
      email: "buyer@example.com"
    };
    vi.stubEnv("STRIPE_EXPORT_PRICE_ID", "price_export");
    vi.stubEnv("STRIPE_SUBSCRIPTION_PRICE_ID", "price_subscription");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://trimproof.com");
    vi.stubEnv("APP_URL", "");
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
        client_reference_id: "user_test",
        customer_email: "buyer@example.com",
        metadata: expect.objectContaining({
          product: "trimproof",
          entitlement: "export_credit",
          user_id: "user_test",
          account_email: "buyer@example.com",
          ga_client_id: "123.456",
          ga_session_id: "789",
          page_path: "/app?mode=advanced"
        })
      })
    );
  });

  it("builds success and cancel URLs from the configured origin, not the request Host", async () => {
    const response = await POST(
      new Request("https://attacker.example/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-Host": "attacker.example"
        },
        body: JSON.stringify({ mode: "payment", email: "buyer@example.com" })
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.checkoutCreate).toHaveBeenCalledWith(expect.objectContaining({
      success_url: "https://trimproof.com/app?mode=advanced&checkout=success&session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://trimproof.com/app?mode=advanced&checkout=cancelled"
    }));
  });

  it("fails closed in production when no origin is configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("APP_URL", "");
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await POST(
      new Request("https://attacker.example/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "payment", email: "buyer@example.com" })
      })
    );

    expect(response.status).toBe(503);
    expect(mocks.checkoutCreate).not.toHaveBeenCalled();
  });

  it("requires a signed-in account before checkout", async () => {
    mocks.accountSession = undefined;

    const response = await POST(
      new Request("https://trimproof.com/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({
          mode: "payment",
          email: "buyer@example.com"
        })
      })
    );

    expect(response.status).toBe(401);
    expect(mocks.checkoutCreate).not.toHaveBeenCalled();
  });
});
