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

function deliver(type: string, object: Record<string, unknown>) {
  mocks.constructEvent.mockReturnValue({ type, data: { object } });
  return POST(new Request("https://trimproof.com/api/billing/webhook", { method: "POST", body: "event" }));
}

const completed = (id = "cs_paid", paymentIntent = "pi_paid") =>
  deliver("checkout.session.completed", {
    id,
    metadata: { entitlement: "export_credit" },
    client_reference_id: "user_paid",
    mode: "payment",
    customer: "cus_paid",
    payment_intent: paymentIntent,
    amount_total: 1200,
    currency: "usd"
  });
const refunded = (paymentIntent = "pi_paid") => deliver("charge.refunded", { refunded: true, payment_intent: paymentIntent });
const subscriptionCompleted = () =>
  deliver("checkout.session.completed", {
    id: "cs_sub",
    metadata: { entitlement: "subscription" },
    client_reference_id: "user_sub",
    mode: "subscription",
    subscription: "sub_1",
    amount_total: 4900,
    currency: "usd"
  });
const subscriptionEvent = (type: string, status: string) => deliver(type, { id: "sub_1", status });

describe("order lifecycle webhook ordering", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "test-secret");
    mocks.analytics.mockResolvedValue({ status: "skipped" });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("keeps an order refunded when a late checkout.session.completed arrives after the refund", async () => {
    const fake = createFakeOrders();
    mocks.supabase = fake.supabase;

    expect((await refunded()).status).toBe(200);
    expect((await completed()).status).toBe(200);

    expect(fake.rows).toHaveLength(1);
    expect(fake.rows[0]).toMatchObject({ stripe_session_id: "cs_paid", stripe_payment_intent_id: "pi_paid", status: "refunded" });
    expect(fake.rows.some((r) => r.status === "paid")).toBe(false);
    expect(mocks.analytics).not.toHaveBeenCalled();
    expect(fake.creditInsert).not.toHaveBeenCalled();
  });

  it("ends refunded when the refund follows the completion", async () => {
    const fake = createFakeOrders();
    mocks.supabase = fake.supabase;

    await completed();
    expect(fake.rows[0]).toMatchObject({ status: "paid" });
    expect((await refunded()).status).toBe(200);

    expect(fake.rows).toHaveLength(1);
    expect(fake.rows[0]).toMatchObject({ stripe_session_id: "cs_paid", status: "refunded" });
  });

  it("refunds an order that is mid-export or already consumed", async () => {
    for (const status of ["processing", "consumed"]) {
      const fake = createFakeOrders([{ stripe_session_id: "cs_paid", stripe_payment_intent_id: "pi_paid", status, proof_job_id: "job_1" }]);
      mocks.supabase = fake.supabase;
      expect((await refunded()).status).toBe(200);
      expect(fake.rows[0]).toMatchObject({ status: "refunded", proof_job_id: null });
    }
  });

  it("answers 200 and changes nothing for a duplicate refund delivery", async () => {
    const fake = createFakeOrders([{ stripe_session_id: "cs_paid", stripe_payment_intent_id: "pi_paid", status: "refunded" }]);
    mocks.supabase = fake.supabase;
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    expect((await refunded()).status).toBe(200);
    expect(fake.rows).toHaveLength(1);
    expect(fake.rows[0]).toMatchObject({ status: "refunded" });
  });

  it("does not let a stale subscription event or paid invoice revive a refunded order", async () => {
    const fake = createFakeOrders([{ stripe_session_id: "cs_sub", stripe_subscription_id: "sub_1", status: "refunded" }]);
    mocks.supabase = fake.supabase;
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    expect((await subscriptionEvent("customer.subscription.updated", "active")).status).toBe(200);
    expect((await subscriptionEvent("customer.subscription.created", "trialing")).status).toBe(200);
    expect((await deliver("invoice.paid", { subscription: "sub_1" })).status).toBe(200);
    expect(fake.rows[0]).toMatchObject({ status: "refunded" });
  });

  it("does not let a stale subscription.updated reactivate an expired order, but a paid invoice can", async () => {
    const fake = createFakeOrders([{ stripe_session_id: "cs_sub", stripe_subscription_id: "sub_1", status: "paid" }]);
    mocks.supabase = fake.supabase;
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    await subscriptionEvent("customer.subscription.deleted", "canceled");
    expect(fake.rows[0]).toMatchObject({ status: "expired" });

    expect((await subscriptionEvent("customer.subscription.updated", "active")).status).toBe(200);
    expect(fake.rows[0]).toMatchObject({ status: "expired" });

    expect((await deliver("invoice.paid", { subscription: "sub_1" })).status).toBe(200);
    expect(fake.rows[0]).toMatchObject({ status: "paid" });
  });

  it("does not expire a consumed or refunded export credit from a checkout expiry event", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    for (const status of ["consumed", "refunded", "processing"]) {
      const fake = createFakeOrders([{ stripe_session_id: "cs_paid", status, proof_job_id: "job_1", consumed_at: "2026-01-01" }]);
      mocks.supabase = fake.supabase;
      expect((await deliver("checkout.session.expired", { id: "cs_paid" })).status).toBe(200);
      expect(fake.rows[0]).toMatchObject({ status, proof_job_id: "job_1", consumed_at: "2026-01-01" });
    }
  });

  it("sends the GA purchase event once across duplicate deliveries", async () => {
    const fake = createFakeOrders();
    mocks.supabase = fake.supabase;

    expect((await completed()).status).toBe(200);
    expect((await completed()).status).toBe(200);
    expect((await completed()).status).toBe(200);

    expect(fake.rows).toHaveLength(1);
    expect(mocks.analytics).toHaveBeenCalledTimes(1);
    expect(mocks.analytics).toHaveBeenCalledWith(expect.objectContaining({ name: "purchase" }));
  });

  it("returns 500 for a real database error so Stripe retries", async () => {
    const fake = createFakeOrders();
    mocks.supabase = {
      from: () => ({ update: () => ({ eq: () => ({ in: () => ({ select: async () => ({ data: null, error: { message: "db down" } }) }) }) }) })
    };
    expect((await refunded()).status).toBe(500);
    expect(fake.rows).toHaveLength(0);
  });

  it("lands a subscription checkout paid when no refund is recorded", async () => {
    const fake = createFakeOrders();
    mocks.supabase = fake.supabase;
    expect((await subscriptionCompleted()).status).toBe(200);
    expect(fake.rows[0]).toMatchObject({ stripe_session_id: "cs_sub", status: "paid" });
    expect(mocks.analytics).toHaveBeenCalledTimes(1);
  });
});
