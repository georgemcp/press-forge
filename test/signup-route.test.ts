import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/auth/signup/route";
import { clearRateLimitState } from "@/lib/security/request";

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  emailUpsert: vi.fn(),
  from: vi.fn(),
  serviceClient: vi.fn()
}));

vi.mock("@/lib/db/supabase", () => ({
  createAnonSupabaseClient: () => ({ auth: { signUp: mocks.signUp } }),
  createServiceSupabaseClient: () => mocks.serviceClient()
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

const acceptedBody = JSON.stringify({
  ok: true,
  requiresEmailConfirmation: true,
  message: "Check your email and verify your address before signing in."
});

function signupRequest(payload: Record<string, unknown> = validPayload) {
  return new Request("https://trimproof.com/api/auth/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://trimproof.com",
      "Sec-Fetch-Site": "same-origin"
    },
    body: JSON.stringify(payload)
  });
}

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
        user: {
          id: "6df3f657-766d-4f15-8af8-a3a8ccda0b04",
          email: validPayload.email,
          email_confirmed_at: null,
          identities: [{ identity_id: "new-email-identity" }]
        },
        session: null
      },
      error: null
    });
    mocks.emailUpsert.mockResolvedValue({ error: null });
    mocks.from.mockImplementation((table: string) => {
      if (table !== "email_signups") {
        throw new Error(`Unexpected service-role table access: ${table}`);
      }
      return { upsert: mocks.emailUpsert };
    });
    mocks.serviceClient.mockReturnValue({ from: mocks.from });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearRateLimitState();
  });

  it("passes every validated profile field to verified-email signup without writing public.users", async () => {
    const response = await POST(signupRequest());

    expect(response.status).toBe(202);
    expect(response.headers.get("set-cookie")).toBeNull();
    await expect(response.text()).resolves.toBe(acceptedBody);
    expect(mocks.signUp).toHaveBeenCalledWith({
      email: validPayload.email,
      password: validPayload.password,
      options: {
        emailRedirectTo: "https://trimproof.com/login?verified=1",
        data: {
          full_name: validPayload.fullName,
          company_name: validPayload.companyName,
          role: validPayload.role,
          company_website: "https://example.com",
          phone: null,
          monthly_print_jobs: validPayload.monthlyPrintJobs,
          primary_use_case: validPayload.primaryUseCase,
          plan_interest: validPayload.planInterest,
          marketing_consent: true
        }
      }
    });
    expect(mocks.from).toHaveBeenCalledTimes(1);
    expect(mocks.from).toHaveBeenCalledWith("email_signups");
    expect(mocks.emailUpsert).toHaveBeenCalledWith(
      { email: validPayload.email, source: "account_demo" },
      { onConflict: "email" }
    );
  });

  it("returns the byte-for-byte accepted response for an obfuscated existing user", async () => {
    const realResponse = await POST(signupRequest());
    const realBody = await realResponse.text();
    mocks.from.mockClear();
    mocks.emailUpsert.mockClear();
    mocks.signUp.mockResolvedValueOnce({
      data: {
        user: {
          id: "00000000-0000-0000-0000-000000000000",
          email: validPayload.email,
          identities: []
        },
        session: null
      },
      error: null
    });

    const existingResponse = await POST(signupRequest());

    expect(existingResponse.status).toBe(realResponse.status);
    expect(existingResponse.headers.get("content-type")).toBe(realResponse.headers.get("content-type"));
    await expect(existingResponse.text()).resolves.toBe(realBody);
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.emailUpsert).not.toHaveBeenCalled();
  });

  it("does not expose an auth or database error detail", async () => {
    mocks.signUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: "Database error saving new user: secret relation detail" }
    });

    const response = await POST(signupRequest());
    const body = await response.text();

    expect(response.status).toBe(400);
    expect(body).toBe(JSON.stringify({ error: "Account could not be created." }));
    expect(body).not.toContain("Database error");
    expect(body).not.toContain("secret relation detail");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("treats marketing persistence as a non-blocking secondary write", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.emailUpsert.mockResolvedValueOnce({
      error: { message: "private database detail" }
    });

    const response = await POST(signupRequest());
    const body = await response.text();

    expect(response.status).toBe(202);
    expect(body).toBe(acceptedBody);
    expect(body).not.toContain("private database detail");
    expect(consoleError).toHaveBeenCalledWith("Trim Proof signup marketing consent persistence failed");
    expect(consoleError.mock.calls[0]).toHaveLength(1);
    consoleError.mockRestore();
  });

  it("does not persist marketing signup without explicit consent", async () => {
    const payloadWithoutConsent = Object.fromEntries(
      Object.entries(validPayload).filter(([key]) => key !== "marketingConsent")
    );

    const response = await POST(signupRequest(payloadWithoutConsent));

    expect(response.status).toBe(202);
    expect(mocks.serviceClient).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.signUp).toHaveBeenCalledWith(expect.objectContaining({
      options: expect.objectContaining({
        data: expect.objectContaining({ marketing_consent: false })
      })
    }));
  });

  it("does not fail account creation when marketing storage is unavailable", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    mocks.serviceClient.mockReturnValueOnce(undefined);

    const response = await POST(signupRequest());

    expect(response.status).toBe(202);
    await expect(response.text()).resolves.toBe(acceptedBody);
    expect(consoleError).toHaveBeenCalledWith("Trim Proof signup marketing consent persistence is unavailable");
    consoleError.mockRestore();
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
