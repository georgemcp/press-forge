import fs from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { cmyk, PDFDocument, PDFPage, rgb } from "pdf-lib";
import sharp from "sharp";
import { getPageGeometry, inchesToPoints } from "./constants";
import type { CmykColor, LayoutSpec, TextBlock } from "./layout-spec";
import type { ResolvedAsset } from "./assets";

export interface PdfExportResult {
  sourcePdfPath: string;
  svgMasterPath: string;
  geometry: ReturnType<typeof getPageGeometry>;
}

interface PdfExportOptions {
  outputDir: string;
  fileBaseName?: string;
  assets?: ResolvedAsset[];
}

function toPdfCmyk(color: CmykColor) {
  return cmyk(color.c, color.m, color.y, color.k);
}

function svgColor(color: CmykColor) {
  const r = Math.round((1 - Math.min(1, color.c * (1 - color.k) + color.k)) * 255);
  const g = Math.round((1 - Math.min(1, color.m * (1 - color.k) + color.k)) * 255);
  const b = Math.round((1 - Math.min(1, color.y * (1 - color.k) + color.k)) * 255);
  return `rgb(${r} ${g} ${b})`;
}

function lineBreak(content: string, maxChars: number) {
  const words = content.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines;
}

async function loadFontBytes(weight: TextBlock["weight"]) {
  const fileName = weight === "regular" ? "InstrumentSans.ttf" : "BricolageGrotesque.ttf";
  return fs.readFile(path.join(process.cwd(), "assets", "fonts", fileName));
}

async function embedAssetImage(pdfDoc: PDFDocument, asset: ResolvedAsset) {
  if (asset.widthPx * asset.heightPx > 4_000_000) {
    const jpg = await sharp(Buffer.from(asset.bytes)).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
    return pdfDoc.embedJpg(jpg);
  }

  return pdfDoc.embedPng(asset.bytes);
}

function drawCropMarks(page: PDFPage, spec: LayoutSpec) {
  const geometry = getPageGeometry(spec.productType);
  const mark = inchesToPoints(0.08);
  const color = cmyk(0, 0, 0, 1);
  const thickness = 0.45;
  const left = geometry.trim.x;
  const right = geometry.trim.x + geometry.trim.width;
  const bottom = geometry.trim.y;
  const top = geometry.trim.y + geometry.trim.height;
  const bleedGap = geometry.bleed * 0.45;

  const segments = [
    [left - bleedGap - mark, bottom, left - bleedGap, bottom],
    [left, bottom - bleedGap - mark, left, bottom - bleedGap],
    [right + bleedGap, bottom, right + bleedGap + mark, bottom],
    [right, bottom - bleedGap - mark, right, bottom - bleedGap],
    [left - bleedGap - mark, top, left - bleedGap, top],
    [left, top + bleedGap, left, top + bleedGap + mark],
    [right + bleedGap, top, right + bleedGap + mark, top],
    [right, top + bleedGap, right, top + bleedGap + mark]
  ];

  for (const [x1, y1, x2, y2] of segments) {
    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness,
      color
    });
  }
}

function getBrochureFoldGuideXs(spec: LayoutSpec) {
  if (spec.productType !== "brochure") {
    return [];
  }
  const geometry = getPageGeometry(spec.productType);
  const panelWidth = geometry.trim.width / 3;
  return [geometry.trim.x + panelWidth, geometry.trim.x + 2 * panelWidth];
}

function drawBrochureFoldGuides(page: PDFPage, spec: LayoutSpec) {
  const geometry = getPageGeometry(spec.productType);
  for (const x of getBrochureFoldGuideXs(spec)) {
    page.drawLine({
      start: { x, y: geometry.trim.y + inchesToPoints(0.18) },
      end: { x, y: geometry.trim.y + geometry.trim.height - inchesToPoints(0.18) },
      thickness: 0.35,
      color: rgb(0.28, 0.28, 0.28)
    });
  }
}

function createSvgFoldGuides(spec: LayoutSpec, canvasHeight: number) {
  const geometry = getPageGeometry(spec.productType);
  return getBrochureFoldGuideXs(spec)
    .map((x) => {
      const y1 = canvasHeight - geometry.trim.y - geometry.trim.height + inchesToPoints(0.18);
      const y2 = canvasHeight - geometry.trim.y - inchesToPoints(0.18);
      return `<line x1="${x.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="rgb(84 84 84)" stroke-width="0.6" stroke-dasharray="4 4"/>`;
    })
    .join("\n");
}

