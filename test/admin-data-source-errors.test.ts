import { describe, expect, it, vi } from "vitest";
import { getAdminCenterData } from "@/lib/admin/data";

const leak = "permission denied for table export_orders at db.internal:5432 sk_live_abc123";

vi.mock("@/lib/db/supabase", () => ({
  createServiceSupabaseClient: () => ({
    from: () => {
      const builder = {
        select: () => builder,
        order: () => builder,
        limit: () => builder,
        then: (resolve: (value: unknown) => unknown) => resolve({ data: null, error: { message: leak } })
      };
      return builder;
    }
  })
}));

describe("admin data source errors", () => {
  it("names the failed source but not the database message", async () => {
    const logged: string[] = [];
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      logged.push(JSON.stringify(args));
    });
    const data = await getAdminCenterData("30d");
    expect(data.sourceErrors).toContain("export_orders: could not be loaded.");
    expect(data.sourceErrors.join("\n")).not.toMatch(/permission denied|db\.internal|sk_live/);
    expect(logged.join("\n")).toContain("export_orders");
    expect(logged.join("\n")).not.toContain("sk_live_abc123");
  });
});
