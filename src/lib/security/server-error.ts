const maxDetailLength = 300;

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

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }
  return typeof error === "string" ? error : "Unknown error";
}

/**
 * Turns any thrown value into one sanitized log line. Provider/platform detail
 * is preserved for debugging, but credentials, opaque tokens and email
 * addresses are replaced and the result is length-limited.
 */
export function describeServerError(error: unknown) {
  const message = errorMessage(error).replace(/\s+/g, " ").trim();
  const redacted = redactionRules.reduce(
    (value, rule) => value.replace(rule.pattern, rule.replacement),
    message
  );
  return redacted.length > maxDetailLength ? `${redacted.slice(0, maxDetailLength)}...` : redacted;
}
