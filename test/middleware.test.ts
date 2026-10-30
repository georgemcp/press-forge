import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

describe("app middleware redirects", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds the signup redirect from the configured origin when the Host header is forged", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://trimproof.com");

    const response = middleware(new NextRequest("https://attacker.example/app?mode=advanced"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `https://trimproof.com/signup?next=${encodeURIComponent("/app?mode=advanced")}`
    );
    expect(response.headers.get("location")).not.toContain("attacker.example");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("fails closed in production when no configured origin is usable", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("APP_URL", "");
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = middleware(new NextRequest("https://attacker.example/app"));

    expect(response.status).toBe(503);
    expect(response.headers.get("location")).toBeNull();
  });

  it("passes through to the app when an account session cookie exists", () => {
    const response = middleware(new NextRequest("https://trimproof.com/app", {
      headers: { cookie: "trimproof_account=session" }
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
