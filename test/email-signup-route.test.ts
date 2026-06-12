import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/email-signup/route";

const mocks = vi.hoisted(() => ({
  supabase: undefined as unknown,
  sendTransactionalEmail: vi.fn(async () => ({ status: "sent", configured: true, provider: "test" })),
  getAdminSignupRecipients: vi.fn(() => ["admin@example.com"]),
  sendServerAnalyticsEvent: vi.fn(async () => ({ status: "sent", configured: true, provider: "ga4_measurement_protocol" }))
}));

vi.mock("@/lib/db/supabase", () => ({
  createServiceSupabaseClient: () => mocks.supabase
}));

vi.mock("@/lib/email/transactional", () => ({
  getAdminSignupRecipients: () => mocks.getAdminSignupRecipients(),
  sendTransactionalEmail: (...args: unknown[]) => mocks.sendTransactionalEmail(...args)
}));

vi.mock("@/lib/analytics/server-events", () => ({
  sendServerAnalyticsEvent: (...args: unknown[]) => mocks.sendServerAnalyticsEvent(...args)
}));

describe("email signup route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.supabase = undefined;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("emits a generate_lead analytics event for a valid signup", async () => {
    const response = await POST(
      new Request("https://trimproof.com/api/email-signup", {
        method: "POST",
        body: JSON.stringify({
          email: "lead@example.com",
          source: "marketing_home",
          analytics: {
            gaClientId: "123.456",
            gaSessionId: "789",
            pagePath: "/"
          }
        })
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      analytics: {
        status: "sent",
        configured: true,
        provider: "ga4_measurement_protocol"
      }
    });
    expect(mocks.sendServerAnalyticsEvent).toHaveBeenCalledWith({
      name: "generate_lead",
      clientId: "123.456",
      params: {
        source: "marketing_home",
        page_path: "/",
        session_id: 789,
        currency: "USD",
        value: 0
      }
    });
  });

  it("rejects malformed payloads before analytics fire", async () => {
    const response = await POST(
      new Request("https://trimproof.com/api/email-signup", {
        method: "POST",
        body: JSON.stringify({
          email: "not-an-email",
          source: "marketing_home"
        })
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.sendServerAnalyticsEvent).not.toHaveBeenCalled();
  });
});
