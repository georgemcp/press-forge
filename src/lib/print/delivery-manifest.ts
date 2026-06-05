import fs from "node:fs/promises";
import path from "node:path";

export const deliveryManifestFileName = "delivery-manifest.json";

export interface ProofDeliveryManifest {
  version: 1;
  mode: "dummy" | "advanced";
  canDownloadProductionFiles: boolean;
  createdAt: string;
}

const productionArtifactPattern = /^trimproof-business-card\.(?:source\.pdf|pdfx\.pdf|master\.svg)$/;

export function isProductionArtifact(fileName: string) {
  return productionArtifactPattern.test(fileName);
}

export function createProofDeliveryManifest(mode: "dummy" | "advanced"): ProofDeliveryManifest {
  return {
    version: 1,
    mode,
    canDownloadProductionFiles: mode === "advanced",
    createdAt: new Date().toISOString()
  };
}

export async function writeProofDeliveryManifest(outputDir: string, mode: "dummy" | "advanced") {
  const manifest = createProofDeliveryManifest(mode);
  await fs.writeFile(path.join(outputDir, deliveryManifestFileName), JSON.stringify(manifest, null, 2));
  return manifest;
}

export async function canServeProofFile(outputDir: string, fileName: string) {
  if (!isProductionArtifact(fileName)) {
    return true;
  }

  try {
    const manifestBytes = await fs.readFile(path.join(outputDir, deliveryManifestFileName), "utf8");
    const manifest = JSON.parse(manifestBytes) as Partial<ProofDeliveryManifest>;
    return manifest.version === 1 && manifest.canDownloadProductionFiles === true;
  } catch {
    return false;
  }
}
