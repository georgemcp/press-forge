const maxDetailLength = 300;
const fallbackDetail = "Unknown error";

/**
 * Redaction rules applied to server-side error detail before it is logged.
 * Provider errors can echo API keys, bearer credentials or account emails;
 * those must not reach the application log.
 */
const redactionRules: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]+/g, replacement: "[redacted-key]" },
  { pattern: /\bwhsec_[A-Za-z0-9]+/g, replacement: "[redacted-key]" },
  { pattern: /\bsk-[A-Za-z0-9_-]{8,}/g, replacement: "[redacted-key]" },
  { pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, replacement: "Bearer [redacted]" },
  { pattern: /\bBasic\s+[A-Za-z0-9+/=]+/gi, replacement: "Basic [redacted]" },
  { pattern: /\b(api[_-]?key|secret|token|password)\s*[:=]\s*["']?[^\s"',;]+/gi, replacement: "$1=[redacted]" },
  { pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, replacement: "[redacted-email]" },
  { pattern: /\b[A-Za-z0-9+/=_-]{40,}\b/g, replacement: "[redacted-token]" }
];

function stringifySafely(value: unknown) {
  try {
    const text = String(value);
    return text === "[object Object]" ? undefined : text;
  } catch {
    return undefined;
  }
}

/**
 * Extracts a human-readable message from any thrown value. Every property
 * access is guarded because the value can be a proxy, an object with throwing
 * getters, or something with no usable string form.
 */
function errorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }
  if (typeof error === "symbol" || typeof error === "bigint") {
    return stringifySafely(error) ?? fallbackDetail;
  }
  if (error === null || error === undefined) {
    return fallbackDetail;
  }
  if (typeof error !== "object" && typeof error !== "function") {
    return fallbackDetail;
  }

  // `instanceof` can itself throw for exotic proxies, so it gets its own guard.
  let isError = false;
  try {
    isError = error instanceof Error;
  } catch {
    isError = false;
  }
  if (isError) {
    try {
      const message = (error as Error).message;
      if (typeof message === "string") {
        return message;
      }
    } catch {
      // A throwing `message` getter must not take the logger down.
    }
    return fallbackDetail;
  }

  try {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  } catch {
    // Throwing getters fall through to the generic detail.
  }
  return stringifySafely(error) ?? fallbackDetail;
}

/**
 * Turns any thrown value into one sanitized log line. Provider/platform detail
 * is preserved for debugging, but credentials, opaque tokens and email
 * addresses are replaced and the result is length-limited. This function is
 * total: it never throws, whatever value is passed to it.
 */
export function describeServerError(error: unknown) {
  try {
    const message = errorMessage(error).replace(/\s+/g, " ").trim() || fallbackDetail;
    const redacted = redactionRules.reduce(
      (value, rule) => value.replace(rule.pattern, rule.replacement),
      message
    );
    return redacted.length > maxDetailLength ? `${redacted.slice(0, maxDetailLength)}...` : redacted;
  } catch {
    return fallbackDetail;
  }
}
