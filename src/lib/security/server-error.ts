const maxDetailLength = 300;
// The redaction rules only ever see this many characters. The cap matters for
// the email rule, whose local-part class scans to the end of a candidate run
// at every start position (quadratic on a long run) — bounding the input
// bounds that worst case.
const maxRedactionInputLength = 4096;
const truncationMarker = "…[truncated]";
const fallbackDetail = "Unknown error";

/**
 * Credential words. Any run of key characters containing one of these is a
 * credential key, which covers snake_case, camelCase, kebab-case and
 * header-style compounds such as `secret_key`, `userPassword`, `githubToken`,
 * `myApiKey` and `x-auth-token` without listing every spelling.
 */
const credentialKeySource = [
  "secret",
  "password",
  "passwd",
  "token",
  "api[_-]?key",
  "apikey",
  "authorization"
].join("|");

const compoundCredentialKeySource = String.raw`[A-Za-z0-9_-]*(?:${credentialKeySource})[A-Za-z0-9_-]*`;

/**
 * Redaction rules applied to server-side error detail before it is logged.
 * Provider errors can echo API keys, bearer credentials or account emails;
 * those must not reach the application log.
 *
 * `\b` cannot be used before the key names: it does not match between `_` and
 * a word character, so `client_secret=` and `access_token:` slipped through.
 * A negative lookbehind for key characters is used instead, which anchors the
 * match to the start of the whole compound key while still accepting the
 * quote, query-string `?`, space or punctuation that commonly precede it. The
 * lookbehind also means only the first position of a long key-like run can
 * start a match, keeping the alternation's backtracking linear.
 */
const redactionRules: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]+/g, replacement: "[redacted-key]" },
  { pattern: /\bwhsec_[A-Za-z0-9]+/g, replacement: "[redacted-key]" },
  { pattern: /\bsk-[A-Za-z0-9_-]{8,}/g, replacement: "[redacted-key]" },
  { pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, replacement: "Bearer [redacted]" },
  { pattern: /\bBasic\s+[A-Za-z0-9+/=]+/gi, replacement: "Basic [redacted]" },
  // Quoted JSON-style keys and values: "password":"x", 'password': 'x'.
  // Escaped characters are tolerated and the opposite quote may appear inside
  // the value. This runs before the assignment rule so JSON values keep that
  // escape tolerance.
  {
    pattern: new RegExp(
      String.raw`(["'])(${compoundCredentialKeySource})\1(\s*:\s*)(["'])((?:(?!\4)[^\\]|\\.)*)\4`,
      "gi"
    ),
    replacement: "$1$2$1$3$4[redacted]$4"
  },
  // key=value, key: value, URL query (?key=...), env style (MY_KEY=...) and
  // quoted or bare values, e.g. password="hunter2", password = "a b c",
  // "password":123456. The quoted alternatives come first so the whole quoted
  // value is consumed; the unquoted class cannot cross a quote and would
  // otherwise leave the value untouched. The optional quote before the
  // separator is the closing quote of a JSON-style key.
  {
    pattern: new RegExp(
      String.raw`(?<![A-Za-z0-9_-])(${compoundCredentialKeySource})(["']?)(\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s"'&,;\\]+)`,
      "gi"
    ),
    replacement: "$1$2$3[redacted]"
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
 * Applies the credential/PII rules to an arbitrary string. The input is
 * capped before any rule runs, so no rule pays an unbounded cost. Unlike
 * `describeServerError` it does not extract a message or apply the
 * 300-character log limit, so callers can sanitize structured payloads (such
 * as validation issue messages) while keeping their shape. Total: it never
 * throws.
 */
export function redactSensitiveDetail(value: string) {
  try {
    const bounded =
      value.length > maxRedactionInputLength
        ? `${value.slice(0, maxRedactionInputLength)}${truncationMarker}`
        : value;
    return redactionRules.reduce(
      (text, rule) => text.replace(rule.pattern, rule.replacement),
      bounded
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
