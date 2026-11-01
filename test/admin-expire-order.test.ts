import { beforeEach, describe, expect, it, vi } from "vitest";
import { cancelSubscription, expireOrderAccess } from "@/app/admin/actions";
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
});
