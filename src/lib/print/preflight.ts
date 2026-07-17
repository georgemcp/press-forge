import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { getPageGeometry, type ProductType } from "./constants";
import { convertToPdfX, type GhostscriptResult } from "./ghostscript";
import type { ResolvedAsset } from "./assets";
import type { LayoutSpec } from "./layout-spec";

const execFileAsync = promisify(execFile);

export type PreflightStatus = "passed" | "failed" | "needs_attention";

export interface PreflightCheck {
  id: string;
  label: string;
  status: PreflightStatus;
  evidence: string;
}

export interface PreflightReport {
  status: PreflightStatus;
  pdfPath: string;
  pdfxPath?: string;
  productType: ProductType;
  printProfile: LayoutSpec["printProfile"];
  pdfxLevel: LayoutSpec["pdfxLevel"];
  checks: PreflightCheck[];
  ghostscript: GhostscriptResult;
  generatedAt: string;
}

interface AssetPreflightInput {
  slotId: string;
  provider: ResolvedAsset["provider"];
  widthPx: number;
  heightPx: number;
  effectiveDpi: number;
  minimumDpi: number;
  slot: {
    width: number;
    height: number;
  };
}

interface Box {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function parseBox(output: string, label: string): Box | undefined {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`${escaped}:\\s+(-?\\d+\\.?\\d*)\\s+(-?\\d+\\.?\\d*)\\s+(-?\\d+\\.?\\d*)\\s+(-?\\d+\\.?\\d*)`);
  const match = output.match(regex);
  if (!match) {
    return undefined;
  }
  return {
    x1: Number(match[1]),
    y1: Number(match[2]),
    x2: Number(match[3]),
    y2: Number(match[4])
  };
}

function near(actual: number, expected: number, tolerance = 0.75) {
  return Math.abs(actual - expected) <= tolerance;
}

function checkBoxDimensions(box: Box | undefined, expectedWidth: number, expectedHeight: number, label: string): PreflightCheck {
  if (!box) {
    return {
      id: `${label.toLowerCase()}_box`,
      label: `${label} present`,
      status: "failed",
      evidence: `${label} was not reported by pdfinfo -box.`
    };
  }
  const width = box.x2 - box.x1;
  const height = box.y2 - box.y1;
  const passed = near(width, expectedWidth) && near(height, expectedHeight);
  return {
    id: `${label.toLowerCase()}_box`,
    label: `${label} dimensions`,
    status: passed ? "passed" : "failed",
    evidence: `${label} ${width.toFixed(2)} x ${height.toFixed(2)} pt; expected ${expectedWidth.toFixed(2)} x ${expectedHeight.toFixed(2)} pt.`
  };
}

