import { describe, expect, it } from "vitest";
import { deriveLayoutSpecFromBrief } from "@/lib/print/brief-layout";
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

  it("derives customer-facing text from a natural-language brief", () => {
    const spec = deriveLayoutSpecFromBrief({
      brief: "Create a luxury business card for Bare Getaways with contact trips@baregetaways.com and a premium travel feel."
    });

    expect(spec.textBlocks.find((block) => block.id === "brand")?.content).toBe("BARE GETAWAYS");
    expect(spec.textBlocks.find((block) => block.id === "contact")?.content).toContain("trips@baregetaways.com");
    expect(spec.textBlocks.find((block) => block.id === "tagline")?.content).toBe("Premium work, prepared for print.");
  });
});
