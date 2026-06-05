import { describe, expect, it, vi } from "vitest";
import {
  exportOrderStatusForSubscription,
  stripeObjectId,
  updateExportOrderBySessionId,
  updateExportOrdersByPaymentIntentId,
  updateExportOrdersBySubscriptionId
} from "@/lib/billing/order-lifecycle";

function makeUpdateSupabase() {
  const builder = {
    update: vi.fn(() => builder),
    eq: vi.fn(() => builder)
  };
  return {
    supabase: {
      from: vi.fn(() => builder)
    },
    builder
  };
}

describe("Stripe order lifecycle helpers", () => {
  it("normalizes Stripe string or object IDs", () => {
    expect(stripeObjectId("pi_test")).toBe("pi_test");
    expect(stripeObjectId({ id: "sub_test" })).toBe("sub_test");
    expect(stripeObjectId(null)).toBeUndefined();
  });

  it("maps subscription statuses to export order access", () => {
    expect(exportOrderStatusForSubscription("active")).toBe("paid");
    expect(exportOrderStatusForSubscription("trialing")).toBe("paid");
    expect(exportOrderStatusForSubscription("past_due")).toBe("expired");
    expect(exportOrderStatusForSubscription("canceled")).toBe("expired");
  });

  it("expires checkout sessions by Stripe session ID", async () => {
    const { supabase, builder } = makeUpdateSupabase();

    await updateExportOrderBySessionId(supabase as never, "cs_expired", "expired");

    expect(supabase.from).toHaveBeenCalledWith("export_orders");
    expect(builder.update).toHaveBeenCalledWith({
      status: "expired",
      proof_job_id: null,
      consumed_at: null
    });
    expect(builder.eq).toHaveBeenCalledWith("stripe_session_id", "cs_expired");
  });

  it("marks refunded orders by payment intent ID", async () => {
    const { supabase, builder } = makeUpdateSupabase();

    await updateExportOrdersByPaymentIntentId(supabase as never, "pi_refunded", "refunded");

    expect(builder.update).toHaveBeenCalledWith({
      status: "refunded",
      proof_job_id: null,
      consumed_at: null
    });
    expect(builder.eq).toHaveBeenCalledWith("stripe_payment_intent_id", "pi_refunded");
  });

  it("updates subscription orders by subscription ID", async () => {
    const { supabase, builder } = makeUpdateSupabase();

    await updateExportOrdersBySubscriptionId(supabase as never, "sub_canceled", "expired");

    expect(builder.update).toHaveBeenCalledWith({
      status: "expired",
      proof_job_id: null,
      consumed_at: null
    });
    expect(builder.eq).toHaveBeenCalledWith("stripe_subscription_id", "sub_canceled");
  });
});
