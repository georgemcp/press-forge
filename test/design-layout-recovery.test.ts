import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sampleBusinessCardLayout } from "@/lib/print/sample-layout";
import type { BriefEnhancementResult } from "@/lib/ai/brief-enhancer";

const mocks = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("openai", () => ({ default: class { chat = { completions: { create: mocks.create } }; } }));
import { generateDesignSpec } from "@/lib/ai/design-generator";

const brief: BriefEnhancementResult = {
  enhancedBrief: "A simple business card", brandName: "Fern Books", tagline: "Books for everyone",
  styleDirection: "Clear typography", colorPalette: { name: "Green", primary: "#223322", secondary: "#334433", accent: "#889944", background: "#ffffff" },
  suggestedContent: { headline: "Fern Books", subhead: "Books for everyone", body: "", contactInfo: "fernbooks.example" },
  designNotes: ["Keep all text readable"], assetSuggestions: [], productTypeHint: "business_card"
};
const valid = { ...sampleBusinessCardLayout, assetSlots: [] };
const invalid = { ...valid, textBlocks: valid.textBlocks.map(block => ({ ...block, y: 0 })) };
const response = (layoutSpec: typeof valid) => ({ choices: [{ message: { content: JSON.stringify({ layoutSpec, designRationale: "Clear typography", assetPrompts: [] }) } }] });

describe("bounded layout correction", () => {
  beforeEach(() => { vi.stubEnv("OPENAI_API_KEY", "test-key"); vi.stubEnv("GEMINI_API_KEY", ""); mocks.create.mockReset(); });
  afterEach(() => vi.unstubAllEnvs());

  it("feeds a failed layout back once and returns a printable correction with requested settings", async () => {
    mocks.create.mockResolvedValueOnce(response(invalid)).mockResolvedValueOnce(response(valid));
    const result = await generateDesignSpec({ enhancedBrief: brief, productType: "business_card", printProfile: "USWebCoatedSWOP", cropMarks: false });
    expect(mocks.create).toHaveBeenCalledTimes(2);
    const correction = mocks.create.mock.calls[1][0].messages[1].content;
    expect(correction).toContain("REQUIRED LAYOUT CORRECTION");
    expect(correction).toContain("does not fit inside the finished page");
    expect(correction).toContain("Previous layout:");
    expect(result.layoutSpec.cropMarks).toBe(false);
    expect(result.layoutSpec.printProfile).toBe("USWebCoatedSWOP");
  });

  it("stops after one unsuccessful correction instead of looping provider requests", async () => {
    mocks.create.mockResolvedValue(response(invalid));
    await expect(generateDesignSpec({ enhancedBrief: brief, productType: "business_card" })).rejects.toThrow("does not fit");
    expect(mocks.create).toHaveBeenCalledTimes(2);
  });

  it("keeps a text-only brief free of unrequested image-generation work", async () => {
    mocks.create.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({
      layoutSpec: { ...valid, assetSlots: [{ id: "extra", kind: "background", prompt: "Unrequested art", providerHint: "openai", x: 0, y: 0, width: 3.5, height: 2, minimumDpi: 300 }] },
      designRationale: "Typography", assetPrompts: [{ slotId: "extra", prompt: "Unrequested art", providerHint: "openai" }]
    }) } }] });
    const result = await generateDesignSpec({ enhancedBrief: brief, productType: "business_card" });
    expect(result.layoutSpec.assetSlots).toEqual([]);
    expect(result.assetPrompts).toEqual([]);
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });
});
