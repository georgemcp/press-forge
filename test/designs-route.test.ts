import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "@/app/api/designs/route";
import { sampleBusinessCardLayout } from "@/lib/print/sample-layout";

type SupabaseMockResult = {
  data: unknown;
  error: unknown;
};

const missingTableError = {
  code: "PGRST205",
  details: null,
  hint: null,
  message: "Could not find the table 'public.saved_designs' in the schema cache"
};

const mocks = vi.hoisted(() => ({
  accountSession: {
    userId: "00000000-0000-4000-8000-000000000001",
    email: "buyer@example.com"
  } as { userId: string; email: string } | undefined,
  supabaseResult: {
    data: null,
    error: null
  } as SupabaseMockResult,
  lastInsertPayload: undefined as Record<string, unknown> | undefined,
  lastUpdatePayload: undefined as Record<string, unknown> | undefined
}));

vi.mock("@/lib/auth/account-server", () => ({
  getAccountSessionFromCookies: () => mocks.accountSession
}));

vi.mock("@/lib/db/supabase", () => ({
  createServiceSupabaseClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: async () => mocks.supabaseResult
          }),
          order: () => ({
            limit: async () => mocks.supabaseResult
          })
        }),
        order: () => ({
          limit: async () => mocks.supabaseResult
        }),
        single: async () => mocks.supabaseResult
      }),
      insert: (payload: Record<string, unknown>) => {
        mocks.lastInsertPayload = payload;
        return {
          select: () => ({
            single: async () => mocks.supabaseResult
          })
        };
      },
      update: (payload: Record<string, unknown>) => {
        mocks.lastUpdatePayload = payload;
        return {
          eq: () => ({
            eq: () => ({
              select: () => ({
                single: async () => mocks.supabaseResult
              })
            })
          })
        };
      },
      delete: () => ({
        eq: () => ({
          eq: async () => mocks.supabaseResult
        })
      })
    })
  })
}));

describe("designs route", () => {
  beforeEach(() => {
    mocks.accountSession = {
      userId: "00000000-0000-4000-8000-000000000001",
      email: "buyer@example.com"
    };
    mocks.supabaseResult = {
      data: null,
      error: null
    };
    mocks.lastInsertPayload = undefined;
    mocks.lastUpdatePayload = undefined;
  });

  it("returns an empty list when saved designs are unavailable in the connected schema", async () => {
    mocks.supabaseResult = {
      data: null,
      error: missingTableError
    };

    const response = await GET(new Request("https://trimproof.com/api/designs?limit=20"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      designs: [],
      unavailable: true,
      reason: "Saved designs are not available in this environment."
    });
  });

  it("keeps save failures explicit when saved designs are unavailable", async () => {
    mocks.supabaseResult = {
      data: null,
      error: missingTableError
    };

    const response = await POST(
      new Request("https://trimproof.com/api/designs", {
        method: "POST",
        body: JSON.stringify({
          brief: "Brand: Smoke Test. Create a business card.",
          layoutSpec: sampleBusinessCardLayout,
          productType: "business_card"
        })
      })
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Saved designs are not available in this environment."
    });
  });

  it("rejects unauthenticated design list requests", async () => {
    mocks.accountSession = undefined;

    const response = await GET(new Request("https://trimproof.com/api/designs?limit=20"));

    expect(response.status).toBe(401);
  });

  it("maps client and job metadata when listing saved designs", async () => {
    mocks.supabaseResult = {
      data: [
        {
          id: "design_1",
          user_id: mocks.accountSession?.userId,
          name: "Sunset Bistro - Dinner menu",
          client_name: "Sunset Bistro",
          job_name: "Dinner menu",
          brief: "Brand: Sunset Bistro. Create a menu.",
          enhanced_brief: null,
          layout_spec: sampleBusinessCardLayout,
          design_rationale: null,
          product_type: "menu",
          reference_image_urls: [],
          iteration_count: 1,
          created_at: "2026-06-15T00:00:00.000Z",
          updated_at: "2026-06-15T00:30:00.000Z"
        }
      ],
      error: null
    };

    const response = await GET(new Request("https://trimproof.com/api/designs?limit=20"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      designs: [
        {
          name: "Sunset Bistro - Dinner menu",
          clientName: "Sunset Bistro",
          jobName: "Dinner menu",
          productType: "menu"
        }
      ]
    });
  });

  it("saves bounded client and job metadata with a design", async () => {
    mocks.supabaseResult = {
      data: { id: "design_1" },
      error: null
    };

    const response = await POST(
      new Request("https://trimproof.com/api/designs", {
        method: "POST",
        body: JSON.stringify({
          name: "Northside Print Co. - Spring flyer",
          clientName: ` ${"Northside Print Co.".repeat(20)} `,
          jobName: " Spring sale flyer ",
          brief: "Brand: Northside Print Co. Create a flyer.",
          layoutSpec: sampleBusinessCardLayout,
          productType: "flyer"
        })
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, id: "design_1" });
    expect(mocks.lastInsertPayload).toMatchObject({
      name: "Northside Print Co. - Spring flyer",
      client_name: expect.stringMatching(/^Northside Print Co\./),
      job_name: "Spring sale flyer"
    });
    expect(String(mocks.lastInsertPayload?.client_name).length).toBeLessThanOrEqual(140);
  });
});
