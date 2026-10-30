import { afterEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, clearRateLimitState, getForwardedIp, getTrustedAppOrigin, isSameOriginMutation } from "@/lib/security/request";
import { safeInternalPath } from "@/lib/security/navigation";

describe("security request helpers", () => {
  afterEach(() => {
    clearRateLimitState();
    vi.unstubAllEnvs();
  });

  it("rejects cross-site mutations", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://trimproof.com");
    const crossSite = new Request("https://trimproof.com/api/auth/login", {
      method: "POST",
      headers: {
        Origin: "https://attacker.example",
        "Sec-Fetch-Site": "cross-site"
      }
    });
    const sameSite = new Request("https://trimproof.com/api/auth/login", {
      method: "POST",
      headers: {
        Origin: "https://trimproof.com",
        "Sec-Fetch-Site": "same-origin"
      }
    });

    expect(isSameOriginMutation(crossSite)).toBe(false);
    expect(isSameOriginMutation(sameSite)).toBe(true);
  });

  it("uses the configured origin and ignores a forged Host header in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://trimproof.com");
    vi.stubEnv("APP_URL", "");

    const forgedHost = new Request("https://attacker.example/api/auth/signup", {
      method: "POST",
      headers: {
        Origin: "https://trimproof.com",
        "Sec-Fetch-Site": "same-origin"
      }
    });

    expect(getTrustedAppOrigin(forgedHost)).toBe("https://trimproof.com");
    expect(isSameOriginMutation(forgedHost)).toBe(true);
    expect(isSameOriginMutation(new Request("https://attacker.example/api/auth/signup", {
      method: "POST",
      headers: { Origin: "https://attacker.example" }
    }))).toBe(false);
  });

  it("fails closed in production when no configured origin is usable", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "not a url");
    vi.stubEnv("APP_URL", "");

    const request = new Request("https://trimproof.com/api/auth/signup", {
      method: "POST",
      headers: { Origin: "https://trimproof.com", "Sec-Fetch-Site": "same-origin" }
    });

    expect(getTrustedAppOrigin(request)).toBeUndefined();
    expect(isSameOriginMutation(request)).toBe(false);
  });

  it("keeps the request-origin fallback in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("APP_URL", "");

    const request = new Request("http://localhost:3000/api/auth/signup");

    expect(getTrustedAppOrigin(request)).toBe("http://localhost:3000");
  });

  it("rejects configured origins that are not http or https", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "javascript:alert(1)");
    vi.stubEnv("APP_URL", "");

    expect(getTrustedAppOrigin(new Request("https://trimproof.com/"))).toBeUndefined();
  });

  it("enforces a fixed-window request limit", () => {
    const options = { namespace: "test", key: "203.0.113.10", limit: 2, windowMs: 60_000 };

    expect(checkRateLimit(options, 1_000).allowed).toBe(true);
    expect(checkRateLimit(options, 1_001).allowed).toBe(true);
    expect(checkRateLimit(options, 1_002)).toMatchObject({ allowed: false, remaining: 0 });
    expect(checkRateLimit(options, 61_001).allowed).toBe(true);
  });

  it("keeps redirects on an internal path", () => {
    expect(safeInternalPath("/app?mode=advanced")).toBe("/app?mode=advanced");
    expect(safeInternalPath("//evil.example", "/login")).toBe("/login");
    expect(safeInternalPath("/\\evil.example", "/login")).toBe("/login");
    expect(safeInternalPath("/%5cevil.example", "/login")).toBe("/login");
    expect(safeInternalPath("javascript:alert(1)", "/login")).toBe("/login");
  });

  it("prefers the reverse proxy's real client address over spoofed forwarding values", () => {
    const headers = new Headers({
      "X-Real-IP": "203.0.113.20",
      "X-Forwarded-For": "198.51.100.99, 203.0.113.20"
    });

    expect(getForwardedIp(headers)).toBe("203.0.113.20");
  });
});
