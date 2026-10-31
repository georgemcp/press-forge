import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "trimproof_admin";

const sessionVersion = "v4";
const sessionTtlSeconds = 60 * 60 * 8;
// NEXTAUTH_SECRET is a shared secret. Derive a purpose-specific key from it so
// an admin-session signature can never be replayed as another token type.
const derivedKeyLabel = "press-forge:admin-session:v1";

function firstValue(...values: Array<string | undefined>) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim();
}

export function normalizeAdminLoginEmail(value: string) {
  return value.trim().toLowerCase();
}

export function getAdminEmail() {
  return firstValue(process.env.TRIMPROOF_ADMIN_EMAIL, process.env.ADMIN_DASHBOARD_EMAIL);
}

function getAdminPasswordHash() {
  return firstValue(process.env.TRIMPROOF_ADMIN_PASSWORD_HASH, process.env.ADMIN_DASHBOARD_PASSWORD_HASH);
}

function parseAdminPasswordHash(encoded: string) {
  const [algorithm, saltValue, digestValue, extra] = encoded.split("$");
  if (algorithm !== "scrypt" || !saltValue || !digestValue || extra) {
    return undefined;
  }
  const salt = Buffer.from(saltValue, "base64url");
  const digest = Buffer.from(digestValue, "base64url");
  if (
    salt.length !== 16 ||
    digest.length !== 64 ||
    salt.toString("base64url") !== saltValue ||
    digest.toString("base64url") !== digestValue
  ) {
    return undefined;
  }
  return { salt, digest };
}

function getValidAdminPasswordHash() {
  const passwordHash = getAdminPasswordHash();
  return passwordHash && parseAdminPasswordHash(passwordHash) ? passwordHash : undefined;
}

/**
 * Key used to sign new admin-session tokens. A dedicated
 * TRIMPROOF_ADMIN_SESSION_SECRET (or ADMIN_DASHBOARD_SESSION_SECRET) wins;
 * otherwise a purpose-specific key is derived from NEXTAUTH_SECRET so the
 * shared secret is never used directly. Without either the caller fails
 * closed: no signing and no verification.
 */
function getAdminSessionSigningKey(): string | Buffer | undefined {
  const dedicated = firstValue(process.env.TRIMPROOF_ADMIN_SESSION_SECRET, process.env.ADMIN_DASHBOARD_SESSION_SECRET);
  if (dedicated) {
    return dedicated;
  }
  const nextAuthSecret = firstValue(process.env.NEXTAUTH_SECRET);
  return nextAuthSecret ? createHmac("sha256", nextAuthSecret).update(derivedKeyLabel).digest() : undefined;
}

function getAdminSessionVerificationKeys(): Array<string | Buffer> {
  const signingKey = getAdminSessionSigningKey();
  if (!signingKey) {
    return [];
  }

  const keys: Array<string | Buffer> = [signingKey];
  // Tokens issued before the derived key shipped were signed (and their
  // credential fingerprint computed) with the raw secrets below. Accept them
  // for verification only; the token's expiresAt (at most 8 hours after issue)
  // bounds how long that can matter. New tokens are never signed with a legacy
  // key.
  for (const legacySecret of [
    firstValue(process.env.TRIMPROOF_ADMIN_SESSION_SECRET),
    firstValue(process.env.ADMIN_DASHBOARD_SESSION_SECRET),
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
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function isAdminAuthConfigured() {
  return Boolean(getAdminEmail() && getValidAdminPasswordHash() && getAdminSessionSigningKey());
}

export function createAdminPasswordHash(password: string, salt = randomBytes(16)) {
  if (password.length < 12) {
    throw new Error("Admin password must contain at least 12 characters.");
  }
  const digest = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${digest.toString("base64url")}`;
}

function validateHashedPassword(candidate: string, encoded: string) {
  const parsed = parseAdminPasswordHash(encoded);
  if (!parsed) {
    return false;
  }
  try {
    const actual = scryptSync(candidate, parsed.salt, parsed.digest.length);
    return timingSafeEqual(parsed.digest, actual);
  } catch {
    return false;
  }
}

function validateAdminPassword(candidate: string) {
  const passwordHash = getAdminPasswordHash();
  return passwordHash ? validateHashedPassword(candidate, passwordHash) : false;
}

export function validateAdminCredentials(email: string, password: string) {
  const expectedEmail = getAdminEmail();
  if (!expectedEmail) {
    return false;
  }
  return safeEqual(normalizeAdminLoginEmail(email), normalizeAdminLoginEmail(expectedEmail)) && validateAdminPassword(password);
}

function encodeEmailSegment(email: string) {
  return Buffer.from(normalizeAdminLoginEmail(email), "utf8").toString("base64url");
}

function credentialFingerprint(key: string | Buffer, passwordHash: string) {
  return createHmac("sha256", key).update(passwordHash).digest("base64url").slice(0, 24);
}

export function createAdminSessionValue(now = Date.now()) {
  const email = getAdminEmail();
  if (!email) {
    throw new Error("Admin email is not configured.");
  }
  const passwordHash = getValidAdminPasswordHash();
  if (!passwordHash) {
    throw new Error("Admin password hash is not configured.");
  }
  const signingKey = getAdminSessionSigningKey();
  if (!signingKey) {
    throw new Error("Admin session secret is not configured.");
  }
  const fingerprint = credentialFingerprint(signingKey, passwordHash);
  const expiresAt = now + sessionTtlSeconds * 1000;
  const payload = `${sessionVersion}.${expiresAt}.${encodeEmailSegment(email)}.${fingerprint}`;
  return `${payload}.${sign(payload, signingKey)}`;
}

export function verifyAdminSessionValue(value: string | undefined, now = Date.now()) {
  if (!value) {
    return false;
  }
  const [version, expiresAtValue, emailSegment, fingerprint, signature, extra] = value.split(".");
  if (version !== sessionVersion || !expiresAtValue || !emailSegment || !fingerprint || !signature || extra) {
    return false;
  }
  const expiresAt = Number(expiresAtValue);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) {
    return false;
  }
  const expectedEmail = getAdminEmail();
  const passwordHash = getValidAdminPasswordHash();
  if (!expectedEmail || !passwordHash || emailSegment !== encodeEmailSegment(expectedEmail)) {
    return false;
  }
  const verificationKeys = getAdminSessionVerificationKeys();
  if (verificationKeys.length === 0) {
    return false;
  }
  const payload = `${version}.${expiresAtValue}.${emailSegment}.${fingerprint}`;
  return verificationKeys.some((key) =>
    safeEqual(fingerprint, credentialFingerprint(key, passwordHash)) && safeEqual(signature, sign(payload, key))
  );
}

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: sessionTtlSeconds
  };
}
