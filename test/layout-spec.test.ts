import { describe, expect, it } from "vitest";
import { layoutSpecSchema } from "@/lib/print/layout-spec";
import { sampleBusinessCardLayout } from "@/lib/print/sample-layout";

describe("LayoutSpec schema", () => {
  it("accepts the deterministic proof sample", () => {
    expect(layoutSpecSchema.parse(sampleBusinessCardLayout).productType).toBe("business_card");
  });

  it("rejects raster assets below the print DPI floor", () => {
    const result = layoutSpecSchema.safeParse({
      ...sampleBusinessCardLayout,
      assetSlots: [
        {
          id: "bg",
          kind: "background",
          prompt: "soft paper texture",
          x: 0,
          y: 0,
          width: 3.75,
          height: 2.25,
          minimumDpi: 120
        }
      ]
    });

    expect(result.success).toBe(false);
  });
});
