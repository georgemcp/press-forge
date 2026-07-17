import { randomUUID } from "node:crypto";
import path from "node:path";
import { cleanupStaleProofJobs } from "@/lib/print/delivery-manifest";

export const workerProofCleanupIntervalMs = 60 * 60 * 1000;

export function workerGeneratedProofRoot() {
  return process.env.TRIMPROOF_GENERATED_DIR ?? path.join(process.cwd(), ".trimproof-generated");
}

export function createWorkerProofOutputDir(generatedRoot = workerGeneratedProofRoot()) {
  return path.join(generatedRoot, randomUUID());
}

export async function startWorkerProofRetention(
  generatedRoot: string,
  onCleanupError: (error: unknown) => void,
  cleanup: typeof cleanupStaleProofJobs = cleanupStaleProofJobs
) {
  await cleanup(generatedRoot, Date.now(), true);

  const timer = setInterval(async () => {
    try {
      await cleanup(generatedRoot, Date.now(), true);
    } catch (error) {
      onCleanupError(error);
    }
  }, workerProofCleanupIntervalMs);
  timer.unref();
  return timer;
}
