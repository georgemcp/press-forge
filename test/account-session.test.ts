import { afterEach, describe, expect, it, vi } from "vitest";
import { createAccountSessionValue, verifyAccountSessionValue } from "@/lib/auth/account-session";

describe("account session cookies", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("signs a short-lived versioned session and rejects tampering and legacy cookies", () => {
    vi.stubEnv("TRIMPROOF_AUTH_SESSION_SECRET", "strong-session-secret");
    const now = new Date("2026-07-17T12:00:00Z").getTime();
    const cookie = createAccountSessionValue({
      userId: "6df3f657-766d-4f15-8af8-a3a8ccda0b04",
      email: "OWNER@EXAMPLE.COM"
    }, now);

    expect(verifyAccountSessionValue(cookie, now + 1000)).toMatchObject({
      userId: "6df3f657-766d-4f15-8af8-a3a8ccda0b04",
      email: "owner@example.com",
      issuedAt: now
    });
    expect(verifyAccountSessionValue(`${cookie}x`, now + 1000)).toBeUndefined();
    expect(verifyAccountSessionValue("v1.legacy.cookie.value.signature", now)).toBeUndefined();
    expect(verifyAccountSessionValue(cookie, now + 8 * 24 * 60 * 60 * 1000)).toBeUndefined();
  });
});
