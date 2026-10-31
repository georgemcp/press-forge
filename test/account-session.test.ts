import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAccountSessionValue,
  isAccountAuthConfigured,
  verifyAccountSessionValue
} from "@/lib/auth/account-session";
import { LEGACY_SESSION_KEYS_UNTIL } from "@/lib/security/legacy-session-keys";

const userId = "6df3f657-766d-4f15-8af8-a3a8ccda0b04";
const email = "owner@example.com";
const ttlMs = 7 * 24 * 60 * 60 * 1000;
const derivedKeyLabel = "press-forge:account-session:v1";

function clearSessionSecrets() {
  vi.stubEnv("ACCOUNT_SESSION_SECRET", "");
  vi.stubEnv("TRIMPROOF_AUTH_SESSION_SECRET", "");
  vi.stubEnv("TRIMPROOF_ADMIN_SESSION_SECRET", "");
  vi.stubEnv("NEXTAUTH_SECRET", "");
}

function legacyToken(secret: string | Buffer, now: number, expiresAt = now + ttlMs) {
  const payload = `v2.${now}.${expiresAt}.${Buffer.from(userId).toString("base64url")}.${Buffer.from(email).toString("base64url")}`;
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function payloadOf(token: string) {
  return token.split(".").slice(0, 5).join(".");
}

function signatureOf(token: string) {
  return token.split(".").at(-1) as string;
}

function hmac(secret: string | Buffer, value: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function deriveKey(secret: string) {
  return createHmac("sha256", secret).update(derivedKeyLabel).digest();
}

describe("account session cookies", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("signs a short-lived versioned session and rejects tampering and legacy cookies", () => {
    clearSessionSecrets();
    vi.stubEnv("TRIMPROOF_AUTH_SESSION_SECRET", "strong-session-secret");
    const now = new Date("2026-07-17T12:00:00Z").getTime();
    const cookie = createAccountSessionValue({ userId, email: "OWNER@EXAMPLE.COM" }, now);

    expect(verifyAccountSessionValue(cookie, now + 1000)).toMatchObject({
      userId,
      email,
      issuedAt: now
    });
    expect(verifyAccountSessionValue(`${cookie}x`, now + 1000)).toBeUndefined();
    expect(verifyAccountSessionValue("v1.legacy.cookie.value.signature", now)).toBeUndefined();
    expect(verifyAccountSessionValue(cookie, now + 8 * 24 * 60 * 60 * 1000)).toBeUndefined();
  });

  it("prefers a dedicated ACCOUNT_SESSION_SECRET over the shared NextAuth secret", () => {
    clearSessionSecrets();
    vi.stubEnv("ACCOUNT_SESSION_SECRET", "account-session-secret");
    vi.stubEnv("NEXTAUTH_SECRET", "shared-nextauth-secret");
    const now = new Date("2026-10-30T12:00:00Z").getTime();

    const cookie = createAccountSessionValue({ userId, email }, now);
    const payload = payloadOf(cookie);

    expect(signatureOf(cookie)).toBe(hmac("account-session-secret", payload));
    // The shared secret must never be a valid signing key for this token type.
    expect(signatureOf(cookie)).not.toBe(hmac("shared-nextauth-secret", payload));
    expect(verifyAccountSessionValue(cookie, now + 1000)).toMatchObject({ userId, email });
  });

  it("derives a domain-separated key when only NEXTAUTH_SECRET is configured", () => {
    clearSessionSecrets();
    vi.stubEnv("NEXTAUTH_SECRET", "shared-nextauth-secret");
    const now = new Date("2026-10-30T12:00:00Z").getTime();
    const derivedKey = deriveKey("shared-nextauth-secret");

    const cookie = createAccountSessionValue({ userId, email }, now);
    const payload = payloadOf(cookie);

    expect(signatureOf(cookie)).toBe(hmac(derivedKey, payload));
    expect(signatureOf(cookie)).not.toBe(hmac("shared-nextauth-secret", payload));
    expect(verifyAccountSessionValue(cookie, now + 1000)).toMatchObject({ userId, email });
  });

  it("accepts old-key tokens for verification only until their natural expiry", () => {
    clearSessionSecrets();
    vi.stubEnv("ACCOUNT_SESSION_SECRET", "new-account-session-secret");
    vi.stubEnv("TRIMPROOF_ADMIN_SESSION_SECRET", "old-shared-admin-secret");
    vi.stubEnv("NEXTAUTH_SECRET", "shared-nextauth-secret");
    const now = new Date("2026-10-30T12:00:00Z").getTime();
    const expiresAt = now + ttlMs;

    // Pre-change code fell back to TRIMPROOF_ADMIN_SESSION_SECRET.
    const oldCookie = legacyToken("old-shared-admin-secret", now, expiresAt);
    expect(verifyAccountSessionValue(oldCookie, now + 1000)).toMatchObject({ userId, email });
    expect(verifyAccountSessionValue(oldCookie, expiresAt + 1)).toBeUndefined();

    // New tokens are signed with the dedicated key, never the legacy one.
    const newCookie = createAccountSessionValue({ userId, email }, now);
    expect(signatureOf(newCookie)).toBe(hmac("new-account-session-secret", payloadOf(newCookie)));
    expect(signatureOf(newCookie)).not.toBe(hmac("old-shared-admin-secret", payloadOf(newCookie)));
    expect(verifyAccountSessionValue(newCookie, now + 1000)).toMatchObject({ userId, email });
  });

  it("fails closed when no dedicated or NextAuth secret is configured", () => {
    clearSessionSecrets();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    const now = new Date("2026-10-30T12:00:00Z").getTime();
    const orphanedCookie = legacyToken("orphaned-secret", now);

    expect(() => createAccountSessionValue({ userId, email }, now)).toThrow("Account session secret is not configured.");
    expect(verifyAccountSessionValue(orphanedCookie, now + 1000)).toBeUndefined();
    expect(isAccountAuthConfigured()).toBe(false);
  });

  it("derives from an existing TRIMPROOF_AUTH_SESSION_SECRET and still verifies raw-key cookies before the cutoff", () => {
    clearSessionSecrets();
    vi.stubEnv("TRIMPROOF_AUTH_SESSION_SECRET", "existing-dedicated-secret");
    vi.stubEnv("NEXTAUTH_SECRET", "shared-nextauth-secret");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    const now = new Date("2026-10-30T12:00:00Z").getTime();

    const cookie = createAccountSessionValue({ userId, email }, now);
    const rawSecretKey = deriveKey("existing-dedicated-secret");

    expect(signatureOf(cookie)).toBe(hmac(rawSecretKey, payloadOf(cookie)));
    expect(signatureOf(cookie)).not.toBe(hmac("existing-dedicated-secret", payloadOf(cookie)));
    expect(isAccountAuthConfigured()).toBe(true);

    // Releases before this change signed with the raw secret; those cookies
    // must keep verifying until the hard cutoff.
    const oldCookie = legacyToken("existing-dedicated-secret", now);
    expect(verifyAccountSessionValue(oldCookie, now + 1000)).toMatchObject({ userId, email });
  });

  it("falls back to a derived key from TRIMPROOF_ADMIN_SESSION_SECRET", () => {
    clearSessionSecrets();
    vi.stubEnv("TRIMPROOF_ADMIN_SESSION_SECRET", "old-shared-admin-secret");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    const now = new Date("2026-10-30T12:00:00Z").getTime();

    const cookie = createAccountSessionValue({ userId, email }, now);

    expect(signatureOf(cookie)).toBe(hmac(deriveKey("old-shared-admin-secret"), payloadOf(cookie)));
    expect(signatureOf(cookie)).not.toBe(hmac("old-shared-admin-secret", payloadOf(cookie)));
    expect(verifyAccountSessionValue(cookie, now + 1000)).toMatchObject({ userId, email });
    expect(isAccountAuthConfigured()).toBe(true);
  });

  it("prefers TRIMPROOF_AUTH_SESSION_SECRET over the other derived fallbacks", () => {
    clearSessionSecrets();
    vi.stubEnv("TRIMPROOF_AUTH_SESSION_SECRET", "auth-session-secret");
    vi.stubEnv("NEXTAUTH_SECRET", "shared-nextauth-secret");
    vi.stubEnv("TRIMPROOF_ADMIN_SESSION_SECRET", "shared-admin-secret");
    const now = new Date("2026-10-30T12:00:00Z").getTime();

    const cookie = createAccountSessionValue({ userId, email }, now);

    expect(signatureOf(cookie)).toBe(hmac(deriveKey("auth-session-secret"), payloadOf(cookie)));
    expect(signatureOf(cookie)).not.toBe(hmac(deriveKey("shared-nextauth-secret"), payloadOf(cookie)));
    expect(signatureOf(cookie)).not.toBe(hmac(deriveKey("shared-admin-secret"), payloadOf(cookie)));
  });

  it("stops verifying legacy raw-key cookies at the hard cutoff", () => {
    clearSessionSecrets();
    vi.stubEnv("ACCOUNT_SESSION_SECRET", "new-account-session-secret");
    vi.stubEnv("NEXTAUTH_SECRET", "shared-nextauth-secret");
    const issuedAt = LEGACY_SESSION_KEYS_UNTIL - 60 * 60 * 1000;
    const expiresAt = LEGACY_SESSION_KEYS_UNTIL + 60 * 60 * 1000;
    // Signed with a legacy raw secret, and still within its own signed expiry
    // at the cutoff, so only the cutoff can reject it.
    const legacyCookie = legacyToken("shared-nextauth-secret", issuedAt, expiresAt);

    vi.useFakeTimers();

    vi.setSystemTime(LEGACY_SESSION_KEYS_UNTIL - 1000);
    expect(verifyAccountSessionValue(legacyCookie)).toMatchObject({ userId, email });

    vi.setSystemTime(LEGACY_SESSION_KEYS_UNTIL);
    expect(verifyAccountSessionValue(legacyCookie)).toBeUndefined();

    vi.setSystemTime(LEGACY_SESSION_KEYS_UNTIL + 1000);
    expect(verifyAccountSessionValue(legacyCookie)).toBeUndefined();

    // Tokens signed with the current key keep verifying after the cutoff.
    const currentCookie = createAccountSessionValue({ userId, email });
    expect(signatureOf(currentCookie)).toBe(hmac("new-account-session-secret", payloadOf(currentCookie)));
    expect(verifyAccountSessionValue(currentCookie)).toMatchObject({ userId, email });
  });
});
