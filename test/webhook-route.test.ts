import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/billing/webhook/route";

const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  upsert: vi.fn(),
  creditInsert: vi.fn(),
  analytics: vi.fn()
}));

vi.mock("next/headers", () => ({ headers: async () => new Headers({ "stripe-signature": "test-signature" }) }));
vi.mock("@/lib/billing/stripe", () => ({ getStripeClient: () => ({ webhooks: { constructEvent: mocks.constructEvent } }) }));
vi.mock("@/lib/analytics/server-events", () => ({ sendServerAnalyticsEvent: mocks.analytics }));
vi.mock("@/lib/db/supabase", () => ({
  createServiceSupabaseClient: () => ({
    from: (table: string) => {
      if (table === "export_orders") return { upsert: mocks.upsert };
      if (table === "credits_usage") return { insert: mocks.creditInsert };
      throw new Error(`Unexpected table ${table}`);
    }
  })
}));

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
    mocks.creditInsert.mockResolvedValue({ error: null });
  });

  afterEach(() => vi.unstubAllEnvs());

  it.each(["processing", "consumed", "refunded", "expired"])("does not revive an existing %s order", async (status) => {
    const order: Record<string, unknown> = { stripe_session_id: "cs_paid", status, proof_job_id: "job_existing" };
    mocks.upsert.mockImplementation(async (data, options) => {
      if (!options?.ignoreDuplicates) Object.assign(order, data);
      return { error: null };
    });

    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ stripe_session_id: "cs_paid" }), { onConflict: "stripe_session_id", ignoreDuplicates: true });
    expect(order).toMatchObject({ status, proof_job_id: "job_existing" });
  });

  it("records a new paid checkout", async () => {
    let order: Record<string, unknown> | undefined;
    mocks.upsert.mockImplementation(async (data) => {
      order ??= data;
      return { error: null };
    });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(order).toMatchObject({ stripe_session_id: "cs_paid", entitlement: "export_credit", status: "paid", amount_total_cents: 1200 });
  });

  it("returns a retryable error when the checkout order cannot be recorded", async () => {
    mocks.upsert.mockResolvedValue({ error: { message: "Database unavailable" } });
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(mocks.analytics).not.toHaveBeenCalled();
    expect(mocks.creditInsert).not.toHaveBeenCalled();
  });
});
