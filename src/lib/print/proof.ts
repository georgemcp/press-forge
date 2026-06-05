import fs from "node:fs/promises";
import path from "node:path";
import { layoutSpecSchema, type LayoutSpec } from "./layout-spec";
import { resolveLayoutAssets, type ResolvedAsset } from "./assets";
import { exportLayoutPdf } from "./pdf-export";
import { runPreflight, type PreflightReport } from "./preflight";
import { sampleBusinessCardLayout } from "./sample-layout";

export interface ProofResult {
  outputDir: string;
  sourcePdfPath: string;
  svgMasterPath: string;
  reportPath: string;
  report: PreflightReport;
  assets: ResolvedAsset[];
}

export async function generateProof(input: LayoutSpec = sampleBusinessCardLayout, outputDir = path.join(process.cwd(), "artifacts", "proof")): Promise<ProofResult> {
  const spec = layoutSpecSchema.parse(input);
  const assets = await resolveLayoutAssets(spec, outputDir);
  const exportResult = await exportLayoutPdf(spec, {
    outputDir,
    fileBaseName: "trimproof-business-card",
    assets
  });
  const report = await runPreflight(exportResult.sourcePdfPath, spec.productType, outputDir, assets);
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
