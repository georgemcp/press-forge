import type { PDFFont } from "pdf-lib";
import { getPageGeometry, inchesToPoints } from "./constants";
import type { LayoutSpec, TextBlock } from "./layout-spec";

export interface LaidOutText {
  block: TextBlock;
  lines: string[];
  x: number;
  y: number;
  lineHeight: number;
  width: number;
  top: number;
  bottom: number;
}

/** Use actual embedded-font advances, preserving explicit paragraph breaks. */
export function wrapText(content: string, maxWidth: number, measure: (text: string) => number) {
  if (!(maxWidth > 0)) throw new Error("Text needs a positive printable width.");
  const lines: string[] = [];
  for (const paragraph of content.replace(/\r\n?/g, "\n").split("\n")) {
    let line = "";
    for (const word of paragraph.trim().split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= maxWidth) { line = candidate; continue; }
      if (line) { lines.push(line); line = ""; }
      // Long URLs and unspaced strings must not run beyond the text box either.
      for (const character of Array.from(word)) {
        if (measure(character) > maxWidth) throw new Error("A character is wider than its text box.");
        if (line && measure(line + character) > maxWidth) { lines.push(line); line = ""; }
        line += character;
      }
    }
    lines.push(line);
  }
  return lines;
}

export function layoutText(spec: LayoutSpec, fonts: Map<TextBlock["weight"], PDFFont>): LaidOutText[] {
  const geometry = getPageGeometry(spec.productType);
  const blocks = spec.textBlocks.map(block => {
    const font = fonts.get(block.weight);
    if (!font) throw new Error(`Missing embedded font for ${block.weight}`);
    const x = inchesToPoints(block.x);
    const y = inchesToPoints(block.y);
    const width = Math.min(inchesToPoints(block.width), geometry.trim.width - x);
    const lines = wrapText(block.content, width, text => font.widthOfTextAtSize(text, block.fontSize));
    const lineHeight = block.fontSize * 1.22;
    const ascent = font.heightAtSize(block.fontSize, { descender: false });
    const descent = font.heightAtSize(block.fontSize) - ascent;
    const top = y + ascent;
    const bottom = y - (lines.length - 1) * lineHeight - descent;
    if (x < 0 || top > geometry.trim.height || bottom < 0) {
      throw new Error(`Text block "${block.id}" does not fit inside the finished page. Move it inward or shorten the copy before exporting.`);
    }
    return { block, lines, x, y, lineHeight, width, top, bottom };
  });
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i], b = blocks[j];
      if (a.x < b.x + b.width && b.x < a.x + a.width && a.bottom < b.top && b.bottom < a.top) {
        throw new Error(`Text blocks "${a.block.id}" and "${b.block.id}" overlap. Adjust the layout before exporting.`);
      }
    }
  }
  for (const asset of spec.assetSlots.filter(slot => ["logo", "icon", "illustration"].includes(slot.kind))) {
    const x = inchesToPoints(asset.x), y = inchesToPoints(asset.y);
    const width = inchesToPoints(asset.width), height = inchesToPoints(asset.height);
    for (const text of blocks) {
      if (text.x < x + width && x < text.x + text.width && text.bottom < y + height && y < text.top) {
        throw new Error(`Artwork "${asset.id}" overlaps text block "${text.block.id}". Move the artwork or remove a duplicate wordmark before exporting.`);
      }
    }
  }
  return blocks;
}
