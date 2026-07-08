import { afterEach, describe, expect, it, vi } from "vitest";
import { trackEvent } from "@/lib/analytics/events";

describe("analytics events", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("pushes events to dataLayer and gtag when a browser window is available", () => {
    const dataLayer: unknown[] = [];
    const gtag = vi.fn();
    vi.stubGlobal("window", {
      dataLayer,
      gtag
    });

    trackEvent("checkout_started", {
      mode: "advanced",
      value: 12,
      ignored: undefined
    });

    expect(dataLayer.at(-1)).toMatchObject({
      event: "checkout_started",
      mode: "advanced",
      value: 12
    });
    expect(gtag).toHaveBeenCalledWith("event", "checkout_started", {
      mode: "advanced",
      value: 12,
      ignored: undefined
    });
  });

  it("no-ops when window is unavailable", () => {
    expect(() => trackEvent("email_signup_submitted", { source: "marketing_home" })).not.toThrow();
  });
});
