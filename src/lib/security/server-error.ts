const maxDetailLength = 300;
const fallbackDetail = "Unknown error";

/**
 * Credential key names, including snake_case, camelCase and kebab-case
 * variants. The longer names come first so that, for example, `client_secret`
 * is recognised as a whole instead of leaving a recognisable `secret` tail.
 */
const credentialKeySource = [
  "client[_-]?secret",
  "access[_-]?token",
  "refresh[_-]?token",
  "id[_-]?token",
  "api[_-]?key",
  "apikey",
  "authorization",
  "password",
  "passwd",
  "secret",
  "token"
].join("|");

/**
 * Redaction rules applied to server-side error detail before it is logged.
 * Provider errors can echo API keys, bearer credentials or account emails;
 * those must not reach the application log.
 *
 * `\b` cannot be used before the key names: it does not match between `_` and
 * a word character, so `client_secret=` and `access_token:` slipped through.
 * A negative lookbehind for alphanumerics is used instead, which keeps the
 * match anchored to the start of the key while still accepting the `_`, `-`,
 * quote or query-string `?` that commonly precede it.
 */
const redactionRules: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]+/g, replacement: "[redacted-key]" },
  { pattern: /\bwhsec_[A-Za-z0-9]+/g, replacement: "[redacted-key]" },
  { pattern: /\bsk-[A-Za-z0-9_-]{8,}/g, replacement: "[redacted-key]" },
  { pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, replacement: "Bearer [redacted]" },
  { pattern: /\bBasic\s+[A-Za-z0-9+/=]+/gi, replacement: "Basic [redacted]" },
  // key=value, key: value, URL query (?key=...), env style (MY_KEY=...) and
  // (optionally quoted) values, e.g. password="hunter2".
  {
    pattern: new RegExp(
      String.raw`(?<![A-Za-z0-9])(${credentialKeySource})(\s*[:=]\s*)(["']?)([^\s"'&,;\\]+)\3`,
      "gi"
    ),
    replacement: "$1$2$3[redacted]$3"
  },
  // Quoted JSON-style keys and values: "password":"x", 'password': 'x'.
  // Escaped characters are tolerated and the opposite quote may appear inside
  // the value.
  {
    pattern: new RegExp(
      String.raw`(["'])(${credentialKeySource})\1(\s*:\s*)(["'])((?:(?!\4)[^\\]|\\.)*)\4`,
      "gi"
    ),
    replacement: "$1$2$1$3$4[redacted]$4"
  },
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
 * Applies the credential/PII rules to an arbitrary string. Unlike
 * `describeServerError` it neither extracts nor truncates, so callers can
 * sanitize structured payloads (such as validation issue messages) while
 * keeping their shape. Total: it never throws.
 */
export function redactSensitiveDetail(value: string) {
  try {
    return redactionRules.reduce(
      (text, rule) => text.replace(rule.pattern, rule.replacement),
      value
    );
  } catch {
    return fallbackDetail;
  }
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
    const redacted = redactSensitiveDetail(message);
    return redacted.length > maxDetailLength ? `${redacted.slice(0, maxDetailLength)}...` : redacted;
  } catch {
    return fallbackDetail;
  }
}
