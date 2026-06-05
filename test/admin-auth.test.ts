import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdminSessionValue, isAdminAuthConfigured, validateAdminPassword, verifyAdminSessionValue } from "@/lib/admin/auth";

describe("admin auth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("requires both a password and a signing secret", () => {
    vi.stubEnv("TRIMPROOF_ADMIN_PASSWORD", "secret");
    vi.stubEnv("TRIMPROOF_ADMIN_SESSION_SECRET", "");

    expect(isAdminAuthConfigured()).toBe(false);

    vi.stubEnv("TRIMPROOF_ADMIN_SESSION_SECRET", "session-secret");

    expect(isAdminAuthConfigured()).toBe(true);
  });

  it("validates passwords without exposing the stored value", () => {
    vi.stubEnv("TRIMPROOF_ADMIN_PASSWORD", "correct-password");

    expect(validateAdminPassword("correct-password")).toBe(true);
    expect(validateAdminPassword("wrong-password")).toBe(false);
  });

  it("signs, verifies, rejects tampered, and expires admin sessions", () => {
    vi.stubEnv("TRIMPROOF_ADMIN_PASSWORD", "secret");
    vi.stubEnv("TRIMPROOF_ADMIN_SESSION_SECRET", "session-secret");
    const now = new Date("2026-06-05T12:00:00Z").getTime();
    const session = createAdminSessionValue(now);

    expect(verifyAdminSessionValue(session, now + 1000)).toBe(true);
    expect(verifyAdminSessionValue(`${session}x`, now + 1000)).toBe(false);
    expect(verifyAdminSessionValue(session, now + 9 * 60 * 60 * 1000)).toBe(false);
  });
});