async function getCommandOutput(command: string, args: string[]) {
  const result = await execFileAsync(command, args, { maxBuffer: 1024 * 1024 * 8, timeout: 30_000, killSignal: "SIGKILL" });
  return `${result.stdout}\n${result.stderr}`.trim();
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function checkPlacedRasterDpi(assets: AssetPreflightInput[]): PreflightCheck {
  if (assets.length === 0) {
    return {
      id: "raster_dpi",
      label: "Placed raster DPI",
      status: "passed",
      evidence: "No raster assets were placed in this proof; image DPI floor is vacuously satisfied."
    };
  }

  const failed = assets.filter((asset) => asset.effectiveDpi < asset.minimumDpi);
  return {
    id: "raster_dpi",
    label: "Placed raster DPI",
    status: failed.length === 0 ? "passed" : "failed",
    evidence: assets
      .map(
        (asset) =>
          `${asset.slotId} ${asset.provider} ${asset.widthPx}x${asset.heightPx}px over ${asset.slot.width.toFixed(2)}x${asset.slot.height.toFixed(2)} in = ${asset.effectiveDpi.toFixed(0)} dpi; minimum ${asset.minimumDpi} dpi.`
      )
      .join(" | ")
  };
}

export async function runPreflight(
  sourcePdfPath: string,
  spec: Pick<LayoutSpec, "productType" | "printProfile" | "pdfxLevel">,
  outputDir: string,
  assets: AssetPreflightInput[] = []
): Promise<PreflightReport> {
  const geometry = getPageGeometry(spec.productType);
  const ghostscript = await convertToPdfX(sourcePdfPath, outputDir, {
    mediaBox: geometry.mediaBox,
    bleedBox: geometry.bleedBox,
    trim: geometry.trim
  }, spec.printProfile);
  const pdfPath = ghostscript.outputPdfPath && !ghostscript.error && (await fileExists(ghostscript.outputPdfPath)) ? ghostscript.outputPdfPath : sourcePdfPath;
  const checks: PreflightCheck[] = [];

  checks.push({
    id: "pdf_exists",
    label: "PDF created",
    status: (await fileExists(pdfPath)) ? "passed" : "failed",
    evidence: pdfPath
  });

  try {
    const pdfInfo = await getCommandOutput("pdfinfo", ["-box", pdfPath]);
    checks.push(checkBoxDimensions(parseBox(pdfInfo, "TrimBox"), geometry.trim.width, geometry.trim.height, "TrimBox"));
    checks.push(checkBoxDimensions(parseBox(pdfInfo, "BleedBox"), geometry.bleedBox.width, geometry.bleedBox.height, "BleedBox"));
    checks.push(checkBoxDimensions(parseBox(pdfInfo, "MediaBox"), geometry.mediaBox.width, geometry.mediaBox.height, "MediaBox"));
    const subtype = pdfInfo.match(/PDF subtype:\s+(.+)/)?.[1]?.trim();
    const expectedSubtype = spec.pdfxLevel === "PDF/X-4" ? "PDF/X-4" : "PDF/X-1a";
    checks.push({
      id: "pdfx_subtype",
      label: "PDF/X subtype",
      status: subtype?.includes(expectedSubtype) ? "passed" : ghostscript.error ? "needs_attention" : "failed",
      evidence: subtype ? `pdfinfo reported ${subtype}; expected ${spec.pdfxLevel}.` : "pdfinfo did not report a PDF/X subtype."
    });
  } catch (error) {
    checks.push({
      id: "pdfinfo",
      label: "pdfinfo inspection",
      status: "failed",
      evidence: error instanceof Error ? error.message : "pdfinfo failed."
    });
  }

  try {
    const fontOutput = await getCommandOutput("pdffonts", [pdfPath]);
    const fontRows = fontOutput.split("\n").filter((line) => /yes\s+yes|yes\s+no|no\s+yes|no\s+no/.test(line));
    const allEmbedded = fontRows.length > 0 && fontRows.every((line) => /\s+yes\s+/.test(line));
    checks.push({
      id: "fonts_embedded",
      label: "Fonts embedded",
      status: allEmbedded ? "passed" : "failed",
      evidence: fontRows.length > 0 ? fontRows.join(" | ") : "No font rows were reported by pdffonts."
    });
  } catch (error) {
    checks.push({
      id: "pdffonts",
      label: "pdffonts inspection",
      status: "failed",
      evidence: error instanceof Error ? error.message : "pdffonts failed."
    });
  }

  checks.push(checkPlacedRasterDpi(assets));

  checks.push({
    id: "ghostscript_pdfx",
    label: "Ghostscript PDF/X conversion",
    status: ghostscript.available && !ghostscript.error ? "passed" : "needs_attention",
    evidence: ghostscript.error ?? `Wrote ${path.basename(ghostscript.outputPdfPath ?? sourcePdfPath)}.`
  });

  const failed = checks.some((check) => check.status === "failed");
  const attention = checks.some((check) => check.status === "needs_attention");
  const status: PreflightStatus = failed ? "failed" : attention ? "needs_attention" : "passed";

  return {
    status,
    pdfPath,
    pdfxPath: ghostscript.outputPdfPath,
    productType: spec.productType,
    printProfile: spec.printProfile,
    pdfxLevel: spec.pdfxLevel,
    checks,
    ghostscript,
    generatedAt: new Date().toISOString()
  };
}
