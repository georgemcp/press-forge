import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as accessLinkRoute } from "@/app/api/billing/access-link/route";
import { POST as signupRoute } from "@/app/api/email-signup/route";
import { POST as proofRoute } from "@/app/api/exports/proof/route";
import { POST as webhookRoute } from "@/app/api/billing/webhook/route";
import { publicEmailResult } from "@/lib/email/transactional";
import { clearRateLimitState } from "@/lib/security/request";

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  analytics: vi.fn(),
  constructEvent: vi.fn(),
  verifyPaidCheckoutSession: vi.fn(),
  supabase: undefined as unknown,
  afterTasks: [] as Array<() => unknown>
}));

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (task: () => unknown) => mocks.afterTasks.push(task)
}));

vi.mock("next/headers", () => ({ headers: async () => new Headers({ "stripe-signature": "t=1,v1=x" }) }));
vi.mock("@/lib/auth/account-server", () => ({
  getAccountSessionFromCookies: async () => ({ userId: "user_test", email: "buyer@example.com" })
}));
vi.mock("@/lib/billing/paid-session", () => ({ verifyPaidCheckoutSession: mocks.verifyPaidCheckoutSession }));
vi.mock("@/lib/billing/stripe", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/billing/stripe")>()),
  getStripeClient: () => ({ webhooks: { constructEvent: mocks.constructEvent } })
}));
vi.mock("@/lib/email/transactional", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/email/transactional")>()),
  sendTransactionalEmail: mocks.send,
  getAdminSignupRecipients: () => ["ops@example.com"]
}));
vi.mock("@/lib/analytics/server-events", () => ({ sendServerAnalyticsEvent: mocks.analytics }));
vi.mock("@/lib/db/supabase", () => ({ createServiceSupabaseClient: () => mocks.supabase }));

const secretReason = "Invalid API key sk_test_abc123 for relay.internal";
const failed = { status: "failed", configured: true, provider: "resend", reason: secretReason };

function post(path: string, body: unknown) {
  return new Request(`https://trimproof.com${path}`, { method: "POST", body: JSON.stringify(body) });
}

function logged() {
  return JSON.stringify(vi.mocked(console.error).mock.calls);
}

describe("publicEmailResult", () => {
  it("exposes only a boolean and a code", () => {
    expect(publicEmailResult({ status: "sent", configured: true })).toEqual({ sent: true, code: "sent" });
    expect(publicEmailResult({ status: "failed", configured: true })).toEqual({ sent: false, code: "failed" });
    expect(publicEmailResult({ status: "skipped", configured: false })).toEqual({ sent: false, code: "not_configured" });
    expect(publicEmailResult({ status: "skipped", configured: true })).toEqual({ sent: false, code: "skipped" });
    expect(Object.keys(publicEmailResult({ status: "failed", configured: true, ...{ reason: "x" } }))).toEqual(["sent", "code"]);
  });
});

describe("public email responses never carry provider text", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearRateLimitState();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://trimproof.com");
    mocks.analytics.mockResolvedValue({ status: "skipped", configured: false });
    mocks.supabase = undefined;
    mocks.afterTasks.length = 0;
  });
  afterEach(() => vi.unstubAllEnvs());

  it("email-signup never returns email results and logs a redacted reason", async () => {
    mocks.send.mockResolvedValue(failed);
    const response = await signupRoute(post("/api/email-signup", { email: "lead@example.com", source: "test" }));
    await Promise.all(mocks.afterTasks.map((task) => task()));
    const text = await response.text();

    expect(response.status).toBe(202);
    expect(Object.keys(JSON.parse(text)).sort()).toEqual(["message", "ok"]);
    expect(text).not.toContain("sk_test_abc123");
    expect(text).not.toContain("relay.internal");
    expect(logged()).toContain("signup notification failed");
    expect(logged()).toContain("relay.internal");
    expect(logged()).not.toContain("sk_test_abc123");
  });

  it("access-link returns {sent, code} and logs a redacted reason", async () => {
    const builder = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      limit: async () => ({ data: [{ stripe_session_id: "cs_1", entitlement: "export_credit", status: "paid", customer_email: "buyer@example.com", created_at: "now" }], error: null })
    };
    mocks.supabase = { from: () => builder };
    mocks.verifyPaidCheckoutSession.mockResolvedValue({ id: "cs_1", consumed: false });
    mocks.send.mockResolvedValue(failed);

    const response = await accessLinkRoute(post("/api/billing/access-link", { email: "buyer@example.com" }));
    const text = await response.text();

    expect(JSON.parse(text)).toEqual({ ok: true, matched: true, entitlement: "export_credit", email: { sent: false, code: "failed" } });
    expect(text).not.toContain("relay.internal");
    expect(logged()).toContain("relay.internal");
    expect(logged()).not.toContain("sk_test_abc123");
  });
});

describe("proof export validation errors", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearRateLimitState();
  });

  it("returns schema-level issues without echoing the submitted value", async () => {
    const response = await proofRoute(post("/api/exports/proof", { mode: "secret-mode-value-xyz" }));
    const text = await response.text();

    expect(response.status).toBe(400);
    const body = JSON.parse(text);
    expect(body.error).toBe("Proof request failed validation.");
    expect(body.issues.length).toBeGreaterThan(0);
    for (const issue of body.issues) {
      expect(Object.keys(issue).sort()).toEqual(["code", "message", "path"]);
    }
    expect(text).not.toContain("secret-mode-value-xyz");
  });
});

describe("webhook failures are logged and stay retryable", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    mocks.analytics.mockResolvedValue({ status: "skipped" });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("logs a redacted record failure and returns 500", async () => {
    mocks.constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: { id: "cs_1", metadata: { entitlement: "export_credit" }, client_reference_id: "u1", mode: "payment" } }
    });
    mocks.supabase = {
      from: () => ({ upsert: () => ({ select: async () => ({ data: null, error: { message: "db down password=hunter2" } }) }) })
    };

    const response = await webhookRoute(post("/api/billing/webhook", {}));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Checkout order could not be recorded." });
    expect(logged()).toContain("order record failed");
    expect(logged()).toContain("db down");
    expect(logged()).not.toContain("hunter2");
  });

  it("logs a redacted lifecycle failure and returns 500", async () => {
    mocks.constructEvent.mockReturnValue({ type: "checkout.session.expired", data: { object: { id: "cs_1" } } });
    mocks.supabase = {
      from: () => {
        throw new Error("db down password=hunter2");
      }
    };

    const response = await webhookRoute(post("/api/billing/webhook", {}));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Order lifecycle update failed." });
    expect(logged()).toContain("lifecycle update failed");
    expect(logged()).toContain("checkout.session.expired");
    expect(logged()).not.toContain("hunter2");
  });
});
