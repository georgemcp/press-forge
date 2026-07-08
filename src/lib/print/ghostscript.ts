import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { PDFDocument } from "pdf-lib";
import { PRINT_PROFILES, type PrintProfileId } from "./constants";

const execFileAsync = promisify(execFile);

export interface GhostscriptResult {
  available: boolean;
  outputPdfPath?: string;
  command?: string[];
  stdout?: string;
  stderr?: string;
  error?: string;
}

interface PdfBoxes {
  mediaBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  bleedBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  trim: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

const OUTPUT_CONDITION_IDENTIFIERS: Record<PrintProfileId, string> = {
  USWebCoatedSWOP: "CGATS TR001",
  GRACoL2013: "CGATS21-2-CRPC6",
  FOGRA39: "FOGRA39"
};

async function commandExists(command: string) {
  try {
    await execFileAsync("which", [command]);
    return true;
  } catch {
    return false;
  }
}

async function firstExisting(paths: string[]) {
  for (const candidate of paths) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Keep looking.
    }
  }
  return undefined;
}

export async function locateCmykProfile() {
  const explicit = process.env.CMYK_ICC_PROFILE_PATH;
  const candidates = [
    explicit,
    "/opt/homebrew/Cellar/ghostscript/10.07.1/share/ghostscript/iccprofiles/default_cmyk.icc",
    "/opt/homebrew/share/ghostscript/iccprofiles/default_cmyk.icc",
    "/opt/homebrew/share/ghostscript/10.07.1/iccprofiles/default_cmyk.icc",
    "/usr/local/share/ghostscript/iccprofiles/default_cmyk.icc",
    "/usr/share/color/icc/ghostscript/default_cmyk.icc",
    "/usr/share/ghostscript/iccprofiles/default_cmyk.icc"
  ].filter(Boolean) as string[];

  return firstExisting(candidates);
}

async function locatePdfxDefinition() {
  const versionedSharePath = await firstExisting(
    await fs
      .readdir("/usr/share/ghostscript", { withFileTypes: true })
      .then((entries) =>
        entries
          .filter((entry) => entry.isDirectory())
          .map((entry) => path.join("/usr/share/ghostscript", entry.name, "lib", "PDFX_def.ps"))
          .sort()
          .reverse()
      )
      .catch(() => [])
  );

  return firstExisting([
    "/opt/homebrew/Cellar/ghostscript/10.07.1/share/ghostscript/lib/PDFX_def.ps",
    "/opt/homebrew/share/ghostscript/lib/PDFX_def.ps",
    "/usr/local/share/ghostscript/lib/PDFX_def.ps",
    versionedSharePath,
    "/usr/share/ghostscript/lib/PDFX_def.ps"
  ].filter(Boolean) as string[]);
}

function postScriptString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

async function writePdfxDefinition(outputDir: string, printProfile: PrintProfileId, iccPath?: string) {
  const definitionPath = await locatePdfxDefinition();
  if (!definitionPath) {
    return undefined;
  }
  const profile = PRINT_PROFILES[printProfile];
  const conditionIdentifier = OUTPUT_CONDITION_IDENTIFIERS[printProfile];
  const definition = await fs.readFile(definitionPath, "utf8");
  const patched = definition
    .replace(/PDF\/X-3:2002/g, "PDF/X-1a:2001")
    .replace(/^\/ICCProfile .*$/m, iccPath ? `/ICCProfile (${postScriptString(iccPath)}) def` : "")
    .replace(/^  \/OutputCondition .*$/m, `  /OutputCondition (${postScriptString(profile.market)})`)
    .replace(/^  \/Info .*$/m, `  /Info (${postScriptString(profile.label)})`)
    .replace(/^  \/OutputConditionIdentifier .*$/m, `  /OutputConditionIdentifier (${postScriptString(conditionIdentifier)})`);
  const customPath = path.join(outputDir, "PDFX_def.trimproof.ps");
  await fs.writeFile(customPath, patched);
  return customPath;
}

async function restorePageBoxes(pdfPath: string, boxes: PdfBoxes) {
  const pdfBytes = await fs.readFile(pdfPath);
  const doc = await PDFDocument.load(pdfBytes, { updateMetadata: false });
  const page = doc.getPage(0);
  page.setMediaBox(boxes.mediaBox.x, boxes.mediaBox.y, boxes.mediaBox.width, boxes.mediaBox.height);
  page.setCropBox(boxes.mediaBox.x, boxes.mediaBox.y, boxes.mediaBox.width, boxes.mediaBox.height);
  page.setBleedBox(boxes.bleedBox.x, boxes.bleedBox.y, boxes.bleedBox.width, boxes.bleedBox.height);
  page.setTrimBox(boxes.trim.x, boxes.trim.y, boxes.trim.width, boxes.trim.height);
  await fs.writeFile(pdfPath, await doc.save({ useObjectStreams: false }));
}

export async function convertToPdfX(sourcePdfPath: string, outputDir: string, boxes?: PdfBoxes, printProfile: PrintProfileId = "USWebCoatedSWOP"): Promise<GhostscriptResult> {
  const available = await commandExists("gs");
  if (!available) {
    return {
      available: false,
      error: "Ghostscript is not installed or not on PATH."
    };
  }

  await fs.mkdir(outputDir, { recursive: true });
  const outputPdfPath = path.join(outputDir, `${path.basename(sourcePdfPath, ".source.pdf")}.pdfx.pdf`);
  const iccPath = await locateCmykProfile();
  const pdfxDefinitionPath = await writePdfxDefinition(outputDir, printProfile, iccPath);

  const args = [
    "-dBATCH",
    "-dNOPAUSE",
    "-dSAFER",
    ...(iccPath ? [`--permit-file-read=${iccPath}`] : []),
    "-sDEVICE=pdfwrite",
    "-dCompatibilityLevel=1.4",
    "-dPDFSETTINGS=/prepress",
    "-dEmbedAllFonts=true",
    "-dSubsetFonts=false",
    "-dCompressFonts=true",
    "-sColorConversionStrategy=CMYK",
    "-dProcessColorModel=/DeviceCMYK",
    "-dConvertCMYKImagesToRGB=false",
    "-dDetectDuplicateImages=true",
    "-sOutputFile=" + outputPdfPath
  ];

  if (pdfxDefinitionPath) {
    args.push(pdfxDefinitionPath);
  }

  args.push(sourcePdfPath);

  try {
    const result = await execFileAsync("gs", args, { maxBuffer: 1024 * 1024 * 8 });
    if (boxes) {
      await restorePageBoxes(outputPdfPath, boxes);
    }
    return {
      available: true,
      outputPdfPath,
      command: ["gs", ...args],
      stdout: result.stdout,
      stderr: result.stderr
    };
  } catch (error) {
    const err = error as Error & { stdout?: string; stderr?: string };
    return {
      available: true,
      outputPdfPath,
      command: ["gs", ...args],
      stdout: err.stdout,
      stderr: err.stderr,
      error: err.message
    };
  }
}
