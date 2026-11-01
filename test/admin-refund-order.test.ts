import { beforeEach, describe, expect, it, vi } from "vitest";
import { refundOrder } from "@/app/admin/actions";
import { createFakeOrders } from "./helpers/fake-orders";

const mocks = vi.hoisted(() => ({
  refundCreate: vi.fn(),
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
vi.mock("@/lib/billing/stripe", () => ({ getAppUrl: () => "https://trimproof.com", getStripeClient: () => ({ refunds: { create: mocks.refundCreate } }) }));
vi.mock("@/lib/db/supabase", () => ({ createServiceSupabaseClient: () => mocks.supabase }));

function form(orderId: string) {
  const data = new FormData();
  data.set("orderId", orderId);
  return data;
}

async function submit(orderId: string) {
  await expect(refundOrder(form(orderId))).rejects.toThrow(/^redirect:/);
}

describe("admin refundOrder", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.refundCreate.mockResolvedValue({ id: "re_1" });
  });

  it("sends the same Stripe idempotency key for every refund attempt on one order", async () => {
    const fake = createFakeOrders([{ id: "order_a", stripe_session_id: "cs_a", stripe_payment_intent_id: "pi_a", status: "paid" }]);
    mocks.supabase = fake.supabase;

    await submit("order_a");
    // Double submit from a stale page: the first attempt's DB write is lost, so the order still reads as paid.
    fake.rows[0].status = "paid";
    await submit("order_a");

    expect(mocks.refundCreate).toHaveBeenCalledTimes(2);
    const keys = mocks.refundCreate.mock.calls.map((call) => call[1]?.idempotencyKey);
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
    expect(mocks.refundCreate.mock.calls[0][0]).toMatchObject({ payment_intent: "pi_a" });
  });

  it("uses a different key for a different order", async () => {
    const fake = createFakeOrders([
      { id: "order_a", stripe_session_id: "cs_a", stripe_payment_intent_id: "pi_a", status: "paid" },
      { id: "order_b", stripe_session_id: "cs_b", stripe_payment_intent_id: "pi_b", status: "paid" }
    ]);
    mocks.supabase = fake.supabase;
    await submit("order_a");
    await submit("order_b");
    const [a, b] = mocks.refundCreate.mock.calls.map((call) => call[1]?.idempotencyKey);
    expect(a).not.toBe(b);
  });
});
