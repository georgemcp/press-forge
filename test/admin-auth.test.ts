import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdminPasswordHash, createAdminSessionValue, isAdminAuthConfigured, validateAdminCredentials, verifyAdminSessionValue } from "@/lib/admin/auth";

describe("admin auth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("requires an email, a password hash, and a signing secret", () => {
    vi.stubEnv("TRIMPROOF_ADMIN_EMAIL", "");
    vi.stubEnv("TRIMPROOF_ADMIN_PASSWORD_HASH", createAdminPasswordHash("a-strong-admin-password", Buffer.alloc(16, 3)));
    vi.stubEnv("TRIMPROOF_ADMIN_SESSION_SECRET", "session-secret");

    expect(isAdminAuthConfigured()).toBe(false);

    vi.stubEnv("TRIMPROOF_ADMIN_EMAIL", "owner@trimproof.com");

    expect(isAdminAuthConfigured()).toBe(true);
  });

  it.each(["development", "test", "production"])("validates a scrypt-hashed admin credential in %s", (nodeEnv) => {
    const password = "a-strong-admin-password";
    vi.stubEnv("NODE_ENV", nodeEnv);
    vi.stubEnv("TRIMPROOF_ADMIN_EMAIL", "Owner@TrimProof.com");
    vi.stubEnv("TRIMPROOF_ADMIN_PASSWORD_HASH", createAdminPasswordHash(password, Buffer.alloc(16, 7)));

    expect(validateAdminCredentials("owner@trimproof.com", password)).toBe(true);
    expect(validateAdminCredentials("wrong@trimproof.com", password)).toBe(false);
    expect(validateAdminCredentials("owner@trimproof.com", "wrong-password")).toBe(false);
  });

  it.each([
    ["development", "TRIMPROOF_ADMIN_PASSWORD"],
    ["development", "ADMIN_DASHBOARD_PASSWORD"],
    ["test", "TRIMPROOF_ADMIN_PASSWORD"],
    ["test", "ADMIN_DASHBOARD_PASSWORD"],
    ["production", "TRIMPROOF_ADMIN_PASSWORD"],
    ["production", "ADMIN_DASHBOARD_PASSWORD"]
  ])("ignores %s plaintext admin password variable %s", (nodeEnv, variableName) => {
    const plaintextPassword = "a-strong-admin-password";
    vi.stubEnv("TRIMPROOF_ADMIN_EMAIL", "owner@trimproof.com");
    vi.stubEnv("TRIMPROOF_ADMIN_SESSION_SECRET", "session-secret");
    vi.stubEnv(variableName, plaintextPassword);
    vi.stubEnv("NODE_ENV", nodeEnv);

    expect(isAdminAuthConfigured()).toBe(false);
    expect(validateAdminCredentials("owner@trimproof.com", plaintextPassword)).toBe(false);
  });

  it("rejects a value that is not an encoded scrypt hash", () => {
    vi.stubEnv("TRIMPROOF_ADMIN_EMAIL", "owner@trimproof.com");
    vi.stubEnv("TRIMPROOF_ADMIN_PASSWORD_HASH", "a-strong-admin-password");
    vi.stubEnv("TRIMPROOF_ADMIN_SESSION_SECRET", "session-secret");

    expect(isAdminAuthConfigured()).toBe(false);
    expect(validateAdminCredentials("owner@trimproof.com", "a-strong-admin-password")).toBe(false);
    expect(() => createAdminSessionValue()).toThrow("Admin password hash is not configured.");
  });

  it("signs, verifies, rejects tampered, and expires admin sessions", () => {
    vi.stubEnv("TRIMPROOF_ADMIN_EMAIL", "owner@trimproof.com");
    vi.stubEnv("TRIMPROOF_ADMIN_PASSWORD_HASH", createAdminPasswordHash("a-strong-admin-password", Buffer.alloc(16, 4)));
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
