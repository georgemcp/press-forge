import fs from "node:fs/promises";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { canServeProofFile, cleanupStaleProofJobs, createProofDeliveryManifest, deliveryManifestFileName, writeProofDeliveryManifest } from "@/lib/print/delivery-manifest";

const tempDirs: string[] = [];
const ownerUserId = "6df3f657-766d-4f15-8af8-a3a8ccda0b04";
const proofFileRouteSource = readFileSync("src/app/api/exports/proof/files/[...file]/route.ts", "utf8");
const productionArtifacts = ["business-card", "postcard", "flyer", "poster", "brochure", "letterhead"]
  .flatMap((product) => ["source.pdf", "pdfx.pdf", "master.svg"].map((extension) => `pressforge-${product}.${extension}`));

async function makeTempDir() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "pressforge-delivery-"));
  tempDirs.push(tempDir);
  return tempDir;
}

describe("proof delivery manifest", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })));
  });

  it.each([
    ["advanced", "passed", true],
    ["advanced", "failed", false],
    ["advanced", "needs_attention", false],
    ["dummy", "passed", false],
    ["dummy", "failed", false],
    ["dummy", "needs_attention", false]
  ] as const)("gates production files for %s jobs with %s preflight", async (mode, preflightStatus, allowed) => {
    const outputDir = await makeTempDir();
    const manifest = await writeProofDeliveryManifest(outputDir, mode, ownerUserId, preflightStatus);

    expect(manifest.canDownloadProductionFiles).toBe(allowed);
    expect(manifest.preflightStatus).toBe(preflightStatus);
    for (const fileName of productionArtifacts) {
      await expect(canServeProofFile(outputDir, fileName, ownerUserId)).resolves.toBe(allowed);
    }
    await expect(canServeProofFile(outputDir, "pressforge-business-card.pdfx.pdf", "another-user")).resolves.toBe(false);
  });

  it.each([
    ["advanced", "failed"],
    ["advanced", "needs_attention"],
    ["dummy", "passed"],
    ["dummy", "failed"],
    ["dummy", "needs_attention"]
  ] as const)("keeps reports and assets inspectable for %s jobs with %s preflight", async (mode, preflightStatus) => {
    const outputDir = await makeTempDir();
    await writeProofDeliveryManifest(outputDir, mode, ownerUserId, preflightStatus);

    await expect(canServeProofFile(outputDir, "preflight-report.json", ownerUserId)).resolves.toBe(true);
    await expect(canServeProofFile(outputDir, "asset-background-art.png", ownerUserId)).resolves.toBe(true);
    await expect(canServeProofFile(outputDir, "asset-background-art-preview.png", ownerUserId)).resolves.toBe(true);
    await expect(canServeProofFile(outputDir, "proof-preview.png", ownerUserId)).resolves.toBe(true);
    await expect(canServeProofFile(outputDir, "proof-preview.png", "another-user")).resolves.toBe(false);
    await expect(canServeProofFile(outputDir, "asset-background-art.png", "another-user")).resolves.toBe(false);
  });

  it.each([
    { mode: "dummy" },
    { mode: "unknown" },
    { mode: undefined },
    { preflightStatus: "failed" },
    { preflightStatus: "needs_attention" },
    { preflightStatus: "unknown" },
    { canDownloadProductionFiles: false },
    { canDownloadProductionFiles: "true" },
    { canDownloadProductionFiles: undefined }
  ])("rejects production downloads for contradictory or incomplete manifests: %j", async (override) => {
    const outputDir = await makeTempDir();
    const manifest = { ...createProofDeliveryManifest("advanced", ownerUserId, "passed"), ...override };
    await fs.writeFile(path.join(outputDir, deliveryManifestFileName), JSON.stringify(manifest));

    for (const fileName of productionArtifacts) {
      await expect(canServeProofFile(outputDir, fileName, ownerUserId)).resolves.toBe(false);
    }
  });

  it.each(["advanced", "dummy"] as const)("keeps legacy v2 %s manifests inspectable but closes production access", async (mode) => {
    const outputDir = await makeTempDir();
    await fs.writeFile(path.join(outputDir, deliveryManifestFileName), JSON.stringify({
      version: 2,
      ownerUserId,
      mode,
      canDownloadProductionFiles: mode === "advanced",
      createdAt: new Date().toISOString()
    }));

    await expect(canServeProofFile(outputDir, "preflight-report.json", ownerUserId)).resolves.toBe(true);
    await expect(canServeProofFile(outputDir, "asset-background-art.png", ownerUserId)).resolves.toBe(true);
    await expect(canServeProofFile(outputDir, "asset-background-art.png", "another-user")).resolves.toBe(false);
    for (const fileName of productionArtifacts) {
      await expect(canServeProofFile(outputDir, fileName, ownerUserId)).resolves.toBe(false);
    }
  });

  it("blocks production artifacts when no manifest exists", async () => {
    const outputDir = await makeTempDir();

    await expect(canServeProofFile(outputDir, "pressforge-business-card.pdfx.pdf", ownerUserId)).resolves.toBe(false);
  });

  it("writes a versioned manifest", async () => {
    const outputDir = await makeTempDir();
    const manifest = await writeProofDeliveryManifest(outputDir, "advanced", ownerUserId, "passed");
    const saved = JSON.parse(await fs.readFile(path.join(outputDir, deliveryManifestFileName), "utf8"));

    expect(saved).toMatchObject({
      version: 2,
      ownerUserId,
      mode: "advanced",
      preflightStatus: "passed",
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
