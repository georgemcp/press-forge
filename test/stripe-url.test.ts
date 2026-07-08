import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_SITE_ORIGIN, getSiteOrigin } from "@/lib/seo/site-url";
import { getAppUrl } from "@/lib/billing/stripe";

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

afterEach(() => {
  process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
});

describe("Stripe app URL", () => {
  it("uses the shared production-safe site origin helper", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;

    expect(getAppUrl()).toBe(DEFAULT_SITE_ORIGIN);
    expect(getAppUrl()).toBe(getSiteOrigin());
  });

  it("normalizes configured app URLs the same way as the site origin helper", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://www.trimproof.com/app?from=test";

    expect(getAppUrl()).toBe("https://www.trimproof.com");
  });
});
