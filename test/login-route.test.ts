import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/auth/login/route";
import { clearRateLimitState } from "@/lib/security/request";

const mocks = vi.hoisted(() => ({
  signIn: vi.fn()
}));

vi.mock("@/lib/db/supabase", () => ({
  createAnonSupabaseClient: () => ({ auth: { signInWithPassword: mocks.signIn } })
}));

vi.mock("@/lib/auth/account-session", () => ({
  ACCOUNT_SESSION_COOKIE: "trimproof_account",
  createAccountSessionValue: () => "signed-session",
  getAccountSessionCookieOptions: () => ({ httpOnly: true, path: "/" }),
  isAccountAuthConfigured: () => true
}));

function formLoginRequest(nextPath: string) {
  return new Request("https://attacker.example/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: "https://trimproof.com",
      "Sec-Fetch-Site": "same-origin"
    },
    body: new URLSearchParams({
      email: "buyer@example.com",
      password: "correct horse battery",
      nextPath
    })
  });
}

describe("account login redirects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRateLimitState();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://trimproof.com");
    mocks.signIn.mockResolvedValue({
      data: { user: { id: "user_test", email: "buyer@example.com" } },
      error: null
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearRateLimitState();
  });

  it("returns a relative Location that never reflects the Host header", async () => {
    const response = await POST(formLoginRequest("/app?mode=advanced"));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/app?mode=advanced");
    expect(response.headers.get("location")).not.toContain("attacker.example");
    expect(response.headers.get("set-cookie")).toContain("trimproof_account=signed-session");
  });

  it("falls back to an internal path for an off-site next value", async () => {
    const response = await POST(formLoginRequest("//attacker.example/app"));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/app");
  });
});
