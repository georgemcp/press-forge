import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { claimExportCredit, finalizeExportCredit, paidCheckoutSessionBelongsToAccount, releaseExportCredit, releaseSubscriptionExport, verifyPaidCheckoutSession } from "@/lib/billing/paid-session";

const mocks = vi.hoisted(() => ({
  stripe: {
    checkout: {
      sessions: {
        retrieve: vi.fn()
      }
    },
    subscriptions: {
      retrieve: vi.fn()
    }
  },
  supabase: undefined as unknown
}));

vi.mock("@/lib/billing/stripe", () => ({
  getStripeClient: () => mocks.stripe
}));

vi.mock("@/lib/db/supabase", () => ({
  createServiceSupabaseClient: () => mocks.supabase
}));

function makeUpdateSupabase(data: unknown, error: { message: string } | null = null) {
  const builder = {
    error,
    update: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    select: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => ({ data, error: null }))
  };
  return {
    supabase: {
      from: vi.fn(() => builder)
    },
    builder
  };
}

function makeVerifySupabase(existingStatus: string | undefined) {
  const selectBuilder = {
    select: vi.fn(() => selectBuilder),
    eq: vi.fn(() => selectBuilder),
    maybeSingle: vi.fn(async () => ({
      data: existingStatus ? { status: existingStatus } : null,
      error: null
    }))
  };
  const upsertBuilder = {
    upsert: vi.fn(async () => ({ error: null }))
  };
  const supabase = {
    from: vi.fn((table: string) => {
      expect(table).toBe("export_orders");
      return supabase.from.mock.calls.length === 1 ? selectBuilder : upsertBuilder;
    })
  };

  return {
    supabase,
    selectBuilder,
    upsertBuilder
  };
}

function mockPaidExportCreditSession() {
  mocks.stripe.checkout.sessions.retrieve.mockResolvedValue({
    id: "cs_paid",
    metadata: {
      product: "trimproof",
      entitlement: "export_credit",
      user_id: "user_paid"
    },
    client_reference_id: "user_paid",
    mode: "payment",
    status: "complete",
    payment_status: "paid",
    customer: "cus_paid",
    customer_details: {
      email: "buyer@example.com"
    }
  });
}

