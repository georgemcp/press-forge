import { beforeEach, describe, expect, it, vi } from "vitest";
import { canonicalUploadPath } from "@/lib/security/upload";
import { POST } from "@/app/api/upload/route";
import { clearRateLimitState } from "@/lib/security/request";

const mocks = vi.hoisted(() => ({
  storageFrom: vi.fn()
}));

vi.mock("@/lib/auth/account-server", () => ({
  getAccountSessionFromCookies: () => ({
    userId: "6df3f657-766d-4f15-8af8-a3a8ccda0b04",
    email: "owner@example.com"
  })
}));

vi.mock("@/lib/db/supabase", () => ({
  createServiceSupabaseClient: () => ({ storage: { from: mocks.storageFrom } })
}));

describe("upload path security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRateLimitState();
  });

  it("constructs a fixed bucket object path from validated UUIDs", () => {
    expect(canonicalUploadPath(
      "6df3f657-766d-4f15-8af8-a3a8ccda0b04",
      "f35dd3c9-4d90-429b-8e6f-df069286c39e"
    )).toBe("6df3f657-766d-4f15-8af8-a3a8ccda0b04/reference/f35dd3c9-4d90-429b-8e6f-df069286c39e.png");
  });

  it("rejects traversal and metacharacter identifiers", () => {
    expect(() => canonicalUploadPath(
      "6df3f657-766d-4f15-8af8-a3a8ccda0b04",
      "../../../bucket/design-assets/empty?discard="
    )).toThrow("Invalid upload identifier");
  });

  it("rejects a traversal category before the storage SDK receives a path", async () => {
    const formData = new FormData();
    formData.set("file", new File(["not-decoded"], "image.png", { type: "image/png" }));
    formData.set("category", "../../../bucket/design-assets/empty?discard=");

    const response = await POST(new Request("https://trimproof.com/api/upload", {
      method: "POST",
      body: formData
    }));

    expect(response.status).toBe(400);
    expect(mocks.storageFrom).not.toHaveBeenCalled();
  });
});
