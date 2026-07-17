import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdminPasswordHash, createAdminSessionValue, isAdminAuthConfigured, validateAdminCredentials, verifyAdminSessionValue } from "@/lib/admin/auth";

describe("admin auth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("requires an email, a password, and a signing secret", () => {
    vi.stubEnv("TRIMPROOF_ADMIN_EMAIL", "");
    vi.stubEnv("TRIMPROOF_ADMIN_PASSWORD", "secret");
    vi.stubEnv("TRIMPROOF_ADMIN_SESSION_SECRET", "session-secret");

    expect(isAdminAuthConfigured()).toBe(false);

    vi.stubEnv("TRIMPROOF_ADMIN_EMAIL", "owner@trimproof.com");

    expect(isAdminAuthConfigured()).toBe(true);
  });

  it("validates super admin credentials without exposing the stored value", () => {
    vi.stubEnv("TRIMPROOF_ADMIN_EMAIL", "Owner@TrimProof.com");
    vi.stubEnv("TRIMPROOF_ADMIN_PASSWORD", "correct-password");

    expect(validateAdminCredentials("owner@trimproof.com", "correct-password")).toBe(true);
    expect(validateAdminCredentials("wrong@trimproof.com", "correct-password")).toBe(false);
    expect(validateAdminCredentials("owner@trimproof.com", "wrong-password")).toBe(false);
  });

  it("validates a scrypt password hash and rejects plaintext in production", () => {
    const password = "a-strong-admin-password";
    vi.stubEnv("TRIMPROOF_ADMIN_EMAIL", "owner@trimproof.com");
    vi.stubEnv("TRIMPROOF_ADMIN_PASSWORD_HASH", createAdminPasswordHash(password, Buffer.alloc(16, 7)));
    vi.stubEnv("TRIMPROOF_ADMIN_SESSION_SECRET", "session-secret");

    expect(validateAdminCredentials("owner@trimproof.com", password)).toBe(true);
    expect(validateAdminCredentials("owner@trimproof.com", "wrong-password")).toBe(false);

    vi.stubEnv("TRIMPROOF_ADMIN_PASSWORD_HASH", "");
    vi.stubEnv("TRIMPROOF_ADMIN_PASSWORD", password);
    vi.stubEnv("NODE_ENV", "production");
    expect(isAdminAuthConfigured()).toBe(false);
  });

  it("signs, verifies, rejects tampered, and expires admin sessions", () => {
    vi.stubEnv("TRIMPROOF_ADMIN_EMAIL", "owner@trimproof.com");
    vi.stubEnv("TRIMPROOF_ADMIN_PASSWORD", "secret");
    vi.stubEnv("TRIMPROOF_ADMIN_SESSION_SECRET", "session-secret");
    const now = new Date("2026-06-05T12:00:00Z").getTime();
    const session = createAdminSessionValue(now);

    expect(verifyAdminSessionValue(session, now + 1000)).toBe(true);
    expect(verifyAdminSessionValue(`${session}x`, now + 1000)).toBe(false);
    expect(verifyAdminSessionValue(session, now + 9 * 60 * 60 * 1000)).toBe(false);

    vi.stubEnv("TRIMPROOF_ADMIN_EMAIL", "new-owner@trimproof.com");
    expect(verifyAdminSessionValue(session, now + 1000)).toBe(false);
  });

  it("revokes an existing session when the password credential rotates", () => {
    vi.stubEnv("TRIMPROOF_ADMIN_EMAIL", "owner@trimproof.com");
    vi.stubEnv("TRIMPROOF_ADMIN_PASSWORD_HASH", createAdminPasswordHash("first-strong-password", Buffer.alloc(16, 1)));
    vi.stubEnv("TRIMPROOF_ADMIN_SESSION_SECRET", "session-secret");
    const session = createAdminSessionValue();

    vi.stubEnv("TRIMPROOF_ADMIN_PASSWORD_HASH", createAdminPasswordHash("second-strong-password", Buffer.alloc(16, 2)));
    expect(verifyAdminSessionValue(session)).toBe(false);
  });
});