function createSvgMaster(spec: LayoutSpec, assets: ResolvedAsset[] = []) {
  const geometry = getPageGeometry(spec.productType);
  const width = geometry.mediaBox.width;
  const height = geometry.mediaBox.height;
  const assetImages = assets
    .map((asset) => {
      const x = geometry.trim.x + inchesToPoints(asset.slot.x);
      const y = height - geometry.trim.y - inchesToPoints(asset.slot.y) - inchesToPoints(asset.slot.height);
      return `<image href="${path.basename(asset.filePath)}" x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${inchesToPoints(asset.slot.width).toFixed(2)}" height="${inchesToPoints(asset.slot.height).toFixed(2)}" preserveAspectRatio="xMidYMid slice"/>`;
    })
    .join("\n");
  const text = spec.textBlocks
    .map((block) => {
      const x = geometry.trim.x + inchesToPoints(block.x);
      const y = height - geometry.trim.y - inchesToPoints(block.y);
      return `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" font-family="Bricolage Grotesque" font-size="${block.fontSize}" fill="${svgColor(block.color)}">${block.content}</text>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="${geometry.bleedBox.x}" y="${height - geometry.bleedBox.y - geometry.bleedBox.height}" width="${geometry.bleedBox.width}" height="${geometry.bleedBox.height}" fill="${svgColor(spec.palette.paper)}"/>
  ${assetImages}
  <rect x="${geometry.trim.x + geometry.trim.width - 22}" y="${height - geometry.trim.y - geometry.trim.height + 12}" width="8" height="${geometry.trim.height - 24}" fill="${svgColor(spec.palette.accent)}"/>
  ${createSvgFoldGuides(spec, height)}
  <rect x="${geometry.safeBox.x}" y="${height - geometry.safeBox.y - geometry.safeBox.height}" width="${geometry.safeBox.width}" height="${geometry.safeBox.height}" fill="none" stroke="rgb(57 185 136)" stroke-dasharray="3 3" stroke-width="0.6"/>
  ${text}
</svg>
`;
}

export async function exportLayoutPdf(spec: LayoutSpec, options: PdfExportOptions): Promise<PdfExportResult> {
  await fs.mkdir(options.outputDir, { recursive: true });
  const fileBaseName = options.fileBaseName ?? "trimproof-proof";
  const sourcePdfPath = path.join(options.outputDir, `${fileBaseName}.source.pdf`);
  const svgMasterPath = path.join(options.outputDir, `${fileBaseName}.master.svg`);
  const geometry = getPageGeometry(spec.productType);
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  pdfDoc.setTitle("Trim Proof print-ready proof");
  pdfDoc.setProducer("Trim Proof deterministic prepress engine");
  pdfDoc.setCreator("Trim Proof");

  const page = pdfDoc.addPage([geometry.mediaBox.width, geometry.mediaBox.height]);
  page.setMediaBox(0, 0, geometry.mediaBox.width, geometry.mediaBox.height);
  page.setCropBox(0, 0, geometry.mediaBox.width, geometry.mediaBox.height);
  page.setBleedBox(geometry.bleedBox.x, geometry.bleedBox.y, geometry.bleedBox.width, geometry.bleedBox.height);
  page.setTrimBox(geometry.trim.x, geometry.trim.y, geometry.trim.width, geometry.trim.height);

  page.drawRectangle({
    x: geometry.bleedBox.x,
    y: geometry.bleedBox.y,
    width: geometry.bleedBox.width,
    height: geometry.bleedBox.height,
    color: toPdfCmyk(spec.palette.paper)
  });

  for (const asset of options.assets ?? []) {
    const image = await embedAssetImage(pdfDoc, asset);
    page.drawImage(image, {
      x: geometry.trim.x + inchesToPoints(asset.slot.x),
      y: geometry.trim.y + inchesToPoints(asset.slot.y),
      width: inchesToPoints(asset.slot.width),
      height: inchesToPoints(asset.slot.height)
    });
  }

  page.drawRectangle({
    x: geometry.trim.x + geometry.trim.width - inchesToPoints(0.3),
    y: geometry.trim.y + inchesToPoints(0.16),
    width: inchesToPoints(0.1),
    height: geometry.trim.height - inchesToPoints(0.32),
    color: toPdfCmyk(spec.palette.accent)
  });

  page.drawRectangle({
    x: geometry.safeBox.x,
    y: geometry.safeBox.y,
    width: geometry.safeBox.width,
    height: geometry.safeBox.height,
    borderColor: rgb(0.16, 0.62, 0.46),
    borderWidth: 0.35
  });
  drawBrochureFoldGuides(page, spec);

  const fontCache = new Map<TextBlock["weight"], Awaited<ReturnType<typeof pdfDoc.embedFont>>>();
  for (const block of spec.textBlocks) {
    const fontBytes = await loadFontBytes(block.weight);
    const font = await pdfDoc.embedFont(fontBytes, { subset: false });
    fontCache.set(block.weight, font);
  }

  for (const block of spec.textBlocks) {
    const font = fontCache.get(block.weight);
    if (!font) {
      throw new Error(`Missing embedded font for ${block.weight}`);
    }
    const lines = lineBreak(block.content, Math.max(12, Math.floor(block.width * 18)));
    lines.forEach((line, index) => {
      page.drawText(line, {
        x: geometry.trim.x + inchesToPoints(block.x),
        y: geometry.trim.y + inchesToPoints(block.y) - index * block.fontSize * 1.22,
        size: block.fontSize,
        font,
        color: toPdfCmyk(block.color),
        lineHeight: block.fontSize * 1.22
      });
    });
  }

  if (spec.cropMarks) {
    drawCropMarks(page, spec);
  }

  const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
  await fs.writeFile(sourcePdfPath, pdfBytes);
  await fs.writeFile(svgMasterPath, createSvgMaster(spec, options.assets));

  return {
    sourcePdfPath,
    svgMasterPath,
    geometry
  };
}
