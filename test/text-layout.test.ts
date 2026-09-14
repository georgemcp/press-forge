import fs from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, type PDFFont } from "pdf-lib";
import { beforeAll, describe, expect, it } from "vitest";
import { layoutText, wrapText } from "@/lib/print/text-layout";
import { sampleBusinessCardLayout } from "@/lib/print/sample-layout";
import type { TextBlock } from "@/lib/print/layout-spec";

let font: PDFFont;
let fonts: Map<TextBlock["weight"], PDFFont>;
beforeAll(async () => {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  font = await doc.embedFont(await fs.readFile(path.join(process.cwd(), "assets/fonts/InstrumentSans.ttf")));
  fonts = new Map([["regular", font], ["medium", font], ["bold", font]]);
});

const block = (overrides: Partial<TextBlock> = {}): TextBlock => ({
  id: "body", role: "body", content: "A readable paragraph", x: 0.5, y: 7,
  width: 6.3, fontSize: 14, weight: "regular", color: sampleBusinessCardLayout.palette.ink,
  ...overrides
});
const spec = (...blocks: TextBlock[]) => ({ ...sampleBusinessCardLayout, productType: "flyer" as const, textBlocks: blocks, assetSlots: [] });

describe("font-measured print text", () => {
  it("wraps the real overflowing flyer paragraph into lines that fit", () => {
    const content = "Join fellow book lovers for a relaxed evening of browsing fresh reads and inspiring discussions. Discover new stories, share recommendations, and connect over your passion for books in the inviting glow of Fern Books.";
    const [result] = layoutText(spec(block({ content })), fonts);
    expect(result.lines.length).toBeGreaterThan(2);
    expect(result.lines.join(" ")).toBe(content);
    for (const line of result.lines) expect(font.widthOfTextAtSize(line, 14)).toBeLessThanOrEqual(6.3 * 72);
  });

  it("uses glyph widths instead of a fixed character count", () => {
    const measure = (text: string) => font.widthOfTextAtSize(text, 20);
    expect(wrapText("WWWWWWWWWWWWWWWWWWWW", 72, measure).length)
      .toBeGreaterThan(wrapText("iiiiiiiiiiiiiiiiiiii", 72, measure).length);
  });

  it("preserves explicit line and paragraph breaks", () => {
    expect(wrapText("Friday, October 16\n6-8 PM\n\nFree entry", 500, text => font.widthOfTextAtSize(text, 14)))
      .toEqual(["Friday, October 16", "6-8 PM", "", "Free entry"]);
  });

  it("splits a long unspaced URL without losing characters", () => {
    const content = "https://example.test/" + "W".repeat(60);
    const lines = wrapText(content, 72, text => font.widthOfTextAtSize(text, 14));
    expect(lines.join("")).toBe(content);
    expect(lines.every(line => font.widthOfTextAtSize(line, 14) <= 72)).toBe(true);
  });

  it("limits an overwide box to the remaining page width", () => {
    const [result] = layoutText(spec(block({ x: 7, width: 6, content: "Several words that must wrap" })), fonts);
    expect(result.width).toBe(1.5 * 72);
    expect(result.lines.length).toBeGreaterThan(1);
  });

  it("rejects the generated footer baseline at the trim edge", () => {
    expect(() => layoutText(spec(block({ y: 0, content: "FICTIONAL DEMONSTRATION - TRIM PROOF" })), fonts)).toThrow("does not fit");
  });

  it("rejects content above the trim or wrapped below it", () => {
    expect(() => layoutText(spec(block({ y: 11 })), fonts)).toThrow("does not fit");
    expect(() => layoutText(spec(block({ y: 0.5, width: 1, content: "A long paragraph with more lines than the remaining space can fit" })), fonts)).toThrow("does not fit");
  });

  it("rejects overlapping text blocks but permits side-by-side columns", () => {
    expect(() => layoutText(spec(block(), block({ id: "second" })), fonts)).toThrow("overlap");
    expect(layoutText(spec(block({ width: 2 }), block({ id: "second", x: 4, width: 2 })), fonts)).toHaveLength(2);
  });

  it("rejects a duplicate logo placed on top of vector brand text", () => {
    const layout = spec(block({ id: "brand", role: "brand" }));
    expect(() => layoutText({ ...layout, assetSlots: [{ id: "wordmark", kind: "logo", prompt: "Fern Books", providerHint: "openai", x: 0.5, y: 6.9, width: 2, height: 0.6, minimumDpi: 300 }] }, fonts)).toThrow('Artwork "wordmark" overlaps');
  });
});
