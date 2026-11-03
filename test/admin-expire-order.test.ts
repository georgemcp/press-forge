import { beforeEach, describe, expect, it, vi } from "vitest";
import { cancelSubscription, expireOrderAccess } from "@/app/admin/actions";
import { expireExportOrderById, updateExportOrderBySessionId, updateExportOrdersByPaymentIntentId } from "@/lib/billing/order-lifecycle";
import { createFakeOrders } from "./helpers/fake-orders";

const mocks = vi.hoisted(() => ({
  cancel: vi.fn(),
  supabase: undefined as unknown
}));

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "session" }) }), headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  }
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/admin/auth", () => ({
  ADMIN_SESSION_COOKIE: "admin",
  createAdminSessionValue: vi.fn(),
  getAdminSessionCookieOptions: vi.fn(),
  isAdminAuthConfigured: () => true,
  validateAdminCredentials: vi.fn(),
  verifyAdminSessionValue: () => true
}));
vi.mock("@/lib/billing/stripe", () => ({ getAppUrl: () => "https://trimproof.com", getStripeClient: () => ({ subscriptions: { cancel: mocks.cancel } }) }));
vi.mock("@/lib/db/supabase", () => ({ createServiceSupabaseClient: () => mocks.supabase }));

function form(orderId: string) {
  const data = new FormData();
  data.set("orderId", orderId);
  return data;
}

async function submit(action: (formData: FormData) => Promise<void>, orderId: string) {
  let redirectedTo = "";
  await action(form(orderId)).catch((error: Error) => {
    redirectedTo = error.message;
  });
  expect(redirectedTo).toMatch(/^redirect:/);
  return decodeURIComponent(redirectedTo);
}

describe("admin expiry actions respect the order lifecycle", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.cancel.mockResolvedValue({ status: "canceled" });
    vi.spyOn(console, "info").mockImplementation(() => undefined);
  });

  it("expireOrderAccess expires a paid order", async () => {
    const fake = createFakeOrders([{ id: "order_a", stripe_session_id: "cs_a", status: "paid" }]);
    mocks.supabase = fake.supabase;
    expect(await submit(expireOrderAccess, "order_a")).toContain("saved");
    expect(fake.rows[0]).toMatchObject({ status: "expired" });
  });

  it("expireOrderAccess never overwrites a refunded order and reports it", async () => {
    const fake = createFakeOrders([{ id: "order_a", stripe_session_id: "cs_a", status: "refunded" }]);
    mocks.supabase = fake.supabase;
    expect(await submit(expireOrderAccess, "order_a")).toContain("adminError");
    expect(fake.rows[0]).toMatchObject({ status: "refunded" });
  });

  it.each(["paid", "processing", "consumed"])("expireOrderAccess keeps its reach: expires a %s order", async (status) => {
    const fake = createFakeOrders([{ id: "order_a", stripe_session_id: "cs_a", status, proof_job_id: "job_1", consumed_at: "2026-01-01" }]);
    mocks.supabase = fake.supabase;
    expect(await submit(expireOrderAccess, "order_a")).toContain("saved");
    expect(fake.rows[0]).toMatchObject({ status: "expired", proof_job_id: null, consumed_at: null });
  });

  it("expireOrderAccess on an already expired order is a no-op with the existing message", async () => {
    const fake = createFakeOrders([{ id: "order_a", stripe_session_id: "cs_a", status: "expired" }]);
    mocks.supabase = fake.supabase;
    expect(await submit(expireOrderAccess, "order_a")).toContain("Order access expired.");
    expect(fake.writes.filter((w) => w.op === "update")).toEqual([]);
    expect(fake.rows[0]).toMatchObject({ status: "expired" });
  });

  it("expireExportOrderById refuses a refunded order even if the caller saw it as paid", async () => {
    const fake = createFakeOrders([{ id: "order_a", stripe_session_id: "cs_a", status: "refunded" }]);
    expect(await expireExportOrderById(fake.supabase as never, "order_a")).toBe("terminal");
    expect(fake.rows[0]).toMatchObject({ status: "refunded" });
  });

  it("webhook-driven expiry stays paid-only", async () => {
    for (const status of ["processing", "consumed", "refunded"]) {
      const fake = createFakeOrders([{ id: "order_a", stripe_session_id: "cs_a", stripe_payment_intent_id: "pi_a", status }]);
      expect(await updateExportOrderBySessionId(fake.supabase as never, "cs_a", "expired")).toBe("terminal");
      expect(await updateExportOrdersByPaymentIntentId(fake.supabase as never, "pi_a", "expired")).toBe("terminal");
      expect(fake.rows[0]).toMatchObject({ status });
    }
    const paid = createFakeOrders([{ id: "order_a", stripe_session_id: "cs_a", status: "paid" }]);
    expect(await updateExportOrderBySessionId(paid.supabase as never, "cs_a", "expired")).toBe("updated");
  });

  it("cancelSubscription expires a paid subscription order", async () => {
    const fake = createFakeOrders([{ id: "order_s", stripe_session_id: "cs_s", stripe_subscription_id: "sub_1", status: "paid" }]);
    mocks.supabase = fake.supabase;
    expect(await submit(cancelSubscription, "order_s")).toContain("saved");
    expect(mocks.cancel).toHaveBeenCalledWith("sub_1");
    expect(fake.rows[0]).toMatchObject({ status: "expired" });
  });

  it("cancelSubscription cancels in Stripe but never overwrites a refunded order", async () => {
    const fake = createFakeOrders([{ id: "order_s", stripe_session_id: "cs_s", stripe_subscription_id: "sub_1", status: "refunded" }]);
    mocks.supabase = fake.supabase;
    await submit(cancelSubscription, "order_s");
    expect(mocks.cancel).toHaveBeenCalledWith("sub_1");
    expect(fake.rows[0]).toMatchObject({ status: "refunded" });
  });

  it.each(["processing", "consumed"])("cancelSubscription reports an admin error when a %s order's access stays alive", async (status) => {
    const fake = createFakeOrders([{ id: "order_s", stripe_session_id: "cs_s", stripe_subscription_id: "sub_1", status }]);
    mocks.supabase = fake.supabase;
    expect(await submit(cancelSubscription, "order_s")).toContain("adminError");
    expect(mocks.cancel).toHaveBeenCalledWith("sub_1");
    expect(fake.rows[0]).toMatchObject({ status });
  });

  it.each(["refunded", "expired"])("cancelSubscription on a %s order is not an admin error (nothing is left live)", async (status) => {
    const fake = createFakeOrders([{ id: "order_s", stripe_session_id: "cs_s", stripe_subscription_id: "sub_1", status }]);
    mocks.supabase = fake.supabase;
    expect(await submit(cancelSubscription, "order_s")).toContain("saved");
    expect(fake.rows[0]).toMatchObject({ status });
  });
});
