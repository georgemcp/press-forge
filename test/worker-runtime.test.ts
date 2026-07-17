import { readFileSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createWorkerProofOutputDir,
  startWorkerProofRetention,
  workerProofCleanupIntervalMs
} from "@/worker/runtime";

const tempDirs: string[] = [];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const workerSource = readFileSync("src/worker/index.ts", "utf8");

async function makeTempDir() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "trimproof-worker-runtime-"));
  tempDirs.push(tempDir);
  return tempDir;
}

describe("worker proof runtime", () => {
  afterEach(async () => {
    vi.useRealTimers();
    await Promise.all(tempDirs.splice(0).map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })));
  });

  it("allocates every queued proof under a fresh UUID directory", async () => {
    const generatedRoot = await makeTempDir();
    const first = createWorkerProofOutputDir(generatedRoot);
    const second = createWorkerProofOutputDir(generatedRoot);

    expect(path.dirname(first)).toBe(generatedRoot);
    expect(path.basename(first)).toMatch(uuidPattern);
    expect(path.basename(second)).toMatch(uuidPattern);
    expect(second).not.toBe(first);
    expect(first).not.toContain(path.join("artifacts", "proof"));
  });

  it("wires retention and isolated output into the BullMQ processor", () => {
    expect(workerSource).toContain("await startWorkerProofRetention(generatedRoot");
    expect(workerSource).toContain("const outputDir = createWorkerProofOutputDir(generatedRoot)");
    expect(workerSource).toContain("generateProof(spec, outputDir)");
    expect(workerSource).not.toContain("generateProof(spec);");
  });

  it("forces cleanup at startup and every hour", async () => {
    vi.useFakeTimers();
    const now = new Date("2026-07-17T18:00:00Z");
    vi.setSystemTime(now);
    const generatedRoot = "/app/.trimproof-generated";
    const onCleanupError = vi.fn();
    const cleanup = vi.fn().mockResolvedValue(0);
    const timer = await startWorkerProofRetention(generatedRoot, onCleanupError, cleanup);

    expect(cleanup).toHaveBeenNthCalledWith(1, generatedRoot, now.getTime(), true);
    await vi.advanceTimersByTimeAsync(workerProofCleanupIntervalMs);

    expect(cleanup).toHaveBeenNthCalledWith(
      2,
      generatedRoot,
      now.getTime() + workerProofCleanupIntervalMs,
      true
    );
    expect(onCleanupError).not.toHaveBeenCalled();
    clearInterval(timer);
  });
});
