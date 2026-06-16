import { describe, expect, it } from "vitest";
import { loginNoindexRobots, loginPageMetadata } from "@/app/login/login-metadata";

describe("login route metadata", () => {
  it("keeps the public sign-in page out of crawl signals", () => {
    expect(loginNoindexRobots).toEqual({
      index: false,
      follow: false
    });
  });

  it("self-canonicalizes the sign-in page", () => {
    expect(loginPageMetadata.alternates).toEqual({
      canonical: "/login"
    });
    expect(loginPageMetadata.robots).toEqual({
      index: false,
      follow: false
    });
  });
});
