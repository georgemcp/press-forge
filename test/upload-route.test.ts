import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "@/app/api/upload/route";

const mocks = vi.hoisted(() => ({
  accountSession: {
    userId: "00000000-0000-4000-8000-000000000001",
    email: "buyer@example.com"
  } as { userId: string; email: string } | undefined,
  upload: vi.fn(async () => ({ error: null })),
  list: vi.fn(async (): Promise<{ data: unknown[]; error: unknown }> => ({ data: [], error: null })),
  getPublicUrl: vi.fn((path: string) => ({
    data: { publicUrl: `https://cdn.trimproof.test/${path}` }
  }))
}));

vi.mock("@/lib/auth/account-server", () => ({
  getAccountSessionFromCookies: () => mocks.accountSession
}));

vi.mock("@/lib/db/supabase", () => ({
  createServiceSupabaseClient: () => ({
    storage: {
      from: () => ({
        upload: mocks.upload,
        list: mocks.list,
        getPublicUrl: mocks.getPublicUrl
      })
    }
  })
}));

describe("upload route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.accountSession = {
      userId: "00000000-0000-4000-8000-000000000001",
      email: "buyer@example.com"
    };
    mocks.upload.mockResolvedValue({ error: null });
    mocks.list.mockResolvedValue({ data: [], error: null });
  });

  it("stores PDF source uploads in the source category with a MIME-derived extension", async () => {
    const formData = new FormData();
    formData.append("category", "source");
    formData.append("file", new File(["%PDF-1.7"], "Northside menu final.ai", { type: "application/pdf" }));

    const response = await POST(new Request("https://trimproof.com/api/upload", { method: "POST", body: formData }));

    expect(response.status).toBe(200);
    const body = await response.json() as { category: string; contentType: string; path: string; originalName: string };
    expect(body).toMatchObject({
      category: "source",
      contentType: "application/pdf",
      originalName: "Northside menu final.ai"
    });
    expect(body.path).toMatch(/^00000000-0000-4000-8000-000000000001\/source\/[0-9a-f-]+\.pdf$/);
    expect(mocks.upload).toHaveBeenCalledWith(
      body.path,
      expect.any(Buffer),
      expect.objectContaining({ contentType: "application/pdf", upsert: false })
    );
  });

  it("rejects unsafe upload categories before storage writes", async () => {
    const formData = new FormData();
    formData.append("category", "../source");
    formData.append("file", new File(["hello"], "flyer.png", { type: "image/png" }));

    const response = await POST(new Request("https://trimproof.com/api/upload", { method: "POST", body: formData }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Unsupported upload category. Use 'reference' or 'source'."
    });
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("lists source uploads with category metadata", async () => {
    mocks.list.mockResolvedValue({
      data: [
        {
          name: "source-file.pdf",
          metadata: { size: 2048, mimetype: "application/pdf" },
          created_at: "2026-06-15T00:00:00.000Z"
        }
      ],
      error: null
    });

    const response = await GET(new Request("https://trimproof.com/api/upload?category=source"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      files: [
        {
          id: "source-file",
          name: "source-file.pdf",
          url: "https://cdn.trimproof.test/00000000-0000-4000-8000-000000000001/source/source-file.pdf",
          size: 2048,
          contentType: "application/pdf",
          category: "source",
          createdAt: "2026-06-15T00:00:00.000Z"
        }
      ]
    });
  });
});
