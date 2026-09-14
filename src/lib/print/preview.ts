import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";

const execFileAsync = promisify(execFile);
export const proofPreviewFileName = "proof-preview.png";

export async function renderProofPreview(pdfPath: string, outputDir: string, demo: boolean) {
  const previewPath = path.join(outputDir, proofPreviewFileName);
  await execFileAsync("pdftoppm", ["-f", "1", "-singlefile", "-scale-to", "1400", "-png", pdfPath, previewPath.replace(/\.png$/, "")], { timeout: 60_000 });
  if (demo) {
    const input = await fs.readFile(previewPath);
    const { width = 1400, height = 1400 } = await sharp(input).metadata();
    const watermark = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><pattern id="mark" width="380" height="180" patternUnits="userSpaceOnUse" patternTransform="rotate(-25)"><text x="12" y="70" font-family="sans-serif" font-size="27" font-weight="700" fill="white" stroke="#333" stroke-width="0.6" opacity="0.65">TRIM PROOF DEMO</text></pattern></defs><rect width="100%" height="100%" fill="url(#mark)"/></svg>`;
    await fs.writeFile(previewPath, await sharp(input).composite([{ input: Buffer.from(watermark) }]).png().toBuffer());
  }
  return previewPath;
}
