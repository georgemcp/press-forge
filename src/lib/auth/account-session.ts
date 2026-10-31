import { createHmac, timingSafeEqual } from "node:crypto";
import { LEGACY_SESSION_KEYS_UNTIL } from "@/lib/security/legacy-session-keys";

export const ACCOUNT_SESSION_COOKIE = "trimproof_account";

export interface AccountSession {
  userId: string;
  email: string;
  issuedAt?: number;
}

const sessionVersion = "v2";
const sessionTtlSeconds = 60 * 60 * 24 * 7;
// NEXTAUTH_SECRET is a shared secret. Derive a purpose-specific key from it so
// an account-session signature can never be replayed as another token type.
const derivedKeyLabel = "press-forge:account-session:v1";

function firstValue(...values: Array<string | undefined>) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim();
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function deriveSessionKey(baseSecret: string) {
  return createHmac("sha256", baseSecret).update(derivedKeyLabel).digest();
}

/**
 * Key used to sign new account-session tokens.
 *
 * A dedicated ACCOUNT_SESSION_SECRET is used directly. Otherwise a
 * domain-separated key is derived from the first configured shared secret:
 * the pre-existing dedicated TRIMPROOF_AUTH_SESSION_SECRET (so current
 * deployments need no new env var), then NEXTAUTH_SECRET, then the old
 * TRIMPROOF_ADMIN_SESSION_SECRET fallback that earlier releases also accepted.
 * Shared secrets are never used as signing keys directly. When none of these
 * is configured the caller fails closed: no signing and no verification.
 */
function getSigningKey(): string | Buffer | undefined {
  const dedicated = firstValue(process.env.ACCOUNT_SESSION_SECRET);
  if (dedicated) {
    return dedicated;
  }
  const sharedSecret = firstValue(
    process.env.TRIMPROOF_AUTH_SESSION_SECRET,
    process.env.NEXTAUTH_SECRET,
    process.env.TRIMPROOF_ADMIN_SESSION_SECRET
  );
  return sharedSecret ? deriveSessionKey(sharedSecret) : undefined;
}

function getVerificationKeys(now: number): Array<string | Buffer> {
  const signingKey = getSigningKey();
  if (!signingKey) {
    return [];
  }

  const keys: Array<string | Buffer> = [signingKey];
  // Tokens issued before the domain-separated key shipped were signed with the
  // raw secrets below. Accept them for verification only, and only before the
  // hard sunset: every legacy token was issued before this release, so its
  // own expiry (at most 7 days) falls inside that window. After the cutoff the
  // raw keys are not considered at all. New tokens are never signed with a
  // legacy key.
  if (now >= LEGACY_SESSION_KEYS_UNTIL) {
    return keys;
  }
  for (const legacySecret of [
    firstValue(process.env.TRIMPROOF_AUTH_SESSION_SECRET),
    firstValue(process.env.TRIMPROOF_ADMIN_SESSION_SECRET),
    firstValue(process.env.NEXTAUTH_SECRET)
  ]) {
    if (legacySecret && !keys.some((key) => typeof key === "string" && key === legacySecret)) {
      keys.push(legacySecret);
    }
  }
  return keys;
}

function sign(payload: string, key: string | Buffer) {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftHash = createHmac("sha256", "trimproof-account-compare").update(left).digest();
  const rightHash = createHmac("sha256", "trimproof-account-compare").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

function encodeSegment(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeSegment(value: string) {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return undefined;
  }
}

export function isAccountAuthConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && getSigningKey());
}

export function createAccountSessionValue(session: AccountSession, now = Date.now()) {
  const signingKey = getSigningKey();
  if (!signingKey) {
    throw new Error("Account session secret is not configured.");
  }
  const expiresAt = now + sessionTtlSeconds * 1000;
  const payload = `${sessionVersion}.${now}.${expiresAt}.${encodeSegment(session.userId)}.${encodeSegment(normalizeEmail(session.email))}`;
  const signature = sign(payload, signingKey);
  return `${payload}.${signature}`;
}

export function verifyAccountSessionValue(value: string | undefined, now = Date.now()): AccountSession | undefined {
  if (!value) {
    return undefined;
  }
  const [version, issuedAtValue, expiresAtValue, userIdSegment, emailSegment, signature, extra] = value.split(".");
  if (version !== sessionVersion || !issuedAtValue || !expiresAtValue || !userIdSegment || !emailSegment || !signature || extra) {
    return undefined;
  }
  const issuedAt = Number(issuedAtValue);
  const expiresAt = Number(expiresAtValue);
  if (!Number.isFinite(issuedAt) || issuedAt > now + 30_000 || !Number.isFinite(expiresAt) || expiresAt <= now || expiresAt <= issuedAt) {
    return undefined;
  }
  const verificationKeys = getVerificationKeys(now);
  if (verificationKeys.length === 0) {
    return undefined;
  }
  const payload = `${version}.${issuedAtValue}.${expiresAtValue}.${userIdSegment}.${emailSegment}`;
  if (!verificationKeys.some((key) => safeEqual(signature, sign(payload, key)))) {
    return undefined;
  }
  const userId = decodeSegment(userIdSegment);
  const email = decodeSegment(emailSegment);
  if (!userId || !email) {
    return undefined;
  }
  return {
    userId,
    email: normalizeEmail(email),
    issuedAt
  };
}

export function getAccountSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionTtlSeconds
  };
}
