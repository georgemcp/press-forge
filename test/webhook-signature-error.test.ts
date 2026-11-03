import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/billing/webhook/route";

const mocks = vi.hoisted(() => ({ constructEvent: vi.fn() }));

vi.mock("next/headers", () => ({ headers: async () => new Headers({ "stripe-signature": "t=1,v1=bad" }) }));
vi.mock("@/lib/billing/stripe", () => ({ getStripeClient: () => ({ webhooks: { constructEvent: mocks.constructEvent } }) }));
vi.mock("@/lib/db/supabase", () => ({ createServiceSupabaseClient: () => undefined }));

describe("webhook signature failure", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_abc123");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("returns a fixed 400 and logs the verification error instead of echoing it", async () => {
    const detail = "No signatures found matching the expected signature for payload. Are you passing the raw request body? whsec_abc123";
    mocks.constructEvent.mockImplementation(() => {
      throw new Error(detail);
    });
    const logged: string[] = [];
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      logged.push(JSON.stringify(args));
    });

    const response = await POST(new Request("https://trimproof.com/api/billing/webhook", { method: "POST", body: "{}" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid webhook signature." });
    expect(logged.join("\n")).toContain("signature verification failed");
    expect(logged.join("\n")).not.toContain("whsec_abc123");
  });
});
