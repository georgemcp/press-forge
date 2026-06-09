import { afterEach, describe, expect, it } from "vitest";

import { DEFAULT_SITE_ORIGIN, getSiteOrigin, getSiteUrl } from "@/lib/seo/site-url";

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

afterEach(() => {
  process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
});

describe("SEO site URL", () => {
  it("defaults canonical surfaces to the production domain", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;

    expect(getSiteOrigin()).toBe(DEFAULT_SITE_ORIGIN);
    expect(getSiteUrl().href).toBe(`${DEFAULT_SITE_ORIGIN}/`);
  });

  it("normalizes configured app URLs to an origin", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://www.trimproof.com/app?from=test";

    expect(getSiteOrigin()).toBe("https://www.trimproof.com");
  });

  it("falls back to production when the configured URL is invalid", () => {
    process.env.NEXT_PUBLIC_APP_URL = "trimproof";

    expect(getSiteOrigin()).toBe(DEFAULT_SITE_ORIGIN);
  });

  it("falls back to production when the configured URL is localhost", () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

    expect(getSiteOrigin()).toBe(DEFAULT_SITE_ORIGIN);
  });
});
