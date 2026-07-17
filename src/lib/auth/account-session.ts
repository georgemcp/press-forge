import { createHmac, timingSafeEqual } from "node:crypto";

export const ACCOUNT_SESSION_COOKIE = "trimproof_account";

export interface AccountSession {
  userId: string;
  email: string;
  issuedAt?: number;
}

const sessionVersion = "v2";
const sessionTtlSeconds = 60 * 60 * 24 * 7;

function firstValue(...values: Array<string | undefined>) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim();
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getAccountSessionSecret() {
  return firstValue(process.env.TRIMPROOF_AUTH_SESSION_SECRET, process.env.TRIMPROOF_ADMIN_SESSION_SECRET, process.env.NEXTAUTH_SECRET);
}

function sign(payload: string) {
  const secret = getAccountSessionSecret();
  if (!secret) {
    return undefined;
  }
  return createHmac("sha256", secret).update(payload).digest("base64url");
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
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && getAccountSessionSecret());
}

export function createAccountSessionValue(session: AccountSession, now = Date.now()) {
  if (!getAccountSessionSecret()) {
    throw new Error("Account session secret is not configured.");
  }
  const expiresAt = now + sessionTtlSeconds * 1000;
  const payload = `${sessionVersion}.${now}.${expiresAt}.${encodeSegment(session.userId)}.${encodeSegment(normalizeEmail(session.email))}`;
  const signature = sign(payload);
  if (!signature) {
    throw new Error("Account session secret is not configured.");
  }
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
  const expected = sign(`${version}.${issuedAtValue}.${expiresAtValue}.${userIdSegment}.${emailSegment}`);
  if (!expected || !safeEqual(signature, expected)) {
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
