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

function request() {
  return new Request("https://trimproof.com/api/billing/webhook", { method: "POST", body: "test event" });
}

describe("checkout webhook replay", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "test-secret");
    mocks.constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_paid",
          metadata: { product: "trimproof", entitlement: "export_credit" },
          client_reference_id: "user_paid",
          mode: "payment",
          customer: "cus_paid",
          amount_total: 1200,
          currency: "usd"
        }
      }
    });
    mocks.analytics.mockResolvedValue({ status: "skipped" });
  });

  afterEach(() => vi.unstubAllEnvs());

  it.each(["processing", "consumed", "refunded", "expired"])("does not revive an existing %s order", async (status) => {
    const fake = createFakeOrders([{ stripe_session_id: "cs_paid", status, proof_job_id: "job_existing" }]);
    mocks.supabase = fake.supabase;

    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(fake.rows).toHaveLength(1);
    expect(fake.rows[0]).toMatchObject({ status, proof_job_id: "job_existing" });
    expect(mocks.analytics).not.toHaveBeenCalled();
  });

  it("records a new paid checkout", async () => {
    const fake = createFakeOrders();
    mocks.supabase = fake.supabase;
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(fake.rows[0]).toMatchObject({ stripe_session_id: "cs_paid", entitlement: "export_credit", status: "paid", amount_total_cents: 1200 });
    expect(fake.creditInsert).toHaveBeenCalledTimes(1);
  });

  it("returns a retryable error when the checkout order cannot be recorded", async () => {
    mocks.supabase = {
      from: () => ({ upsert: () => ({ select: async () => ({ data: null, error: { message: "Database unavailable" } }) }) })
    };
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(mocks.analytics).not.toHaveBeenCalled();
  });
});
