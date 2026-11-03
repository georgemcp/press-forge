import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelSubscription,
  expireOrderAccess,
  openStripeCustomerPortal,
  refundOrder,
  sendOrderAccessLink,
  updateAccountManagement
} from "@/app/admin/actions";

const leak = "sk_live_abc123 relation \"export_orders\" violates constraint at db.internal:5432";

const mocks = vi.hoisted(() => ({
  refundCreate: vi.fn(),
  subscriptionCancel: vi.fn(),
  portalCreate: vi.fn(),
  sendEmail: vi.fn(),
  expireById: vi.fn(),
  expireBySubscription: vi.fn(),
  order: { data: undefined as unknown, error: undefined as unknown },
  updateError: undefined as unknown,
  upsertError: undefined as unknown,
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
  getStripeClient: () => ({
    refunds: { create: mocks.refundCreate },
    subscriptions: { cancel: mocks.subscriptionCancel },
    billingPortal: { sessions: { create: mocks.portalCreate } }
  })
}));
vi.mock("@/lib/billing/order-lifecycle", () => ({
  expireExportOrderById: mocks.expireById,
  updateExportOrdersBySubscriptionId: mocks.expireBySubscription
}));
vi.mock("@/lib/email/transactional", () => ({ sendTransactionalEmail: mocks.sendEmail }));
vi.mock("@/lib/db/supabase", () => ({ createServiceSupabaseClient: () => mocks.supabase }));

const paidOrder = {
  id: "order_a",
  status: "paid",
  customer_email: "buyer@example.com",
  stripe_session_id: "cs_a",
  stripe_payment_intent_id: "pi_a",
  stripe_subscription_id: "sub_a"
};

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

/** Runs the action and returns the redirect target it threw, decoded. */
async function redirectOf(action: (formData: FormData) => Promise<void>, fields: Record<string, string>) {
  const caught = await action(form(fields)).then(
    () => undefined,
    (error: Error) => error
  );
  expect(caught?.message).toMatch(/^redirect:/);
  return decodeURIComponent(caught!.message);
}

function expectFixed(target: string, message: string) {
  expect(target).toContain("adminError=");
  expect(target).toContain(message);
  expect(target).not.toMatch(/sk_live|relation|db\.internal|violates|5432/);
}

describe("admin actions never put provider or database error text in the redirect", () => {
  let logged: string;

  beforeEach(() => {
    vi.resetAllMocks();
    logged = "";
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      logged += JSON.stringify(args);
    });
    mocks.order = { data: paidOrder, error: null };
    mocks.updateError = null;
    mocks.upsertError = null;
    mocks.refundCreate.mockResolvedValue({ id: "re_1" });
    mocks.subscriptionCancel.mockResolvedValue({ status: "canceled" });
    mocks.expireById.mockResolvedValue("updated");
    mocks.expireBySubscription.mockResolvedValue("updated");
    mocks.supabase = {
      from: (table: string) => {
        if (table === "account_management") return { upsert: async () => ({ error: mocks.upsertError }) };
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => mocks.order }) }),
          update: () => ({ eq: async () => ({ error: mocks.updateError }) })
        };
      }
    };
  });

  it("order load failure", async () => {
    mocks.order = { data: null, error: { message: leak } };
    const target = await redirectOf(expireOrderAccess, { orderId: "order_a" });
    expectFixed(target, "Order could not be loaded.");
    expect(logged).toContain("order.load");
    expect(logged).not.toContain("sk_live_abc123");
  });

  it("account notes save failure", async () => {
    mocks.upsertError = { message: leak };
    const target = await redirectOf(updateAccountManagement, { email: "buyer@example.com", status: "customer" });
    expectFixed(target, "Account management notes could not be saved.");
  });

  it("expire failure", async () => {
    mocks.expireById.mockRejectedValue(new Error(leak));
    const target = await redirectOf(expireOrderAccess, { orderId: "order_a" });
    expectFixed(target, "Order could not be expired.");
  });

  it("Stripe refund failure, and the audit reason is redacted", async () => {
    mocks.refundCreate.mockRejectedValue(new Error(leak));
    const target = await redirectOf(refundOrder, { orderId: "order_a" });
    expectFixed(target, "Stripe refund failed.");
    const reason = mocks.audit.mock.calls[0][0].metadata.reason as string;
    expect(reason).not.toContain("sk_live_abc123");
    expect(logged).toContain("order.refund");
  });

  it("order update failure after a refund", async () => {
    mocks.updateError = { message: leak };
    const target = await redirectOf(refundOrder, { orderId: "order_a" });
    expectFixed(target, "the order could not be marked refunded");
  });

  it("Stripe cancellation failure, and the audit reason is redacted", async () => {
    mocks.subscriptionCancel.mockRejectedValue(new Error(leak));
    const target = await redirectOf(cancelSubscription, { orderId: "order_a" });
    expectFixed(target, "Stripe cancellation failed.");
    const reason = mocks.audit.mock.calls[0][0].metadata.reason as string;
    expect(reason).not.toContain("sk_live_abc123");
  });

  it("order expiry failure after a cancellation", async () => {
    mocks.expireBySubscription.mockRejectedValue(new Error(leak));
    const target = await redirectOf(cancelSubscription, { orderId: "order_a" });
    expectFixed(target, "Order could not be expired.");
  });

  it("access link email failure", async () => {
    mocks.sendEmail.mockResolvedValue({ status: "failed", provider: "resend", reason: leak });
    const target = await redirectOf(sendOrderAccessLink, { orderId: "order_a" });
    expectFixed(target, "Access link email was not sent.");
  });

  it("Stripe portal failure", async () => {
    mocks.portalCreate.mockRejectedValue(new Error(leak));
    const target = await redirectOf(openStripeCustomerPortal, { stripeCustomerId: "cus_a" });
    expectFixed(target, "Stripe Customer Portal could not start.");
  });
});
