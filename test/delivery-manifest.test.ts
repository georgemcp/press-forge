import fs from "node:fs/promises";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { canServeProofFile, cleanupStaleProofJobs, deliveryManifestFileName, writeProofDeliveryManifest } from "@/lib/print/delivery-manifest";

const tempDirs: string[] = [];
const ownerUserId = "6df3f657-766d-4f15-8af8-a3a8ccda0b04";
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
    await writeProofDeliveryManifest(outputDir, "advanced", ownerUserId);

    await expect(canServeProofFile(outputDir, "pressforge-business-card.pdfx.pdf", ownerUserId)).resolves.toBe(true);
    await expect(canServeProofFile(outputDir, "pressforge-flyer.pdfx.pdf", ownerUserId)).resolves.toBe(true);
    await expect(canServeProofFile(outputDir, "pressforge-poster.pdfx.pdf", ownerUserId)).resolves.toBe(true);
    await expect(canServeProofFile(outputDir, "pressforge-brochure.pdfx.pdf", ownerUserId)).resolves.toBe(true);
    await expect(canServeProofFile(outputDir, "pressforge-postcard.pdfx.pdf", ownerUserId)).resolves.toBe(true);
    await expect(canServeProofFile(outputDir, "pressforge-letterhead.pdfx.pdf", ownerUserId)).resolves.toBe(true);
    await expect(canServeProofFile(outputDir, "pressforge-business-card.source.pdf", ownerUserId)).resolves.toBe(true);
    await expect(canServeProofFile(outputDir, "pressforge-business-card.master.svg", ownerUserId)).resolves.toBe(true);
  });

  it("blocks production proof artifacts for dummy jobs", async () => {
    const outputDir = await makeTempDir();
    await writeProofDeliveryManifest(outputDir, "dummy", ownerUserId);

    await expect(canServeProofFile(outputDir, "pressforge-business-card.pdfx.pdf", ownerUserId)).resolves.toBe(false);
    await expect(canServeProofFile(outputDir, "pressforge-flyer.pdfx.pdf", ownerUserId)).resolves.toBe(false);
    await expect(canServeProofFile(outputDir, "pressforge-poster.pdfx.pdf", ownerUserId)).resolves.toBe(false);
    await expect(canServeProofFile(outputDir, "pressforge-brochure.pdfx.pdf", ownerUserId)).resolves.toBe(false);
    await expect(canServeProofFile(outputDir, "pressforge-business-card.source.pdf", ownerUserId)).resolves.toBe(false);
    await expect(canServeProofFile(outputDir, "pressforge-business-card.master.svg", ownerUserId)).resolves.toBe(false);
  });

  it("still allows non-production proof files for dummy jobs", async () => {
    const outputDir = await makeTempDir();
    await writeProofDeliveryManifest(outputDir, "dummy", ownerUserId);

    await expect(canServeProofFile(outputDir, "preflight-report.json", ownerUserId)).resolves.toBe(true);
    await expect(canServeProofFile(outputDir, "asset-background-art.png", ownerUserId)).resolves.toBe(true);
    await expect(canServeProofFile(outputDir, "asset-background-art.png", "another-user")).resolves.toBe(false);
  });

  it("blocks production artifacts when no manifest exists", async () => {
    const outputDir = await makeTempDir();

    await expect(canServeProofFile(outputDir, "pressforge-business-card.pdfx.pdf", ownerUserId)).resolves.toBe(false);
  });

  it("writes a versioned manifest", async () => {
    const outputDir = await makeTempDir();
    const manifest = await writeProofDeliveryManifest(outputDir, "advanced", ownerUserId);
    const saved = JSON.parse(await fs.readFile(path.join(outputDir, deliveryManifestFileName), "utf8"));

    expect(saved).toMatchObject({
      version: 2,
      ownerUserId,
      mode: "advanced",
      canDownloadProductionFiles: true
    });
    expect(saved.createdAt).toBe(manifest.createdAt);
  });

  it("keeps the proof file route aligned with supported production artifacts", () => {
    expect(proofFileRouteSource).toContain("poster");
    expect(proofFileRouteSource).toContain("brochure");
  });

  it("removes only stale UUID-named proof job directories", async () => {
    const outputDir = await makeTempDir();
    const staleJob = path.join(outputDir, "6df3f657-766d-4f15-8af8-a3a8ccda0b04");
    const currentJob = path.join(outputDir, "f35dd3c9-4d90-429b-8e6f-df069286c39e");
    const unrelated = path.join(outputDir, "keep-me");
    await Promise.all([fs.mkdir(staleJob), fs.mkdir(currentJob), fs.mkdir(unrelated)]);
    const now = new Date("2026-07-17T12:00:00Z").getTime();
    await fs.utimes(staleJob, new Date(now - 48 * 60 * 60 * 1000), new Date(now - 48 * 60 * 60 * 1000));

    await expect(cleanupStaleProofJobs(outputDir, now, true)).resolves.toBe(1);
    await expect(fs.access(staleJob)).rejects.toThrow();
    await expect(fs.access(currentJob)).resolves.toBeUndefined();
    await expect(fs.access(unrelated)).resolves.toBeUndefined();
  });
});
