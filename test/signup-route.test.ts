import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/auth/signup/route";
import { clearRateLimitState } from "@/lib/security/request";

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  userUpsert: vi.fn(),
  emailUpsert: vi.fn()
}));

vi.mock("@/lib/db/supabase", () => ({
  createAnonSupabaseClient: () => ({ auth: { signUp: mocks.signUp } }),
  createServiceSupabaseClient: () => ({
    from: (table: string) => ({
      upsert: table === "users" ? mocks.userUpsert : mocks.emailUpsert
    })
  })
}));

const validPayload = {
  email: "buyer@example.com",
  password: "StrongPassword123",
  fullName: "Buyer Example",
  companyName: "Example Print",
  role: "Owner",
  companyWebsite: "example.com",
  phone: "",
  monthlyPrintJobs: "1-3",
  primaryUseCase: "business_cards",
  planInterest: "demo",
  marketingConsent: true
};

describe("account signup security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRateLimitState();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://trimproof.com");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    vi.stubEnv("TRIMPROOF_AUTH_SESSION_SECRET", "account-session-secret");
    mocks.signUp.mockResolvedValue({
      data: {
        user: { id: "6df3f657-766d-4f15-8af8-a3a8ccda0b04", email: validPayload.email, email_confirmed_at: null },
        session: null
      },
      error: null
    });
    mocks.userUpsert.mockResolvedValue({ error: null });
    mocks.emailUpsert.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearRateLimitState();
  });

  it("uses verified-email signup and issues no application session", async () => {
    const response = await POST(new Request("https://trimproof.com/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://trimproof.com",
        "Sec-Fetch-Site": "same-origin"
      },
      body: JSON.stringify(validPayload)
    }));

    expect(response.status).toBe(202);
    expect(response.headers.get("set-cookie")).toBeNull();
    await expect(response.json()).resolves.toMatchObject({ ok: true, requiresEmailConfirmation: true });
    expect(mocks.signUp).toHaveBeenCalledWith(expect.objectContaining({
      email: validPayload.email,
      options: expect.objectContaining({ emailRedirectTo: "https://trimproof.com/login?verified=1" })
    }));
  });

  it("rejects a cross-site form before creating an auth user", async () => {
    const response = await POST(new Request("https://trimproof.com/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://attacker.example",
        "Sec-Fetch-Site": "cross-site"
      },
      body: JSON.stringify(validPayload)
    }));

    expect(response.status).toBe(403);
    expect(mocks.signUp).not.toHaveBeenCalled();
  });
});
