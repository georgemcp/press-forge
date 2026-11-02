import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/billing/webhook/route";
import { createFakeOrders } from "./helpers/fake-orders";

const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  analytics: vi.fn(),
  supabase: undefined as unknown
}));

vi.mock("next/headers", () => ({ headers: async () => new Headers({ "stripe-signature": "test-signature" }) }));
vi.mock("@/lib/billing/stripe", () => ({ getStripeClient: () => ({ webhooks: { constructEvent: mocks.constructEvent } }) }));
vi.mock("@/lib/analytics/server-events", () => ({ sendServerAnalyticsEvent: mocks.analytics }));
vi.mock("@/lib/db/supabase", () => ({ createServiceSupabaseClient: () => mocks.supabase }));

const request = () => new Request("https://trimproof.com/api/billing/webhook", { method: "POST", body: "test event" });
const logged = () => JSON.stringify(vi.mocked(console.error).mock.calls);

function checkout(entitlement: "export_credit" | "subscription") {
  mocks.constructEvent.mockReturnValue({
    type: "checkout.session.completed",
    data: { object: { id: "cs_paid", metadata: { entitlement }, client_reference_id: "user_paid", mode: "payment", customer: "cus_paid", amount_total: 1200, currency: "usd" } }
  });
}

/** Wraps the fake so one table's write returns the given result instead. */
function withFailingTable(fake: ReturnType<typeof createFakeOrders>, table: string, write: () => unknown) {
  mocks.supabase = {
    from: (name: string) => (name === table ? write() : fake.supabase.from(name))
  };
}

describe("webhook without a service client", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "test-secret");
    mocks.supabase = undefined;
    checkout("export_credit");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("returns 503 and logs so Stripe retries the event", async () => {
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Order storage is not configured." });
    expect(logged()).toContain("service client is not configured");
    expect(logged()).toContain("checkout.session.completed");
  });
});

describe("webhook post-order writes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "test-secret");
    mocks.analytics.mockResolvedValue({ status: "skipped" });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("returns 500 and logs a redacted error when the credit insert fails", async () => {
    checkout("export_credit");
    const fake = createFakeOrders();
    withFailingTable(fake, "credits_usage", () => ({
      insert: async () => ({ error: { code: "XX000", message: "connection to db.internal failed, key sk_test_abc123" } })
    }));
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("db.internal");
    expect(logged()).toContain("credits_usage.insert");
    expect(logged()).not.toContain("sk_test_abc123");
  });

  it("returns 500 when the credit insert throws", async () => {
    checkout("export_credit");
    withFailingTable(createFakeOrders(), "credits_usage", () => ({ insert: async () => Promise.reject(new Error("socket hang up")) }));
    expect((await POST(request())).status).toBe(500);
    expect(logged()).toContain("socket hang up");
  });

  it("returns 500 when the subscription activation fails", async () => {
    checkout("subscription");
    const fake = createFakeOrders();
    withFailingTable(fake, "users", () => ({ update: () => ({ eq: async () => ({ error: { message: "permission denied" } }) }) }));
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(logged()).toContain("users.update");
  });

  it("treats a duplicate credit insert from a redelivery as done", async () => {
    checkout("export_credit");
    const fake = createFakeOrders();
    withFailingTable(fake, "credits_usage", () => ({
      insert: async () => ({ error: { code: "23505", message: 'duplicate key value violates unique constraint "credits_usage_stripe_session_id_idx"' } })
    }));
    expect((await POST(request())).status).toBe(200);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("a failed credit write, then a redelivery, records one order and sends one purchase event", async () => {
    checkout("export_credit");
    const fake = createFakeOrders();
    let credited = 0;
    let fail = true;
    withFailingTable(fake, "credits_usage", () => ({
      insert: async () => {
        if (fail) return { error: { code: "XX000", message: "down" } };
        credited += 1;
        return { error: null };
      }
    }));
    mocks.analytics.mockResolvedValue({ status: "sent" });

    expect((await POST(request())).status).toBe(500);
    fail = false;
    expect((await POST(request())).status).toBe(200);
    expect((await POST(request())).status).toBe(200);

    expect(fake.rows).toHaveLength(1);
    expect(mocks.analytics).toHaveBeenCalledTimes(1);
    expect(credited).toBe(2); // the route re-attempts the credit on every delivery; the credits_usage unique index (not this fake) dedupes it
  });
});
