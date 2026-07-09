import { describe, expect, it } from "vitest";
import { signupNoindexRobots, signupPageMetadata } from "@/app/signup/signup-metadata";

describe("signup route metadata", () => {
  it("keeps the account creation page out of crawl signals", () => {
    expect(signupNoindexRobots).toEqual({
      index: false,
      follow: false
    });
  });

  it("self-canonicalizes the signup page", () => {
    expect(signupPageMetadata.alternates).toEqual({
      canonical: "/signup"
    });
    expect(signupPageMetadata.robots).toEqual({
      index: false,
      follow: false
    });
  });
});
