import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PDFDocument, rgb } from "pdf-lib";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { renderProofPreview } from "@/lib/print/preview";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

describe("rendered PDF previews", () => {
  it("renders the PDF's actual page content and watermarks even an asset-free demo", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "trimproof-preview-"));
    directories.push(dir);
    const doc = await PDFDocument.create();
    const page = doc.addPage([432, 288]);
    page.drawRectangle({ x: 0, y: 0, width: 216, height: 288, color: rgb(1, 0, 0) });
    const pdfPath = path.join(dir, "source.pdf");
    await fs.writeFile(pdfPath, await doc.save());
    const cleanPath = await renderProofPreview(pdfPath, dir, false);
    const cleanBytes = await fs.readFile(cleanPath);
    const clean = await sharp(cleanBytes).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(clean.info.width).toBe(1400);
    expect(clean.info.height).toBeGreaterThan(900);
    const pixel = (x: number, y: number) => Array.from(clean.data.subarray((y * clean.info.width + x) * clean.info.channels, (y * clean.info.width + x) * clean.info.channels + 3));
    expect(pixel(100, 100)).toEqual([255, 0, 0]);
    expect(pixel(1300, 100)).toEqual([255, 255, 255]);
    const demoPath = await renderProofPreview(pdfPath, dir, true);
    const demo = await sharp(await fs.readFile(demoPath)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(demo.info).toEqual(clean.info);
    const changedChannels = demo.data.reduce((count, value, index) => count + Number(value !== clean.data[index]), 0);
    expect(changedChannels).toBeGreaterThan(10_000);
    // The original PDF remains clean; the demo mark is confined to the preview.
    expect(await fs.readFile(pdfPath)).toEqual(Buffer.from(await doc.save()));
  });
});
