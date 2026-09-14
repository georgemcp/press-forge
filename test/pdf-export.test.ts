import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { decodePDFRawStream, PDFArray, PDFDocument, PDFRawStream } from "pdf-lib";
import { afterEach, describe, expect, it } from "vitest";
import { exportLayoutPdf } from "@/lib/print/pdf-export";
import { sampleBusinessCardLayout } from "@/lib/print/sample-layout";

type Point = { x: number; y: number };
type Matrix = [number, number, number, number, number, number];
type Stroke = { points: Point[]; lineCount: number; curvedOrClosed: boolean; halfWidth: number };

// Decode the saved PDF's graphics operators, preserving transforms and stroke width.
// The blank artwork fixture deliberately has no legitimate interior outline paths.
function readStrokes(content: string): Stroke[] {
  let state: { matrix: Matrix; width: number } = { matrix: [1, 0, 0, 1, 0, 0], width: 1 };
  const stack: typeof state[] = [];
  const strokes: Stroke[] = [];
  let points: Point[] = [];
  let lineCount = 0;
  let curvedOrClosed = false;
  const resetPath = () => { points = []; lineCount = 0; curvedOrClosed = false; };

  for (const instruction of content.trim().split(/\r?\n/)) {
    const tokens = instruction.trim().split(/\s+/);
    const operator = tokens.pop();
    const values = tokens.map(Number);
    if (operator === "q") stack.push({ ...state, matrix: [...state.matrix] });
    if (operator === "Q") {
      const saved = stack.pop();
      if (!saved) throw new Error("Unbalanced PDF graphics state.");
      state = saved;
    }
    if (operator === "w") state.width = values[0];
    if (operator === "cm") {
      const [a, b, c, d, e, f] = state.matrix;
      const [aa, bb, cc, dd, ee, ff] = values;
      state.matrix = [a * aa + c * bb, b * aa + d * bb, a * cc + c * dd, b * cc + d * dd, a * ee + c * ff + e, b * ee + d * ff + f];
    }
    if (operator === "m" || operator === "l") {
      const [a, b, c, d, e, f] = state.matrix;
      const point = { x: a * values[0] + c * values[1] + e, y: b * values[0] + d * values[1] + f };
      const previous = points.at(-1);
      if (!previous || previous.x !== point.x || previous.y !== point.y) points.push(point);
      if (operator === "l") lineCount += 1;
    }
    if (["c", "v", "y", "h", "re"].includes(operator ?? "")) curvedOrClosed = true;
    if (["S", "s", "B", "B*", "b", "b*"].includes(operator ?? "")) {
      const [a, b, c, d] = state.matrix;
      strokes.push({
        points,
        lineCount,
        curvedOrClosed: curvedOrClosed || ["s", "b", "b*"].includes(operator ?? ""),
        halfWidth: state.width * Math.max(Math.hypot(a, b), Math.hypot(c, d)) / 2
      });
      resetPath();
    }
    if (["f", "f*", "F", "n"].includes(operator ?? "")) resetPath();
  }
  expect(stack).toHaveLength(0);
  return strokes;
}

const products = [
  ["business_card", 3.5, 2],
  ["postcard", 6, 4],
  ["flyer", 8.5, 11],
  ["poster", 11, 17],
  ["brochure", 11, 8.5],
  ["letterhead", 8.5, 11]
] as const;
const tempDirs: string[] = [];

describe("production PDF and SVG guide exclusion", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map(directory => fs.rm(directory, { recursive: true, force: true })));
  });

  for (const cropMarks of [true, false]) {
    it.each(products)(`keeps %s print geometry and excludes interior guides (crop marks: ${cropMarks})`, async (productType, trimWidthIn, trimHeightIn) => {
      const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), "trimproof-pdf-export-"));
      tempDirs.push(outputDir);
      const result = await exportLayoutPdf({
        ...sampleBusinessCardLayout,
        productType,
        cropMarks,
        textBlocks: [],
        assetSlots: []
      }, { outputDir });
      const pdf = await PDFDocument.load(await fs.readFile(result.sourcePdfPath));
      expect(pdf.getPageCount()).toBe(1);
      const page = pdf.getPage(0);
      const trimWidth = trimWidthIn * 72;
      const trimHeight = trimHeightIn * 72;
      // Standard 1/8-inch bleed + 1/8-inch slug remain independent of visible guides.
      const trim = { x: 18, y: 18, width: trimWidth, height: trimHeight };
      const media = { x: 0, y: 0, width: trimWidth + 36, height: trimHeight + 36 };
      expect(page.getMediaBox()).toEqual(media);
      expect(page.getCropBox()).toEqual(media);
      expect(page.getTrimBox()).toEqual(trim);
      expect(page.getBleedBox()).toEqual({ x: 9, y: 9, width: trimWidth + 18, height: trimHeight + 18 });

      const contents = page.node.Contents();
      const streams = contents instanceof PDFArray
        ? contents.asArray().map(ref => pdf.context.lookup(ref))
        : [contents];
      const content = streams.map(stream => {
        if (!(stream instanceof PDFRawStream)) throw new Error("Expected a saved PDF content stream.");
        return Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1");
      }).join("\n");
      const strokes = readStrokes(content);
      expect(strokes).toHaveLength(cropMarks ? 8 : 0);
      for (const stroke of strokes) {
        expect(stroke.curvedOrClosed).toBe(false);
        expect(stroke.lineCount).toBe(1);
        expect(stroke.points).toHaveLength(2);
        expect(stroke.halfWidth).toBeCloseTo(0.225);
        const [start, end] = stroke.points;
        expect(start.x === end.x || start.y === end.y).toBe(true);
        expect(Math.hypot(end.x - start.x, end.y - start.y)).toBeCloseTo(5.76);
        const minX = Math.min(start.x, end.x) - stroke.halfWidth;
        const maxX = Math.max(start.x, end.x) + stroke.halfWidth;
        const minY = Math.min(start.y, end.y) - stroke.halfWidth;
        const maxY = Math.max(start.y, end.y) + stroke.halfWidth;
        // Even the full stroke envelope must remain outside the finished page.
        expect(maxX < trim.x || minX > trim.x + trim.width || maxY < trim.y || minY > trim.y + trim.height).toBe(true);
        expect(minX).toBeGreaterThanOrEqual(media.x);
        expect(minY).toBeGreaterThanOrEqual(media.y);
        expect(maxX).toBeLessThanOrEqual(media.width);
        expect(maxY).toBeLessThanOrEqual(media.height);
      }

      const svg = await fs.readFile(result.svgMasterPath, "utf8");
      expect(svg).toContain(`viewBox="0 0 ${media.width} ${media.height}"`);
      expect(svg.match(/<rect\b/g)).toHaveLength(2); // Paper and accent artwork only.
      expect(svg).not.toMatch(/<(?:line|path|polyline|polygon)\b|\bstroke(?:-[\w-]+)?\s*=/i);
      expect(svg).not.toMatch(/\bfill\s*=\s*["']none["']/i);
    });
  }
});
