import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  namespace: string;
  key: string;
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: number;
}

const rateLimitBuckets = new Map<string, RateLimitBucket>();

function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

export function getTrustedAppOrigin(request: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL;
  return normalizeOrigin(configured ?? request.url);
}

export function isSameOriginMutation(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite === "cross-site") {
    return false;
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    return fetchSite !== "cross-site";
  }

  return normalizeOrigin(origin) === getTrustedAppOrigin(request);
}

export function getForwardedIp(headers: Headers) {
  const realIp = headers.get("x-real-ip")?.trim();
  const forwarded = headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  const candidate = realIp || forwarded || "unknown";
  return candidate.slice(0, 128);
}

export function getRequestIp(request: Request) {
  return getForwardedIp(request.headers);
}

function bucketKey(options: RateLimitOptions) {
  const digest = createHash("sha256").update(options.key).digest("base64url");
  return `${options.namespace}:${digest}`;
}

export function checkRateLimit(options: RateLimitOptions, now = Date.now()): RateLimitResult {
  const key = bucketKey(options);
  const existing = rateLimitBuckets.get(key);
  const bucket = !existing || existing.resetAt <= now
    ? { count: 0, resetAt: now + options.windowMs }
    : existing;

  bucket.count += 1;
  rateLimitBuckets.set(key, bucket);

  if (rateLimitBuckets.size > 10_000) {
    for (const [candidate, value] of rateLimitBuckets) {
      if (value.resetAt <= now) {
        rateLimitBuckets.delete(candidate);
      }
    }
  }

  return {
    allowed: bucket.count <= options.limit,
    limit: options.limit,
    remaining: Math.max(0, options.limit - bucket.count),
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    resetAt: bucket.resetAt
  };
}

export function rateLimitResponse(result: RateLimitResult, message = "Too many requests. Try again later.") {
  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining)
      }
    }
  );
}

export function clearRateLimitState() {
  rateLimitBuckets.clear();
}
