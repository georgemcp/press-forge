import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { canServeProofFile, deliveryManifestFileName, writeProofDeliveryManifest } from "@/lib/print/delivery-manifest";

const tempDirs: string[] = [];

async function makeTempDir() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "trimproof-delivery-"));
  tempDirs.push(tempDir);
  return tempDir;
}

describe("proof delivery manifest", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })));
  });

  it("allows production proof artifacts for advanced jobs", async () => {
    const outputDir = await makeTempDir();
    await writeProofDeliveryManifest(outputDir, "advanced");

    await expect(canServeProofFile(outputDir, "trimproof-business-card.pdfx.pdf")).resolves.toBe(true);
    await expect(canServeProofFile(outputDir, "trimproof-flyer.pdfx.pdf")).resolves.toBe(true);
    await expect(canServeProofFile(outputDir, "trimproof-postcard.pdfx.pdf")).resolves.toBe(true);
    await expect(canServeProofFile(outputDir, "trimproof-letterhead.pdfx.pdf")).resolves.toBe(true);
    await expect(canServeProofFile(outputDir, "trimproof-business-card.source.pdf")).resolves.toBe(true);
    await expect(canServeProofFile(outputDir, "trimproof-business-card.master.svg")).resolves.toBe(true);
  });

  it("blocks production proof artifacts for dummy jobs", async () => {
    const outputDir = await makeTempDir();
    await writeProofDeliveryManifest(outputDir, "dummy");

    await expect(canServeProofFile(outputDir, "trimproof-business-card.pdfx.pdf")).resolves.toBe(false);
    await expect(canServeProofFile(outputDir, "trimproof-flyer.pdfx.pdf")).resolves.toBe(false);
    await expect(canServeProofFile(outputDir, "trimproof-business-card.source.pdf")).resolves.toBe(false);
    await expect(canServeProofFile(outputDir, "trimproof-business-card.master.svg")).resolves.toBe(false);
  });

  it("still allows non-production proof files for dummy jobs", async () => {
    const outputDir = await makeTempDir();
    await writeProofDeliveryManifest(outputDir, "dummy");

    await expect(canServeProofFile(outputDir, "preflight-report.json")).resolves.toBe(true);
    await expect(canServeProofFile(outputDir, "asset-background-art.png")).resolves.toBe(true);
  });

  it("blocks production artifacts when no manifest exists", async () => {
    const outputDir = await makeTempDir();

    await expect(canServeProofFile(outputDir, "trimproof-business-card.pdfx.pdf")).resolves.toBe(false);
  });

  it("writes a versioned manifest", async () => {
    const outputDir = await makeTempDir();
    const manifest = await writeProofDeliveryManifest(outputDir, "advanced");
    const saved = JSON.parse(await fs.readFile(path.join(outputDir, deliveryManifestFileName), "utf8"));

    expect(saved).toMatchObject({
      version: 1,
      mode: "advanced",
      canDownloadProductionFiles: true
    });
    expect(saved.createdAt).toBe(manifest.createdAt);
  });
});
