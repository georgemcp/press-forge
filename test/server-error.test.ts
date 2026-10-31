import { performance } from "node:perf_hooks";
import { describe, expect, it } from "vitest";
import { describeServerError, redactSensitiveDetail } from "@/lib/security/server-error";

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
    ["a single-quoted assignment value", "password='single_quoted_123'", "single_quoted_123"],
    // Compound keys that end in (not start with) a credential word.
    ["a snake_case secret_key", "secret_key=compound_value_1", "compound_value_1"],
    ["an uppercase SECRET_KEY", "SECRET_KEY=compound_value_2", "compound_value_2"],
    ["a camelCase userPassword", "userPassword=compound_value_3", "compound_value_3"],
    ["a camelCase githubToken", "githubToken=compound_value_4", "compound_value_4"],
    ["a camelCase myApiKey", "myApiKey=compound_value_5", "compound_value_5"],
    ["a camelCase authToken", "authToken=compound_value_6", "compound_value_6"],
    ["a kebab-case x-auth-token", "x-auth-token: compound_value_7", "compound_value_7"],
    [
      "a secret_key URL query parameter",
      "https://app.example/cb?secret_key=compound_value_8&state=xyz",
      "compound_value_8"
    ],
    // Numeric JSON values have no quote for the quoted-JSON rule to consume.
    ["a numeric JSON password", '"password":123456', "123456"],
    ["a numeric JSON api key", '{"api_key": 987654}', "987654"]
  ];

  it.each(credentialKeyCases)("redacts %s", (_name, detail, secret) => {
    const redacted = describeServerError(new Error(detail));

    expect(redacted).not.toContain(secret);
    expect(redacted).toContain("[redacted");
  });

  // A quoted value can contain spaces and punctuation, so the unquoted value
  // class only ever saw (at best) its first word. The whole quoted value must
  // be consumed before redaction.
  it.each([
    ["a spaced double-quoted value", 'password = "alpha bravo charlie"', "alpha bravo charlie", "alpha"],
    ["a spaced single-quoted value", "api_key = 'delta echo foxtrot'", "delta echo foxtrot", "delta"],
    ["a quoted value containing separators", 'client_secret="one, two; three"', "one, two; three", "one,"]
  ])("redacts the whole of %s", (_name, detail, secret, firstToken) => {
    const redacted = describeServerError(new Error(detail));

    expect(redacted).not.toContain(secret);
    expect(redacted).not.toContain(firstToken);
    expect(redacted).toContain("[redacted");
  });

  // A quoted value can contain a backslash-escaped quote. The quoted
  // alternatives must consume the escape pair instead of treating the escaped
  // quote as the value terminator; otherwise the tail of the value reaches the
  // log (`password="ab\"cd"` used to become `password=[redacted]cd"`).
  it.each([
    ["a double-quoted assignment", 'password="ab\\"cd"', 'ab\\"cd'],
    ["a single-quoted assignment", "api_key='ab\\'cd'", "ab\\'cd"]
  ])("redacts the whole escaped-quote %s", (_name, detail, secret) => {
    const redacted = describeServerError(new Error(detail));

    expect(redacted).not.toContain(secret);
    expect(redacted).not.toContain("cd");
    expect(redacted).toContain("[redacted");
  });

  it("keeps text after a terminated escaped-quote value", () => {
    const redacted = describeServerError(new Error('password="ab\\"cd" next=ok'));

    expect(redacted).not.toContain("cd");
    expect(redacted).toContain("next=ok");
  });

  // An error can embed a stringified body, which puts a backslash before every
  // quote: {\"password\":\"x\"}. The key's closing quote is escaped too, so the
  // plain JSON rule cannot match and the value used to pass through untouched.
  it.each([
    ["a double-quoted value", '{\\"password\\":\\"double_encoded_1\\"}', "double_encoded_1"],
    ["a single-quoted value", "{\\'password\\':\\'single_encoded_1\\'}", "single_encoded_1"],
    ["a compound key", '{\\"api_key\\":\\"compound_encoded_1\\"}', "compound_encoded_1"],
    ["a spaced key and value", '{\\"password\\" : \\"spaced_encoded_1\\"}', "spaced_encoded_1"],
    ["a numeric value", '\\"password\\":987654', "987654"],
    ["a numeric value inside an object", '{\\"api_key\\": 123456}', "123456"],
    ["an unterminated value", '\\"password\\":\\"unterminated_encoded_1', "unterminated_encoded_1"]
  ])("redacts a double-encoded %s", (_name, detail, secret) => {
    const redacted = describeServerError(new Error(detail));

    expect(redacted).not.toContain(secret);
    expect(redacted).toContain("[redacted");
  });

  it("keeps text after a double-encoded credential value", () => {
    const redacted = describeServerError(
      new Error('{\\"password\\":\\"encoded_1\\"} and \\"state\\":\\"ok\\"')
    );

    expect(redacted).not.toContain("encoded_1");
    expect(redacted).toContain('\\"state\\":\\"ok\\"');
  });

  it.each([
    '{"username":"alice","note":"hello"}',
    '{\\"username\\":\\"alice\\"}',
    'launch path "C:\\\\temp" is missing'
  ])("does not mangle credential-free JSON or escaped prose: %s", (detail) => {
    expect(describeServerError(new Error(detail))).toBe(detail);
  });

  // An opening quote with no closing quote has no whole value for the quoted
  // alternatives to consume, so its visible prefix used to reach the log.
  it.each([
    ["a JSON-style token value", '"token":"abc'],
    ["a double-quoted assignment", 'password="abc'],
    ["a single-quoted assignment", "password='abc"],
    ["an apostrophe inside a double-quoted value", "password=\"abc'def"],
    ["a double quote inside a single-quoted value", "api_key='abc\"def"],
    ["a value ending in a backslash", 'password="abc\\']
  ])("redacts an unterminated %s", (_name, detail) => {
    const redacted = describeServerError(new Error(detail));

    expect(redacted).not.toContain("abc");
    expect(redacted).toContain("[redacted");
  });

  it("redacts a quoted credential value cut by the 4 KB truncation", () => {
    // The closing quote is past the cap, so only the value's prefix is left in
    // the bounded text and the whole-value alternatives cannot match it.
    const secret = "SECRET".repeat(1_000);
    const redacted = redactSensitiveDetail(`password="${secret}"`);

    expect(redacted).not.toContain("SECRET");
    expect(redacted).toContain("[redacted");
    expect(redacted.endsWith("…[truncated]")).toBe(true);
  });

  it.each([
    "the token was not found in the response",
    "the secret to good design is contrast",
    "passwordless sign-in is supported",
    "the secretary scheduled a meeting",
    "tokenizer settings are invalid",
    "the authorization flow is documented"
  ])("does not mangle credential-free prose: %s", (detail) => {
    expect(() => describeServerError(new Error(detail))).not.toThrow();
    expect(describeServerError(new Error(detail))).toBe(detail);
  });

  it("caps redaction input at 4 KB and marks the truncation", () => {
    const huge = "prose ".repeat(30_000);
    const redacted = redactSensitiveDetail(huge);

    expect(redacted.endsWith("…[truncated]")).toBe(true);
    expect(redacted.length).toBeLessThan(4_200);
  });

  it("redacts a 100 KB detail in under 200 ms", () => {
    const huge = "A".repeat(100_000);
    const started = performance.now();
    const detail = describeServerError(new Error(huge));
    const elapsed = performance.now() - started;

    expect(elapsed).toBeLessThan(200);
    expect(detail).not.toContain("A".repeat(1_000));
  });

  it("redacts a 100 KB detail of quote-heavy assignments in under 200 ms", () => {
    // Hundreds of quoted assignments are paired before the cut, which leaves
    // an unterminated value at the boundary for the fallback rule.
    const huge = `${'password="secret" '.repeat(6_000)}token="UNCLOSED`;
    const started = performance.now();
    const detail = describeServerError(new Error(huge));
    const elapsed = performance.now() - started;

    expect(elapsed).toBeLessThan(200);
    expect(detail).not.toContain("secret");
    expect(detail).toContain("[redacted");
  });

  it("redacts a 100 KB adversarial mix of escaped quotes and double-encoding in under 200 ms", () => {
    // Alternate an escaped-quote assignment with a double-encoded JSON value,
    // the two shapes that used to leak or backtrack. The 4 KB cap bounds every
    // rule; this guards the cap and the escape-aware bodies together.
    const chunk = 'password="ab\\"cd" {\\"api_key\\":\\"MIXED_SECRET_1\\"} ';
    const huge = chunk.repeat(Math.ceil(100_000 / chunk.length));
    const started = performance.now();
    const detail = describeServerError(new Error(huge));
    const elapsed = performance.now() - started;

    expect(elapsed).toBeLessThan(200);
    expect(detail).not.toContain("MIXED_SECRET_1");
    expect(detail).not.toContain("cd");
    expect(detail).toContain("[redacted");
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
