import fs from "node:fs/promises";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { canServeProofFile, deliveryManifestFileName, isAllowedProofFileName, writeProofDeliveryManifest } from "@/lib/print/delivery-manifest";

const tempDirs: string[] = [];
const proofFileRouteSource = readFileSync("src/app/api/exports/proof/files/[...file]/route.ts", "utf8");

async function makeTempDir() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "pressforge-delivery-"));
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
    await expect(canServeProofFile(outputDir, "trimproof-poster.pdfx.pdf")).resolves.toBe(true);
    await expect(canServeProofFile(outputDir, "trimproof-brochure.pdfx.pdf")).resolves.toBe(true);
    await expect(canServeProofFile(outputDir, "trimproof-postcard.pdfx.pdf")).resolves.toBe(true);
    await expect(canServeProofFile(outputDir, "trimproof-letterhead.pdfx.pdf")).resolves.toBe(true);
    await expect(canServeProofFile(outputDir, "trimproof-menu.pdfx.pdf")).resolves.toBe(true);
    await expect(canServeProofFile(outputDir, "trimproof-business-card.source.pdf")).resolves.toBe(true);
    await expect(canServeProofFile(outputDir, "trimproof-business-card.master.svg")).resolves.toBe(true);
    await expect(canServeProofFile(outputDir, "pressforge-business-card.pdfx.pdf")).resolves.toBe(true);
  });

  it("blocks production proof artifacts for dummy jobs", async () => {
    const outputDir = await makeTempDir();
    await writeProofDeliveryManifest(outputDir, "dummy");

    await expect(canServeProofFile(outputDir, "trimproof-business-card.pdfx.pdf")).resolves.toBe(false);
    await expect(canServeProofFile(outputDir, "trimproof-flyer.pdfx.pdf")).resolves.toBe(false);
    await expect(canServeProofFile(outputDir, "trimproof-poster.pdfx.pdf")).resolves.toBe(false);
    await expect(canServeProofFile(outputDir, "trimproof-brochure.pdfx.pdf")).resolves.toBe(false);
    await expect(canServeProofFile(outputDir, "trimproof-business-card.source.pdf")).resolves.toBe(false);
    await expect(canServeProofFile(outputDir, "trimproof-business-card.master.svg")).resolves.toBe(false);
  });

  it("still allows non-production proof files for dummy jobs", async () => {
    const outputDir = await makeTempDir();
    await writeProofDeliveryManifest(outputDir, "dummy");

    await expect(canServeProofFile(outputDir, "preflight-report.json")).resolves.toBe(true);
    await expect(canServeProofFile(outputDir, "preflight-report.html")).resolves.toBe(true);
    await expect(canServeProofFile(outputDir, "preflight-report.txt")).resolves.toBe(true);
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

  it("keeps the proof file route aligned with supported production artifacts", () => {
    expect(proofFileRouteSource).toContain("isAllowedProofFileName");
    expect(isAllowedProofFileName("trimproof-poster.pdfx.pdf")).toBe(true);
    expect(isAllowedProofFileName("trimproof-brochure.pdfx.pdf")).toBe(true);
    expect(isAllowedProofFileName("trimproof-menu.pdfx.pdf")).toBe(true);
    expect(isAllowedProofFileName("preflight-report.html")).toBe(true);
    expect(isAllowedProofFileName("../delivery-manifest.json")).toBe(false);
  });
});
