import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/email-signup/route";
import { clearRateLimitState } from "@/lib/security/request";

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  analytics: vi.fn(),
  upsert: vi.fn(),
  supabase: undefined as unknown,
  afterTasks: [] as Array<() => unknown>
}));

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (task: () => unknown) => mocks.afterTasks.push(task)
}));
vi.mock("@/lib/email/transactional", () => ({
  sendTransactionalEmail: mocks.send,
  getAdminSignupRecipients: () => ["ops@example.com"]
}));
vi.mock("@/lib/analytics/server-events", () => ({ sendServerAnalyticsEvent: mocks.analytics }));
vi.mock("@/lib/db/supabase", () => ({ createServiceSupabaseClient: () => mocks.supabase }));

function signup(email: string) {
  return POST(new Request("https://trimproof.com/api/email-signup", { method: "POST", body: JSON.stringify({ email, source: "test" }) }));
}

function listReturns(result: { data: unknown; error: unknown }) {
  mocks.upsert.mockReturnValue({ select: async () => result });
  mocks.supabase = { from: () => ({ upsert: mocks.upsert }) };
}

describe("email-signup response is the same for new and known addresses", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearRateLimitState();
    mocks.afterTasks.length = 0;
    mocks.send.mockResolvedValue({ status: "sent", configured: true });
    mocks.analytics.mockResolvedValue({ status: "sent", configured: true });
  });

  it("returns an identical status and body, with no analytics or email keys", async () => {
    listReturns({ data: [{ id: 1 }], error: null });
    const fresh = await signup("new@example.com");
    const freshBody = await fresh.text();

    listReturns({ data: [], error: null });
    const known = await signup("known@example.com");
    const knownBody = await known.text();

    expect(fresh.status).toBe(202);
    expect(known.status).toBe(fresh.status);
    expect(knownBody).toBe(freshBody);
    expect(Object.keys(JSON.parse(freshBody)).sort()).toEqual(["message", "ok"]);
  });

  it("answers before any email or analytics call, and only for a new address", async () => {
    listReturns({ data: [{ id: 1 }], error: null });
    await signup("new@example.com");
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.analytics).not.toHaveBeenCalled();
    expect(mocks.afterTasks).toHaveLength(1);

    await mocks.afterTasks[0]();
    expect(mocks.send).toHaveBeenCalledTimes(2);
    expect(mocks.analytics).toHaveBeenCalledTimes(1);

    mocks.send.mockClear();
    mocks.afterTasks.length = 0;
    listReturns({ data: [], error: null });
    await signup("known@example.com");
    expect(mocks.afterTasks).toHaveLength(0);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("does one database call per request in both cases", async () => {
    listReturns({ data: [{ id: 1 }], error: null });
    await signup("new@example.com");
    listReturns({ data: [], error: null });
    await signup("known@example.com");
    expect(mocks.upsert).toHaveBeenCalledTimes(2);
    expect(mocks.upsert).toHaveBeenCalledWith({ email: "known@example.com", source: "test" }, { onConflict: "email", ignoreDuplicates: true });
  });

  it("still reports a storage failure as 503", async () => {
    listReturns({ data: null, error: { message: "Database unavailable" } });
    const response = await signup("new@example.com");
    expect(response.status).toBe(503);
    expect(mocks.afterTasks).toHaveLength(0);
  });

  it("logs and swallows a failure in the follow-up work", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    listReturns({ data: [{ id: 1 }], error: null });
    mocks.send.mockRejectedValue(new Error("relay down"));
    await signup("new@example.com");
    await expect(mocks.afterTasks[0]()).resolves.toBeUndefined();
    expect(JSON.stringify(error.mock.calls)).toContain("follow-up failed");
    error.mockRestore();
  });
});
