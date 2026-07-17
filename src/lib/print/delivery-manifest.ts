import fs from "node:fs/promises";
import path from "node:path";

export const deliveryManifestFileName = "delivery-manifest.json";

export interface ProofDeliveryManifest {
  version: 2;
  ownerUserId: string;
  mode: "dummy" | "advanced";
  canDownloadProductionFiles: boolean;
  createdAt: string;
}

const productionArtifactPattern = /^pressforge-(?:business-card|postcard|flyer|poster|brochure|letterhead)\.(?:source\.pdf|pdfx\.pdf|master\.svg)$/;
const jobDirectoryPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let lastCleanupAt = 0;

export function isProductionArtifact(fileName: string) {
  return productionArtifactPattern.test(fileName);
}

export function createProofDeliveryManifest(mode: "dummy" | "advanced", ownerUserId: string): ProofDeliveryManifest {
  return {
    version: 2,
    ownerUserId,
    mode,
    canDownloadProductionFiles: mode === "advanced",
    createdAt: new Date().toISOString()
  };
}

export async function writeProofDeliveryManifest(outputDir: string, mode: "dummy" | "advanced", ownerUserId: string) {
  const manifest = createProofDeliveryManifest(mode, ownerUserId);
  await fs.writeFile(path.join(outputDir, deliveryManifestFileName), JSON.stringify(manifest, null, 2));
  return manifest;
}

export async function canServeProofFile(outputDir: string, fileName: string, ownerUserId: string) {
  try {
    const manifestBytes = await fs.readFile(path.join(outputDir, deliveryManifestFileName), "utf8");
    const manifest = JSON.parse(manifestBytes) as Partial<ProofDeliveryManifest>;
    if (manifest.version !== 2 || manifest.ownerUserId !== ownerUserId) {
      return false;
    }
    return !isProductionArtifact(fileName) || manifest.canDownloadProductionFiles === true;
  } catch {
    return false;
  }
}

function generatedArtifactTtlMs() {
  const hours = Number(process.env.TRIMPROOF_GENERATED_TTL_HOURS ?? 24);
  const boundedHours = Number.isFinite(hours) ? Math.max(1, Math.min(168, hours)) : 24;
  return boundedHours * 60 * 60 * 1000;
}

export async function cleanupStaleProofJobs(generatedRoot: string, now = Date.now(), force = false) {
  if (!force && now - lastCleanupAt < 60 * 60 * 1000) {
    return 0;
  }
  lastCleanupAt = now;

  const resolvedRoot = path.resolve(generatedRoot);
  if (resolvedRoot === path.parse(resolvedRoot).root) {
    throw new Error("Refusing to clean a filesystem root.");
  }

  const entries = await fs.readdir(resolvedRoot, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  });
  let removed = 0;
  for (const entry of entries) {
    if (!entry.isDirectory() || !jobDirectoryPattern.test(entry.name)) {
      continue;
    }
    const jobPath = path.join(resolvedRoot, entry.name);
    const stat = await fs.stat(jobPath);
    if (now - stat.mtimeMs > generatedArtifactTtlMs()) {
      await fs.rm(jobPath, { recursive: true, force: true });
      removed += 1;
    }
  }
  return removed;
}
