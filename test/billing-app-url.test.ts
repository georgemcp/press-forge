import { afterEach, describe, expect, it, vi } from "vitest";
import { getAppUrl } from "@/lib/billing/stripe";

describe("billing app URL", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the configured site origin and strips any path or query", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://trimproof.com/some/path?from=test");
    vi.stubEnv("APP_URL", "https://ignored.example");

    expect(getAppUrl()).toBe("https://trimproof.com");
  });

  it("falls back to APP_URL when NEXT_PUBLIC_APP_URL is empty", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("APP_URL", "https://app.example.test/path");

    expect(getAppUrl()).toBe("https://app.example.test");
  });

  it("rejects a non-http(s) origin instead of using it", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "javascript:alert(1)");
    vi.stubEnv("APP_URL", "");

    expect(getAppUrl()).toBeUndefined();
  });

  it("fails closed in production when no origin is configured", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("APP_URL", "");

    expect(getAppUrl()).toBeUndefined();
  });

  it("falls back to localhost outside production", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("APP_URL", "");

    expect(getAppUrl()).toBe("http://localhost:3000");
  });
});
