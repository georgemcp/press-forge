import { describe, expect, it } from "vitest";
import { describeServerError } from "@/lib/security/server-error";

describe("describeServerError", () => {
  it("keeps the message of a real Error", () => {
    expect(describeServerError(new Error("provider rejected the request"))).toBe("provider rejected the request");
  });

  it("accepts a thrown string", () => {
    expect(describeServerError("plain string failure")).toBe("plain string failure");
  });

  it("accepts an error-like object with a string message", () => {
    expect(describeServerError({ message: "error-like detail" })).toBe("error-like detail");
  });

  it("redacts credentials, tokens and PII from error-like objects", () => {
    const detail = describeServerError({
      message: "buyer@example.com sent Bearer sk-live-secret-123 key sk_live_abc123 password=hunter2"
    });

    expect(detail).not.toContain("buyer@example.com");
    expect(detail).not.toContain("sk-live-secret-123");
    expect(detail).not.toContain("sk_live_abc123");
    expect(detail).not.toContain("hunter2");
    expect(detail).toContain("[redacted-email]");
  });

  // `\b` does not match between `_` and a word character, so these key forms
  // used to pass through untouched.
  const credentialKeyCases: Array<[string, string, string]> = [
    ["a client_secret assignment", "client_secret=cs_abc123", "cs_abc123"],
    ["an access_token colon form", "access_token: at_abc123", "at_abc123"],
    ["a refresh_token assignment", "refresh_token=rt_abc123", "rt_abc123"],
    ["an id_token assignment", "id_token=idt_abc123", "idt_abc123"],
    ["an api_key assignment", "api_key=ak_abc123", "ak_abc123"],
    ["an apikey assignment", "apikey=apk_abc123", "apk_abc123"],
    ["a bare secret assignment", "secret=sec_abc123", "sec_abc123"],
    ["a password assignment", "password=hunter2", "hunter2"],
    ["a passwd assignment", "passwd=pass123", "pass123"],
    ["an authorization assignment", "authorization=auth_abc123", "auth_abc123"],
    ["a camelCase clientSecret", "clientSecret=cs_camel123", "cs_camel123"],
    ["a camelCase accessToken", "accessToken: at_camel123", "at_camel123"],
    ["a kebab-case refresh-token", "refresh-token=rt_kebab123", "rt_kebab123"],
    ["a camelCase idToken", "idToken=idt_camel123", "idt_camel123"],
    ["a camelCase apiKey", "apiKey=ak_camel123", "ak_camel123"],
    ["a kebab-case api-key", "api-key=ak_kebab123", "ak_kebab123"],
    ["a kebab-case client-secret", "client-secret=cs_kebab123", "cs_kebab123"],
    ["an uppercase env-style key", "OPENAI_API_KEY=openai_value_123", "openai_value_123"],
    ["a header-style api key", "x-api-key: header_value_123", "header_value_123"],
    [
      "an access_token URL query parameter",
      "https://app.example/cb?access_token=url_token_123&state=xyz",
      "url_token_123"
    ],
    [
      "a client_secret URL query parameter",
      "https://app.example/cb?client_secret=url_secret_123&state=xyz",
      "url_secret_123"
    ],
    ["a double-quoted JSON value", '{"password":"json_hunter2"}', "json_hunter2"],
    ["a single-quoted JSON value", "{'password': 'single_hunter2'}", "single_hunter2"],
    ["a spaced JSON value", '{"api_key": "spaced_key_123"}', "spaced_key_123"],
    ["a camelCase JSON key", '{"clientSecret":"camel_secret_123"}', "camel_secret_123"],
    ["a JSON authorization value", '{"authorization":"Basic dXNlcjpwYXNz"}', "dXNlcjpwYXNz"],
    ["a double-quoted assignment value", 'password="double_quoted_123"', "double_quoted_123"],
    ["a single-quoted assignment value", "password='single_quoted_123'", "single_quoted_123"]
  ];

  it.each(credentialKeyCases)("redacts %s", (_name, detail, secret) => {
    const redacted = describeServerError(new Error(detail));

    expect(redacted).not.toContain(secret);
    expect(redacted).toContain("[redacted");
  });

  it.each([
    "the token was not found in the response",
    "the secret to good design is contrast",
    "passwordless sign-in is supported",
    "the secretary scheduled a meeting",
    "tokenizer settings are invalid"
  ])("does not mangle credential-free prose: %s", (detail) => {
    expect(() => describeServerError(new Error(detail))).not.toThrow();
    expect(describeServerError(new Error(detail))).toBe(detail);
  });

  it("does not throw or leak a non-string message", () => {
    const value = { message: 42, toString: () => "custom string form" };

    expect(() => describeServerError(value)).not.toThrow();
    expect(describeServerError(value)).toBe("custom string form");
  });

  it("survives a throwing message getter", () => {
    const value = {
      get message(): unknown {
        throw new Error("getter boom sk_live_hidden");
      }
    };

    expect(() => describeServerError(value)).not.toThrow();
    expect(describeServerError(value)).toBe("Unknown error");
  });

  it("survives an Error whose message getter throws", () => {
    const error = new Error("original");
    Object.defineProperty(error, "message", {
      get() {
        throw new Error("hostile getter");
      }
    });

    expect(() => describeServerError(error)).not.toThrow();
    expect(describeServerError(error)).toBe("Unknown error");
  });

  it("survives an Error whose message is not a string", () => {
    const error = new Error("original");
    Object.defineProperty(error, "message", { value: { nested: true } });

    expect(() => describeServerError(error)).not.toThrow();
    expect(describeServerError(error)).toBe("Unknown error");
  });

  it("handles circular objects", () => {
    const withMessage: Record<string, unknown> = { message: "circular detail" };
    withMessage.self = withMessage;
    expect(describeServerError(withMessage)).toBe("circular detail");

    const withoutMessage: Record<string, unknown> = {};
    withoutMessage.self = withoutMessage;
    expect(() => describeServerError(withoutMessage)).not.toThrow();
    expect(describeServerError(withoutMessage)).toBe("Unknown error");
  });

  it.each([null, undefined])("handles %s", (value) => {
    expect(() => describeServerError(value)).not.toThrow();
    expect(describeServerError(value)).toBe("Unknown error");
  });

  it("handles a Symbol", () => {
    expect(() => describeServerError(Symbol("symbol failure"))).not.toThrow();
    expect(describeServerError(Symbol("symbol failure"))).toBe("Symbol(symbol failure)");
  });

  it("handles a BigInt", () => {
    expect(() => describeServerError(42n)).not.toThrow();
    expect(describeServerError(42n)).toBe("42");
  });

  it("handles numbers, booleans and functions", () => {
    for (const value of [0, -1, Number.NaN, true, false, () => undefined]) {
      expect(() => describeServerError(value)).not.toThrow();
      expect(typeof describeServerError(value)).toBe("string");
    }
  });

  it("survives an object with no usable string form", () => {
    const bare = Object.create(null) as object;
    expect(() => describeServerError(bare)).not.toThrow();
    expect(describeServerError(bare)).toBe("Unknown error");

    const throwing = {
      toString() {
        throw new Error("cannot stringify");
      }
    };
    expect(() => describeServerError(throwing)).not.toThrow();
    expect(describeServerError(throwing)).toBe("Unknown error");
  });

  it("survives a revoked proxy", () => {
    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();

    expect(() => describeServerError(proxy)).not.toThrow();
    expect(describeServerError(proxy)).toBe("Unknown error");
  });

  it("survives a proxy with a throwing get trap", () => {
    const proxy = new Proxy({}, {
      get() {
        throw new Error("trap boom");
      }
    });

    expect(() => describeServerError(proxy)).not.toThrow();
    expect(describeServerError(proxy)).toBe("Unknown error");
  });

  it("collapses whitespace, falls back on empty detail and truncates long detail", () => {
    expect(describeServerError(new Error("line one\n\nline two"))).toBe("line one line two");
    expect(describeServerError(new Error("   "))).toBe("Unknown error");
    expect(describeServerError(new Error("y ".repeat(200)))).toHaveLength(303);
  });
});