describe("paid checkout sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPaidExportCreditSession();
    mocks.supabase = undefined;
  });

  it("does not revive an export credit that is already unavailable", async () => {
    const { supabase, upsertBuilder } = makeVerifySupabase("consumed");
    mocks.supabase = supabase;

    const session = await verifyPaidCheckoutSession("cs_paid");

    expect(session?.consumed).toBe(true);
    expect(upsertBuilder.upsert).not.toHaveBeenCalled();
  });

  it("does not reopen a consumed credit when verification resumes from a stale paid read", async () => {
    const order: Record<string, unknown> = { stripe_session_id: "cs_paid", entitlement: "export_credit", status: "paid", proof_job_id: null };
    let readCaptured!: () => void;
    let resumeRead!: () => void;
    const captured = new Promise<void>((resolve) => { readCaptured = resolve; });
    const paused = new Promise<void>((resolve) => { resumeRead = resolve; });
    let insertPreference: string | null = null;
    const localFetch: typeof fetch = async (input, init) => {
      const url = new URL(String(input));
      expect(url.origin).toBe("https://unit-test.supabase.co");
      expect(url.pathname).toBe("/rest/v1/export_orders");
      const method = init?.method ?? "GET";
      const responseHeaders = { "Content-Type": "application/json" };
      if (method === "GET") {
        const snapshot = { status: order.status };
        readCaptured();
        await paused;
        return new Response(JSON.stringify([snapshot]), { headers: responseHeaders });
      }
      if (method === "POST") {
        insertPreference = new Headers(init?.headers).get("prefer");
        if (!insertPreference?.includes("resolution=ignore-duplicates")) Object.assign(order, JSON.parse(String(init?.body)));
        return new Response(null, { status: 201 });
      }
      expect(method).toBe("PATCH");
      const matches = [...url.searchParams].filter(([key]) => key !== "select").every(([key, filter]) => filter === `eq.${order[key]}`);
      if (matches) Object.assign(order, JSON.parse(String(init?.body)));
      return new Response(JSON.stringify(matches ? order : null), { headers: responseHeaders });
    };
    mocks.supabase = createClient("https://unit-test.supabase.co", "test-key", {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: localFetch }
    });

    const staleVerification = verifyPaidCheckoutSession("cs_paid");
    await captured;
    await claimExportCredit("cs_paid", "job_first");
    await finalizeExportCredit("cs_paid", "job_first");
    resumeRead();
    await staleVerification;

    expect(insertPreference).toContain("resolution=ignore-duplicates");
    expect(order).toMatchObject({ status: "consumed", proof_job_id: "job_first" });
    await expect(claimExportCredit("cs_paid", "job_second")).rejects.toThrow("already been used");
  });

  it("surfaces a failed order insert during verification", async () => {
    const { supabase, upsertBuilder } = makeVerifySupabase(undefined);
    upsertBuilder.upsert.mockResolvedValue({ error: { message: "Insert failed" } } as never);
    mocks.supabase = supabase;
    await expect(verifyPaidCheckoutSession("cs_paid")).rejects.toThrow("Insert failed");
  });

  it("requires both the stable account id and normalized email to match", async () => {
    const session = await verifyPaidCheckoutSession("cs_paid");

    expect(paidCheckoutSessionBelongsToAccount(session!, { userId: "user_paid", email: "BUYER@example.com" })).toBe(true);
    expect(paidCheckoutSessionBelongsToAccount(session!, { userId: "user_other", email: "buyer@example.com" })).toBe(false);
    expect(paidCheckoutSessionBelongsToAccount(session!, { userId: "user_paid", email: "other@example.com" })).toBe(false);
  });

  it("rejects a paid session before database mutation when it belongs to another account", async () => {
    const { supabase } = makeVerifySupabase(undefined);
    mocks.supabase = supabase;

    await expect(
      verifyPaidCheckoutSession("cs_paid", { userId: "user_other", email: "buyer@example.com" })
    ).rejects.toThrow("does not belong");
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("claims an export credit only while it is paid", async () => {
    const { supabase, builder } = makeUpdateSupabase({ stripe_session_id: "cs_paid" });
    mocks.supabase = supabase;

    await claimExportCredit("cs_paid", "job_123");

    expect(builder.update).toHaveBeenCalledWith({
      status: "processing",
      proof_job_id: "job_123",
      consumed_at: null
    });
    expect(builder.eq).toHaveBeenCalledWith("stripe_session_id", "cs_paid");
    expect(builder.eq).toHaveBeenCalledWith("status", "paid");
  });

  it("rejects a claim when no paid export credit can be updated", async () => {
    const { supabase } = makeUpdateSupabase(null);
    mocks.supabase = supabase;

    await expect(claimExportCredit("cs_paid", "job_123")).rejects.toThrow("already been used");
  });

  it("finalizes a claimed export credit after proof generation succeeds", async () => {
    const { supabase, builder } = makeUpdateSupabase({ stripe_session_id: "cs_paid" });
    mocks.supabase = supabase;

    await finalizeExportCredit("cs_paid", "job_123");

    expect(builder.update).toHaveBeenCalledWith({
      status: "consumed",
      consumed_at: expect.any(String)
    });
    expect(builder.eq).toHaveBeenCalledWith("status", "processing");
    expect(builder.eq).toHaveBeenCalledWith("proof_job_id", "job_123");
  });

  it("releases a claimed export credit when proof generation fails", async () => {
    const { supabase, builder } = makeUpdateSupabase({ stripe_session_id: "cs_paid" });
    mocks.supabase = supabase;

    await releaseExportCredit("cs_paid", "job_123");

    expect(builder.update).toHaveBeenCalledWith({
      status: "paid",
      proof_job_id: null,
      consumed_at: null
    });
    expect(builder.in).toHaveBeenCalledWith("status", ["processing"]);
    expect(builder.eq).toHaveBeenCalledWith("proof_job_id", "job_123");
  });

  it("releases a subscription reservation without changing completed exports", async () => {
    const { supabase, builder } = makeUpdateSupabase(null);
    mocks.supabase = supabase;

    await releaseSubscriptionExport("job_123");

    expect(supabase.from).toHaveBeenCalledWith("subscription_export_usage");
    expect(builder.update).toHaveBeenCalledWith({ status: "failed" });
    expect(builder.eq).toHaveBeenCalledWith("proof_job_id", "job_123");
    expect(builder.in).toHaveBeenCalledWith("status", ["processing"]);
  });

  it("can restore only this job's consumed credit after an uncertain finalization", async () => {
    const { supabase, builder } = makeUpdateSupabase(null);
    mocks.supabase = supabase;
    await releaseExportCredit("cs_paid", "job_123", true);
    expect(builder.eq).toHaveBeenCalledWith("stripe_session_id", "cs_paid");
    expect(builder.eq).toHaveBeenCalledWith("entitlement", "export_credit");
    expect(builder.eq).toHaveBeenCalledWith("proof_job_id", "job_123");
    expect(builder.in).toHaveBeenCalledWith("status", ["processing", "consumed"]);
  });

  it("can restore only this job's completed subscription use after an uncertain finalization", async () => {
    const { supabase, builder } = makeUpdateSupabase(null);
    mocks.supabase = supabase;
    await releaseSubscriptionExport("job_123", true);
    expect(builder.eq).toHaveBeenCalledWith("proof_job_id", "job_123");
    expect(builder.in).toHaveBeenCalledWith("status", ["processing", "completed"]);
  });

  it.each([
    ["export credit", () => releaseExportCredit("cs_paid", "job_123")],
    ["subscription", () => releaseSubscriptionExport("job_123")]
  ] as const)("surfaces %s release errors instead of reporting success", async (_name, release) => {
    mocks.supabase = makeUpdateSupabase(null, { message: "Database unavailable" }).supabase;
    await expect(release()).rejects.toThrow("Database unavailable");
  });

  it.each([
    ["export credit", () => releaseExportCredit("cs_paid", "job_123")],
    ["subscription", () => releaseSubscriptionExport("job_123")]
  ] as const)("rejects %s release without a database client", async (_name, release) => {
    await expect(release()).rejects.toThrow("required to release");
  });
});
