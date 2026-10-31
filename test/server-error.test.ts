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
