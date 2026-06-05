import { beforeEach, describe, expect, it, vi } from "vitest";
import { claimExportCredit, finalizeExportCredit, releaseExportCredit, verifyPaidCheckoutSession } from "@/lib/billing/paid-session";

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

function makeUpdateSupabase(data: unknown) {
  const builder = {
    update: vi.fn(() => builder),
    eq: vi.fn(() => builder),
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
      entitlement: "export_credit"
    },
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
    expect(builder.eq).toHaveBeenCalledWith("status", "processing");
    expect(builder.eq).toHaveBeenCalledWith("proof_job_id", "job_123");
  });
});
