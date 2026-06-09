import fs from "node:fs/promises";
import path from "node:path";
import { layoutSpecSchema, type LayoutSpec } from "./layout-spec";
import { resolveLayoutAssets, type ResolvedAsset } from "./assets";
import { exportLayoutPdf } from "./pdf-export";
import { runPreflight, type PreflightReport } from "./preflight";
import { sampleBusinessCardLayout } from "./sample-layout";

function getProofFileBaseName(productType: LayoutSpec["productType"]) {
  return `pressforge-${productType.replaceAll("_", "-")}`;
}

export interface ProofResult {
  outputDir: string;
  sourcePdfPath: string;
  svgMasterPath: string;
  reportPath: string;
  report: PreflightReport;
  assets: ResolvedAsset[];
}

export interface GenerateProofOptions {
  watermarkDemoArt?: boolean;
}

export async function generateProof(
  input: LayoutSpec = sampleBusinessCardLayout,
  outputDir = path.join(process.cwd(), "artifacts", "proof"),
  options: GenerateProofOptions = {}
): Promise<ProofResult> {
  const spec = layoutSpecSchema.parse(input);
  const assets = await resolveLayoutAssets(spec, outputDir, {
    watermarkDemoArt: options.watermarkDemoArt
  });
  const exportResult = await exportLayoutPdf(spec, {
    outputDir,
    fileBaseName: getProofFileBaseName(spec.productType),
    assets
  });
  const report = await runPreflight(exportResult.sourcePdfPath, spec, outputDir, assets);
  const reportPath = path.join(outputDir, "preflight-report.json");
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

  return {
    outputDir,
    sourcePdfPath: exportResult.sourcePdfPath,
    svgMasterPath: exportResult.svgMasterPath,
    reportPath,
    report,
    assets
  };
}
