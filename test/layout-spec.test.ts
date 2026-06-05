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
    expect(spec.assetSlots).toHaveLength(1);
    expect(spec.assetSlots[0]?.providerHint).toBe("gemini");
  });

  it("does not treat instruction words as the brand", () => {
    const spec = deriveLayoutSpecFromBrief({
      brief: "Create a premium business card for a prepress automation studio. Keep all text vector and export PDF/X-1a."
    });

    expect(spec.textBlocks.find((block) => block.id === "brand")?.content).toBe("PREPRESS AUTOMATION STUDIO");
  });

  it("extracts brands when a brief starts with the company name", () => {
    const spec = deriveLayoutSpecFromBrief({
      brief: "bare getaways business card"
    });

    expect(spec.textBlocks.find((block) => block.id === "brand")?.content).toBe("BARE GETAWAYS");
  });

  it("derives flyer geometry when flyer is selected", () => {
    const spec = deriveLayoutSpecFromBrief({
      brief: "Create a premium flyer for Bare Getaways with a tropical travel feel.",
      productType: "flyer"
    });

    expect(spec.productType).toBe("flyer");
    expect(spec.assetSlots[0]).toMatchObject({
      x: -0.125,
      y: -0.125,
      width: 8.75,
      height: 11.25
    });
    expect(spec.textBlocks.find((block) => block.id === "brand")?.fontSize).toBeGreaterThan(30);
  });

  it("infers postcard geometry from the brief when no product is selected", () => {
    const spec = deriveLayoutSpecFromBrief({
      brief: "Bare Getaways postcard with warm Caribbean water"
    });

    expect(spec.productType).toBe("postcard");
    expect(spec.assetSlots[0]).toMatchObject({
      width: 6.25,
      height: 4.25
    });
  });

  it("preserves advanced prepress settings while deriving a brief", () => {
    const spec = deriveLayoutSpecFromBrief({
      brief: "Bare Getaways flyer with warm Caribbean water",
      productType: "flyer",
      printProfile: "GRACoL2013",
      pdfxLevel: "PDF/X-4",
      cropMarks: false
    });

    expect(spec.productType).toBe("flyer");
    expect(spec.printProfile).toBe("GRACoL2013");
    expect(spec.pdfxLevel).toBe("PDF/X-4");
    expect(spec.cropMarks).toBe(false);
    expect(spec.textBlocks.find((block) => block.id === "contact")?.content).toContain("PDF/X-4 ready");
  });
});
