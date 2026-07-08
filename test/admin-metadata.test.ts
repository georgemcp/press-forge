import { describe, expect, it } from "vitest";
import { adminLoginMetadata, adminNoindexRobots } from "@/app/admin/admin-metadata";

describe("admin route metadata", () => {
  it("keeps the admin subtree out of crawl signals", () => {
    expect(adminNoindexRobots).toEqual({
      index: false,
      follow: false
    });
  });

  it("self-canonicalizes the admin login page", () => {
    expect(adminLoginMetadata.alternates).toEqual({
      canonical: "/admin/login"
    });
    expect(adminLoginMetadata.robots).toEqual({
      index: false,
      follow: false
    });
  });
});
