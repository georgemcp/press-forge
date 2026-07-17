import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "trimproof_admin";

const sessionVersion = "v3";
const sessionTtlSeconds = 60 * 60 * 8;

function firstValue(...values: Array<string | undefined>) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim();
}

export function normalizeAdminLoginEmail(value: string) {
  return value.trim().toLowerCase();
}

export function getAdminEmail() {
  return firstValue(process.env.TRIMPROOF_ADMIN_EMAIL, process.env.ADMIN_DASHBOARD_EMAIL);
}

function getAdminPassword() {
  return firstValue(process.env.TRIMPROOF_ADMIN_PASSWORD, process.env.ADMIN_DASHBOARD_PASSWORD);
}

function getAdminPasswordHash() {
  return firstValue(process.env.TRIMPROOF_ADMIN_PASSWORD_HASH, process.env.ADMIN_DASHBOARD_PASSWORD_HASH);
}

function getAdminCredential() {
  const passwordHash = getAdminPasswordHash();
  if (passwordHash) {
    return passwordHash;
  }
  return process.env.NODE_ENV === "production" ? undefined : getAdminPassword();
}

function getAdminSessionSecret() {
  return firstValue(process.env.TRIMPROOF_ADMIN_SESSION_SECRET, process.env.ADMIN_DASHBOARD_SESSION_SECRET, process.env.NEXTAUTH_SECRET);
}

function sign(payload: string) {
  const secret = getAdminSessionSecret();
  if (!secret) {
    return undefined;
  }
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftHash = createHmac("sha256", "trimproof-admin-compare").update(left).digest();
  const rightHash = createHmac("sha256", "trimproof-admin-compare").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

export function isAdminAuthConfigured() {
  return Boolean(getAdminEmail() && getAdminCredential() && getAdminSessionSecret());
}

export function createAdminPasswordHash(password: string, salt = randomBytes(16)) {
  if (password.length < 12) {
    throw new Error("Admin password must contain at least 12 characters.");
  }
  const digest = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${digest.toString("base64url")}`;
}

function validateHashedPassword(candidate: string, encoded: string) {
  const [algorithm, saltValue, digestValue, extra] = encoded.split("$");
  if (algorithm !== "scrypt" || !saltValue || !digestValue || extra) {
    return false;
  }
  try {
    const expected = Buffer.from(digestValue, "base64url");
    const actual = scryptSync(candidate, Buffer.from(saltValue, "base64url"), expected.length);
    return expected.length > 0 && expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function validateAdminPassword(candidate: string) {
  const passwordHash = getAdminPasswordHash();
  if (passwordHash) {
    return validateHashedPassword(candidate, passwordHash);
  }
  const plaintext = process.env.NODE_ENV === "production" ? undefined : getAdminPassword();
  return plaintext ? safeEqual(candidate, plaintext) : false;
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

function credentialFingerprint() {
  const credential = getAdminCredential();
  return credential ? createHash("sha256").update(credential).digest("base64url").slice(0, 24) : undefined;
}

export function createAdminSessionValue(now = Date.now()) {
  const email = getAdminEmail();
  if (!email) {
    throw new Error("Admin email is not configured.");
  }
  const fingerprint = credentialFingerprint();
  if (!fingerprint) {
    throw new Error("Admin password hash is not configured.");
  }
  const expiresAt = now + sessionTtlSeconds * 1000;
  const payload = `${sessionVersion}.${expiresAt}.${encodeEmailSegment(email)}.${fingerprint}`;
  const signature = sign(payload);
  if (!signature) {
    throw new Error("Admin session secret is not configured.");
  }
  return `${payload}.${signature}`;
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
  const expectedFingerprint = credentialFingerprint();
  if (!expectedEmail || !expectedFingerprint || emailSegment !== encodeEmailSegment(expectedEmail) || !safeEqual(fingerprint, expectedFingerprint)) {
    return false;
  }
  const expected = sign(`${version}.${expiresAtValue}.${emailSegment}.${fingerprint}`);
  if (!expected) {
    return false;
  }
  return safeEqual(signature, expected);
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
