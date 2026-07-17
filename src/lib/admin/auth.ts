import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "trimproof_admin";

const sessionVersion = "v4";
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
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function isAdminAuthConfigured() {
  return Boolean(getAdminEmail() && getValidAdminPasswordHash() && getAdminSessionSecret());
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

function credentialFingerprint() {
  const passwordHash = getValidAdminPasswordHash();
  const sessionSecret = getAdminSessionSecret();
  if (!passwordHash || !sessionSecret) {
    return undefined;
  }
  return createHmac("sha256", sessionSecret).update(passwordHash).digest("base64url").slice(0, 24);
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
