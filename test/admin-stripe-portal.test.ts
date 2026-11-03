import { beforeEach, describe, expect, it, vi } from "vitest";
import { openStripeCustomerPortal } from "@/app/admin/actions";
import { createFakeOrders } from "./helpers/fake-orders";

const mocks = vi.hoisted(() => ({
  portalCreate: vi.fn(),
  audit: vi.fn(),
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
vi.mock("@/lib/admin/audit", () => ({ recordAdminAuditEvent: mocks.audit }));
vi.mock("@/lib/billing/stripe", () => ({
  getAppUrl: () => "https://trimproof.com",
  getStripeClient: () => ({ billingPortal: { sessions: { create: mocks.portalCreate } } })
}));
vi.mock("@/lib/db/supabase", () => ({ createServiceSupabaseClient: () => mocks.supabase }));

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

async function submit(fields: Record<string, string>) {
  let redirectedTo = "";
  await openStripeCustomerPortal(form(fields)).catch((error: Error) => {
    redirectedTo = error.message;
  });
  expect(redirectedTo).toMatch(/^redirect:/);
  return decodeURIComponent(redirectedTo.replace(/^redirect:/, ""));
}

describe("admin openStripeCustomerPortal resolves the customer from the order", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.portalCreate.mockResolvedValue({ url: "https://billing.stripe.test/session" });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("refuses an unknown order id without calling Stripe or auditing", async () => {
    mocks.supabase = createFakeOrders([{ id: "order_a", stripe_session_id: "cs_a", stripe_customer_id: "cus_known" }]).supabase;
    expect(await submit({ orderId: "order_missing", returnPath: "/admin" })).toContain("adminError=Order was not found.");
    expect(mocks.portalCreate).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("refuses a raw customer id posted without an order", async () => {
    mocks.supabase = createFakeOrders([{ id: "order_a", stripe_session_id: "cs_a", stripe_customer_id: "cus_known" }]).supabase;
    expect(await submit({ stripeCustomerId: "cus_victim", returnPath: "/admin" })).toContain("adminError");
    expect(mocks.portalCreate).not.toHaveBeenCalled();
  });

  it("refuses an order that has no Stripe customer", async () => {
    mocks.supabase = createFakeOrders([{ id: "order_a", stripe_session_id: "cs_a", stripe_customer_id: null }]).supabase;
    expect(await submit({ orderId: "order_a" })).toContain("adminError=This order has no Stripe customer.");
    expect(mocks.portalCreate).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("refuses a stored customer id that is not a cus_ id", async () => {
    mocks.supabase = createFakeOrders([{ id: "order_a", stripe_session_id: "cs_a", stripe_customer_id: "sub_123" }]).supabase;
    expect(await submit({ orderId: "order_a" })).toContain("adminError");
    expect(mocks.portalCreate).not.toHaveBeenCalled();
  });

  it("opens the portal for the order's customer and ignores a customer id in the form", async () => {
    mocks.supabase = createFakeOrders([
      { id: "order_a", stripe_session_id: "cs_a", customer_email: "a@example.com", stripe_customer_id: "cus_known" },
      { id: "order_b", stripe_session_id: "cs_b", customer_email: "b@example.com", stripe_customer_id: "cus_other" }
    ]).supabase;
    const target = await submit({ orderId: "order_a", stripeCustomerId: "cus_victim", returnPath: "/admin" });
    expect(target).toBe("https://billing.stripe.test/session");
    expect(mocks.portalCreate).toHaveBeenCalledTimes(1);
    expect(mocks.portalCreate.mock.calls[0][0]).toMatchObject({
      customer: "cus_known",
      return_url: "https://trimproof.com/admin/accounts/a%40example.com"
    });
  });

  it("writes an audit event naming the order and customer", async () => {
    const fake = createFakeOrders([{ id: "order_a", stripe_session_id: "cs_a", customer_email: "a@example.com", stripe_customer_id: "cus_known" }]);
    mocks.supabase = fake.supabase;
    await submit({ orderId: "order_a" });
    expect(mocks.audit).toHaveBeenCalledTimes(1);
    expect(mocks.audit).toHaveBeenCalledWith({
      supabase: fake.supabase,
      action: "stripe.portal_opened",
      targetType: "order",
      targetId: "order_a",
      metadata: { stripeCustomerId: "cus_known" }
    });
  });

  it("does not audit an opened portal when Stripe fails", async () => {
    mocks.supabase = createFakeOrders([{ id: "order_a", stripe_session_id: "cs_a", customer_email: "a@example.com", stripe_customer_id: "cus_known" }]).supabase;
    mocks.portalCreate.mockRejectedValue(new Error("stripe down"));
    expect(await submit({ orderId: "order_a" })).toContain("Stripe Customer Portal could not start.");
    expect(mocks.audit).not.toHaveBeenCalled();
  });
});
