import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveLayoutAssets } from "@/lib/print/assets";
import { sampleBusinessCardLayout } from "@/lib/print/sample-layout";

const tempDirs: string[] = [];
const assetsSource = readFileSync("src/lib/print/assets.ts", "utf8");

async function makeTempDir() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "trimproof-assets-"));
  tempDirs.push(tempDir);
  return tempDir;
}

const layoutWithAsset = {
  ...sampleBusinessCardLayout,
  assetSlots: [
    {
      id: "background-art",
      kind: "background" as const,
      prompt: "A precise commercial print studio calibration background.",
      providerHint: "deterministic" as const,
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      minimumDpi: 300
    }
  ]
};

describe("demo asset watermarking", () => {
  afterEach(async () => {
    vi.unstubAllEnvs();
    await Promise.all(tempDirs.splice(0).map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })));
  });

  it("leaves default asset output clean for paid exports", async () => {
    vi.stubEnv("TRIMPROOF_ASSET_DPI", "300");
    vi.stubEnv("TRIMPROOF_IMAGE_PROVIDER_MODE", "deterministic");
    const firstOutputDir = await makeTempDir();
    const secondOutputDir = await makeTempDir();

    const [defaultAsset] = await resolveLayoutAssets(layoutWithAsset, firstOutputDir);
    const [explicitCleanAsset] = await resolveLayoutAssets(layoutWithAsset, secondOutputDir, {
      watermarkDemoArt: false
    });

    expect(Buffer.compare(Buffer.from(defaultAsset.bytes), Buffer.from(explicitCleanAsset.bytes))).toBe(0);
  });

  it("watermarks demo raster art before the asset URL can be served", async () => {
    vi.stubEnv("TRIMPROOF_ASSET_DPI", "300");
    vi.stubEnv("TRIMPROOF_IMAGE_PROVIDER_MODE", "deterministic");
    const cleanOutputDir = await makeTempDir();
    const watermarkedOutputDir = await makeTempDir();

    const [cleanAsset] = await resolveLayoutAssets(layoutWithAsset, cleanOutputDir, {
      watermarkDemoArt: false
    });
    const [watermarkedAsset] = await resolveLayoutAssets(layoutWithAsset, watermarkedOutputDir, {
      watermarkDemoArt: true
    });
    const cleanPreview = await fs.readFile(cleanAsset.previewPath);
    const watermarkedPreview = await fs.readFile(watermarkedAsset.previewPath);

    expect(Buffer.compare(Buffer.from(cleanAsset.bytes), Buffer.from(watermarkedAsset.bytes))).not.toBe(0);
    expect(Buffer.compare(cleanPreview, watermarkedPreview)).not.toBe(0);
  });

  it("uses Trim Proof naming in the demo watermark copy", () => {
    expect(assetsSource).toContain("TRIM PROOF DEMO");
    expect(assetsSource).not.toContain("PRESS FORGE DEMO");
  });
});
