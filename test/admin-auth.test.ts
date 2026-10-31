import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdminPasswordHash, createAdminSessionValue, isAdminAuthConfigured, validateAdminCredentials, verifyAdminSessionValue } from "@/lib/admin/auth";
import { LEGACY_SESSION_KEYS_UNTIL } from "@/lib/security/legacy-session-keys";

const derivedKeyLabel = "press-forge:admin-session:v1";

function clearAdminSessionSecrets() {
  vi.stubEnv("TRIMPROOF_ADMIN_SESSION_SECRET", "");
  vi.stubEnv("ADMIN_DASHBOARD_SESSION_SECRET", "");
  vi.stubEnv("NEXTAUTH_SECRET", "");
}

function legacyAdminToken(key: string, email: string, passwordHash: string, now: number, expiresAt = now + 8 * 60 * 60 * 1000) {
  const emailSegment = Buffer.from(email.trim().toLowerCase()).toString("base64url");
  const fingerprint = createHmac("sha256", key).update(passwordHash).digest("base64url").slice(0, 24);
  const payload = `v4.${expiresAt}.${emailSegment}.${fingerprint}`;
  const signature = createHmac("sha256", key).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function hmac(secret: string | Buffer, value: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function deriveKey(secret: string) {
  return createHmac("sha256", secret).update(derivedKeyLabel).digest();
}

describe("admin auth", () => {
  afterEach(() => {
    vi.useRealTimers();
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

  it("derives a domain-separated key when only NEXTAUTH_SECRET is configured", () => {
    clearAdminSessionSecrets();
    vi.stubEnv("TRIMPROOF_ADMIN_EMAIL", "owner@trimproof.com");
    const passwordHash = createAdminPasswordHash("a-strong-admin-password", Buffer.alloc(16, 5));
    vi.stubEnv("TRIMPROOF_ADMIN_PASSWORD_HASH", passwordHash);
    vi.stubEnv("NEXTAUTH_SECRET", "shared-nextauth-secret");
    const now = new Date("2026-10-30T12:00:00Z").getTime();

    const session = createAdminSessionValue(now);
    const [, , emailSegment, fingerprint, signature] = session.split(".");
    const derivedKey = deriveKey("shared-nextauth-secret");

    expect(emailSegment).toBe(Buffer.from("owner@trimproof.com").toString("base64url"));
    expect(fingerprint).toBe(hmac(derivedKey, passwordHash).slice(0, 24));
    expect(fingerprint).not.toBe(hmac("shared-nextauth-secret", passwordHash).slice(0, 24));
    expect(signature).toBe(hmac(derivedKey, `${session.split(".").slice(0, 4).join(".")}`));
    expect(verifyAdminSessionValue(session, now + 1000)).toBe(true);
  });

  it("accepts old-key admin tokens for verification only until their natural expiry", () => {
    clearAdminSessionSecrets();
    vi.stubEnv("TRIMPROOF_ADMIN_EMAIL", "owner@trimproof.com");
    const passwordHash = createAdminPasswordHash("a-strong-admin-password", Buffer.alloc(16, 6));
    vi.stubEnv("TRIMPROOF_ADMIN_PASSWORD_HASH", passwordHash);
    vi.stubEnv("NEXTAUTH_SECRET", "shared-nextauth-secret");
    const now = new Date("2026-10-30T12:00:00Z").getTime();
    const expiresAt = now + 8 * 60 * 60 * 1000;

    // Pre-change code signed and fingerprinted with the raw shared secret.
    const oldSession = legacyAdminToken("shared-nextauth-secret", "owner@trimproof.com", passwordHash, now, expiresAt);
    expect(verifyAdminSessionValue(oldSession, now + 1000)).toBe(true);
    expect(verifyAdminSessionValue(oldSession, expiresAt + 1)).toBe(false);

    // New sessions are signed with the derived key, never the raw secret.
    const newSession = createAdminSessionValue(now);
    expect(newSession.split(".").at(-1)).not.toBe(hmac("shared-nextauth-secret", newSession.split(".").slice(0, 4).join(".")));
    expect(verifyAdminSessionValue(newSession, now + 1000)).toBe(true);
  });

  it("fails closed when no dedicated or NextAuth secret is configured", () => {
    clearAdminSessionSecrets();
    vi.stubEnv("TRIMPROOF_ADMIN_EMAIL", "owner@trimproof.com");
    const passwordHash = createAdminPasswordHash("a-strong-admin-password", Buffer.alloc(16, 7));
    vi.stubEnv("TRIMPROOF_ADMIN_PASSWORD_HASH", passwordHash);
    const now = new Date("2026-10-30T12:00:00Z").getTime();

    expect(isAdminAuthConfigured()).toBe(false);
    expect(() => createAdminSessionValue(now)).toThrow("Admin session secret is not configured.");
    expect(verifyAdminSessionValue(legacyAdminToken("orphaned-secret", "owner@trimproof.com", passwordHash, now), now + 1000)).toBe(false);
  });

  it("stops verifying legacy raw-key sessions at the hard cutoff", () => {
    clearAdminSessionSecrets();
    vi.stubEnv("TRIMPROOF_ADMIN_EMAIL", "owner@trimproof.com");
    const passwordHash = createAdminPasswordHash("a-strong-admin-password", Buffer.alloc(16, 8));
    vi.stubEnv("TRIMPROOF_ADMIN_PASSWORD_HASH", passwordHash);
    vi.stubEnv("TRIMPROOF_ADMIN_SESSION_SECRET", "new-admin-session-secret");
    vi.stubEnv("NEXTAUTH_SECRET", "shared-nextauth-secret");
    const issuedAt = LEGACY_SESSION_KEYS_UNTIL - 60 * 60 * 1000;
    const expiresAt = LEGACY_SESSION_KEYS_UNTIL + 60 * 60 * 1000;
    // Signed with a legacy raw secret, and still within its own signed expiry
    // at the cutoff, so only the cutoff can reject it.
    const legacySession = legacyAdminToken("shared-nextauth-secret", "owner@trimproof.com", passwordHash, issuedAt, expiresAt);

    vi.useFakeTimers();

    vi.setSystemTime(LEGACY_SESSION_KEYS_UNTIL - 1000);
    expect(verifyAdminSessionValue(legacySession)).toBe(true);

    vi.setSystemTime(LEGACY_SESSION_KEYS_UNTIL);
    expect(verifyAdminSessionValue(legacySession)).toBe(false);

    vi.setSystemTime(LEGACY_SESSION_KEYS_UNTIL + 1000);
    expect(verifyAdminSessionValue(legacySession)).toBe(false);

    // Sessions signed with the current key keep verifying after the cutoff.
    const currentSession = createAdminSessionValue();
    expect(verifyAdminSessionValue(currentSession)).toBe(true);
    expect(currentSession.split(".").at(-1)).not.toBe(hmac("shared-nextauth-secret", currentSession.split(".").slice(0, 4).join(".")));
  });
});
