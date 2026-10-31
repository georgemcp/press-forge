import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as accessLinkRoute } from "@/app/api/billing/access-link/route";
import { POST as portalRoute } from "@/app/api/billing/portal/route";
import { GET as sessionRoute } from "@/app/api/billing/session/route";
import { clearRateLimitState } from "@/lib/security/request";

const mocks = vi.hoisted(() => ({
  account: { userId: "user_test", email: "buyer@example.com" } as { userId: string; email: string } | undefined,
  verifyPaidCheckoutSession: vi.fn(),
  sendTransactionalEmail: vi.fn(),
  stripeCreate: vi.fn(),
  supabase: undefined as unknown
}));

vi.mock("@/lib/auth/account-server", () => ({
  getAccountSessionFromCookies: async () => mocks.account
}));

vi.mock("@/lib/billing/paid-session", () => ({
  verifyPaidCheckoutSession: mocks.verifyPaidCheckoutSession
}));

vi.mock("@/lib/email/transactional", () => ({
  sendTransactionalEmail: mocks.sendTransactionalEmail
}));

vi.mock("@/lib/db/supabase", () => ({
  createServiceSupabaseClient: () => mocks.supabase
}));

vi.mock("@/lib/billing/stripe", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/billing/stripe")>()),
  getStripeClient: () => ({
    billingPortal: {
      sessions: {
        create: mocks.stripeCreate
      }
    }
  })
}));

function ordersSupabase(result: { data: unknown; error: { message: string } | null }) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(async () => result)
  };
  return { from: vi.fn(() => builder) };
}

function forgedHostRequest(path: string, method: string, body?: unknown) {
  return new Request(`https://attacker.example${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-Host": "attacker.example"
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

function loggedErrors() {
  return JSON.stringify(vi.mocked(console.error).mock.calls);
}

describe("billing routes use the configured origin, not request Host", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearRateLimitState();
    mocks.account = { userId: "user_test", email: "buyer@example.com" };
    mocks.supabase = undefined;
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://trimproof.com");
    vi.stubEnv("APP_URL", "");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    clearRateLimitState();
  });

  it("builds the Stripe portal return URL from the configured origin", async () => {
    mocks.verifyPaidCheckoutSession.mockResolvedValue({ id: "cs_paid", entitlement: "subscription", customerId: "cus_123" });
    mocks.stripeCreate.mockResolvedValue({ url: "https://billing.stripe.com/session" });

    const response = await portalRoute(forgedHostRequest("/api/billing/portal", "POST", { sessionId: "cs_paid" }));

    expect(response.status).toBe(200);
    expect(mocks.stripeCreate).toHaveBeenCalledWith(expect.objectContaining({
      customer: "cus_123",
      return_url: "https://trimproof.com/app?mode=advanced&checkout=success&session_id=cs_paid"
    }));
    expect(JSON.stringify(mocks.stripeCreate.mock.calls)).not.toContain("attacker.example");
  });

  it("builds the access-link email URL from the configured origin", async () => {
    mocks.supabase = ordersSupabase({
      data: [{
        stripe_session_id: "cs_test_123",
        entitlement: "export_credit",
        status: "paid",
        customer_email: "buyer@example.com",
        created_at: "2026-10-30T00:00:00Z"
      }],
      error: null
    });
    mocks.verifyPaidCheckoutSession.mockResolvedValue({ id: "cs_test_123", entitlement: "export_credit", consumed: false });
    mocks.sendTransactionalEmail.mockResolvedValue({ status: "sent", configured: true, provider: "resend" });

    const response = await accessLinkRoute(forgedHostRequest("/api/billing/access-link", "POST", { email: "buyer@example.com" }));

    expect(response.status).toBe(200);
    const email = mocks.sendTransactionalEmail.mock.calls[0][0] as { text: string; html: string };
    expect(email.text).toContain("https://trimproof.com/app?mode=advanced&checkout=success&session_id=cs_test_123");
    expect(email.html).toContain("https://trimproof.com/app?mode=advanced&amp;checkout=success&amp;session_id=cs_test_123");
    expect(`${email.text}${email.html}`).not.toContain("attacker.example");
  });

  it("fails the portal closed in production when no origin is configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("APP_URL", "");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.verifyPaidCheckoutSession.mockResolvedValue({ id: "cs_paid", entitlement: "subscription", customerId: "cus_123" });

    const response = await portalRoute(forgedHostRequest("/api/billing/portal", "POST", { sessionId: "cs_paid" }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "Subscription management is temporarily unavailable. Try again later." });
    expect(mocks.stripeCreate).not.toHaveBeenCalled();
  });

  it("returns a fixed portal error and redacts provider detail in logs", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.verifyPaidCheckoutSession.mockResolvedValue({ id: "cs_paid", entitlement: "subscription", customerId: "cus_123" });
    mocks.stripeCreate.mockRejectedValue(new Error("Stripe upstream buyer@example.com sk_live_abc123 rejected"));

    const response = await portalRoute(forgedHostRequest("/api/billing/portal", "POST", { sessionId: "cs_paid" }));

    expect(response.status).toBe(402);
    await expect(response.json()).resolves.toEqual({ error: "Stripe Customer Portal could not start. Try again later." });
    const logged = loggedErrors();
    expect(logged).not.toContain("buyer@example.com");
    expect(logged).not.toContain("sk_live_abc123");
  });

  it("returns a fixed access-link lookup error and redacts database detail in logs", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.supabase = ordersSupabase({
      data: null,
      error: { message: "postgres detail buyer@example.com sk_live_abc123" }
    });

    const response = await accessLinkRoute(forgedHostRequest("/api/billing/access-link", "POST", { email: "buyer@example.com" }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "Access link lookup is temporarily unavailable. Try again later." });
    const logged = loggedErrors();
    expect(logged).not.toContain("buyer@example.com");
    expect(logged).not.toContain("sk_live_abc123");
  });

  it("returns a fixed checkout-session error and redacts provider detail in logs", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.verifyPaidCheckoutSession.mockRejectedValue(new Error("Stripe internal buyer@example.com sk_live_abc123"));

    const response = await sessionRoute(forgedHostRequest("/api/billing/session?session_id=cs_paid", "GET"));

    expect(response.status).toBe(402);
    await expect(response.json()).resolves.toEqual({
      paid: false,
      error: "Checkout session could not be verified. Try again later."
    });
    const logged = loggedErrors();
    expect(logged).not.toContain("buyer@example.com");
    expect(logged).not.toContain("sk_live_abc123");
  });
});
