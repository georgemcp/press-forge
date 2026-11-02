import { redactSensitiveDetail } from "@/lib/security/server-error";

// Issue fields that describe the schema rather than echo the submitted value.
const safeIssueKeys = new Set(["path", "code", "message", "expected", "values"]);

/**
 * Reduces validation issues to the structure the client actually needs. Zod
 * can attach the rejected input to an issue (`input`, `received`, ...) and its
 * default messages may quote that value; neither may be logged or returned.
 */
export function sanitizeValidationIssues(issues: readonly unknown[]) {
  return issues.map((issue) => {
    const record =
      issue && typeof issue === "object" ? (issue as Record<string, unknown>) : {};
    let message = typeof record.message === "string" ? record.message : "Invalid value";

    // Anything outside the safe fields is a candidate value echo: replace its
    // textual form inside the message before the issue leaves the server.
    for (const [key, value] of Object.entries(record)) {
      if (safeIssueKeys.has(key)) {
        continue;
      }
      const text =
        typeof value === "string" || typeof value === "number" || typeof value === "boolean"
          ? String(value)
          : undefined;
      if (text && text.length >= 2) {
        message = message.split(text).join("[redacted]");
      }
    }

    return {
      path: Array.isArray(record.path) ? record.path : [],
      code: typeof record.code === "string" ? record.code : "invalid",
      message: redactSensitiveDetail(message)
    };
  });
}
