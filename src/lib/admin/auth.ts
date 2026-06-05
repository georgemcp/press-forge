import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "trimproof_admin";

const sessionVersion = "v1";
const sessionTtlSeconds = 60 * 60 * 8;

function firstValue(...values: Array<string | undefined>) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim();
}

function getAdminPassword() {
  return firstValue(process.env.TRIMPROOF_ADMIN_PASSWORD, process.env.ADMIN_DASHBOARD_PASSWORD);
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
  return Boolean(getAdminPassword() && getAdminSessionSecret());
}

export function validateAdminPassword(candidate: string) {
  const expected = getAdminPassword();
  if (!expected) {
    return false;
  }
  return safeEqual(candidate, expected);
}

export function createAdminSessionValue(now = Date.now()) {
  const expiresAt = now + sessionTtlSeconds * 1000;
  const payload = `${sessionVersion}.${expiresAt}`;
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
  const [version, expiresAtValue, signature, extra] = value.split(".");
  if (version !== sessionVersion || !expiresAtValue || !signature || extra) {
    return false;
  }
  const expiresAt = Number(expiresAtValue);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) {
    return false;
  }
  const expected = sign(`${version}.${expiresAtValue}`);
  if (!expected) {
    return false;
  }
  return safeEqual(signature, expected);
}

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: sessionTtlSeconds
  };
}
