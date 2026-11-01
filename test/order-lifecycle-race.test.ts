import { describe, expect, it, vi } from "vitest";
import { recordPaidExportOrder, updateExportOrdersByPaymentIntentId } from "@/lib/billing/order-lifecycle";
import { createFakeOrders } from "./helpers/fake-orders";

const checkout = {
  stripe_session_id: "cs_paid",
  stripe_payment_intent_id: "pi_paid",
  entitlement: "export_credit",
  checkout_mode: "payment"
};

describe("order lifecycle races (refund vs. checkout recording)", () => {
  it("recordPaidExportOrder re-checks the tombstone after inserting, so a refund that raced the insert still wins", async () => {
    const fake = createFakeOrders();
    // The refund lands completely (no order yet, so it leaves a tombstone) after recordPaidExportOrder
    // read "no tombstone" and before it inserts its paid row.
    fake.interleaveAfter(
      ({ op }) => op === "select",
      () => updateExportOrdersByPaymentIntentId(fake.supabase as never, "pi_paid", "refunded")
    );
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    const result = await recordPaidExportOrder(fake.supabase as never, checkout);

    expect(result).toEqual({ created: true, refunded: true });
    expect(fake.rows).toHaveLength(1);
    expect(fake.rows[0]).toMatchObject({ stripe_session_id: "cs_paid", status: "refunded" });
    expect(fake.rows.some((r) => String(r.stripe_session_id).startsWith("refund-tombstone:"))).toBe(false);
  });

  it("the refund path retries the transition when the checkout was inserted between its existence check and its tombstone write", async () => {
    const fake = createFakeOrders();
    // The first update and the existence check find no order; the checkout is then recorded paid before the refund writes its tombstone.
    fake.interleaveAfter(
      ({ op, affected }) => op === "select" && affected === 0,
      () => {
        fake.rows.push({ id: "order_late", ...checkout, status: "paid" });
      }
    );
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    const result = await updateExportOrdersByPaymentIntentId(fake.supabase as never, "pi_paid", "refunded");

    expect(result).toBe("updated");
    expect(fake.rows).toHaveLength(1);
    expect(fake.rows[0]).toMatchObject({ id: "order_late", status: "refunded" });
    expect(fake.rows.some((r) => String(r.stripe_session_id).startsWith("refund-tombstone:"))).toBe(false);
  });
});
