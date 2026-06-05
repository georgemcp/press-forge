import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { getCreativeProvider } from "@/lib/providers";
import { ProviderUnavailableError, type GeneratedAsset } from "@/lib/providers/types";
import type { AssetSlot, CmykColor, LayoutSpec } from "./layout-spec";

export interface ResolvedAsset {
  slot: AssetSlot;
  slotId: string;
  provider: GeneratedAsset["provider"];
  mimeType: "image/png";
  bytes: Uint8Array;
  widthPx: number;
  heightPx: number;
  effectiveDpi: number;
  minimumDpi: number;
  filePath: string;
  previewPath: string;
}

function toRgb(color: CmykColor) {
  return {
    r: Math.round((1 - Math.min(1, color.c * (1 - color.k) + color.k)) * 255),
    g: Math.round((1 - Math.min(1, color.m * (1 - color.k) + color.k)) * 255),
    b: Math.round((1 - Math.min(1, color.y * (1 - color.k) + color.k)) * 255)
  };
}

function rgb(color: CmykColor, alpha = 1) {
  const value = toRgb(color);
  return `rgb(${value.r} ${value.g} ${value.b} / ${alpha})`;
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function targetDpi(slot: AssetSlot) {
  const requested = Number(process.env.TRIMPROOF_ASSET_DPI ?? 600);
  const bounded = Number.isFinite(requested) ? Math.max(300, Math.min(1200, Math.round(requested))) : 600;
  return Math.max(slot.minimumDpi, bounded);
}

function targetSize(slot: AssetSlot) {
  const dpi = targetDpi(slot);
  return {
    dpi,
    widthPx: Math.max(1, Math.ceil(slot.width * dpi)),
    heightPx: Math.max(1, Math.ceil(slot.height * dpi))
  };
}

async function createDeterministicPng(slot: AssetSlot, spec: LayoutSpec, widthPx: number, heightPx: number) {
  const hash = createHash("sha256").update(`${slot.prompt}:${spec.styleDirection}`).digest("hex");
  const bandOffset = Number.parseInt(hash.slice(0, 2), 16) % 160;
  const slant = 80 + (Number.parseInt(hash.slice(2, 4), 16) % 80);
  const paper = rgb(spec.palette.paper);
  const inkSoft = rgb(spec.palette.ink, 0.1);
  const inkHairline = rgb(spec.palette.ink, 0.16);
  const accentSoft = rgb(spec.palette.accent, 0.28);
  const accentStrong = rgb(spec.palette.accent, 0.5);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${heightPx}" viewBox="0 0 ${widthPx} ${heightPx}">
  <defs>
    <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${paper}"/>
      <stop offset="0.58" stop-color="${rgb(spec.palette.paper, 0.92)}"/>
      <stop offset="1" stop-color="${accentSoft}"/>
    </linearGradient>
    <pattern id="calibration" width="48" height="48" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
      <path d="M0 47.5H48" stroke="${inkHairline}" stroke-width="1"/>
      <path d="M23.5 0V48" stroke="${inkSoft}" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="${widthPx}" height="${heightPx}" fill="url(#paper)"/>
  <rect width="${widthPx}" height="${heightPx}" fill="url(#calibration)" opacity="0.34"/>
  <path d="M${bandOffset} ${heightPx} L${widthPx} ${heightPx - slant} L${widthPx} ${heightPx} Z" fill="${accentSoft}"/>
  <path d="M${widthPx * 0.68} 0 L${widthPx} 0 L${widthPx} ${heightPx} L${widthPx * 0.82} ${heightPx} Z" fill="${accentStrong}" opacity="0.24"/>
  <path d="M0 ${heightPx * 0.72} C${widthPx * 0.24} ${heightPx * 0.62}, ${widthPx * 0.44} ${heightPx * 0.83}, ${widthPx} ${heightPx * 0.54}" fill="none" stroke="${inkHairline}" stroke-width="6"/>
  <metadata>${escapeXml(slot.prompt)}</metadata>
</svg>`;

  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}

async function tryModelAsset(slot: AssetSlot, spec: LayoutSpec) {
  const mode = process.env.TRIMPROOF_IMAGE_PROVIDER_MODE ?? "auto";
  if (mode === "deterministic" || slot.providerHint === "deterministic") {
    return undefined;
  }

  try {
    return await getCreativeProvider(slot).generateAsset(slot, spec);
  } catch (error) {
    if (mode === "required" && !(error instanceof ProviderUnavailableError)) {
      throw error;
    }
    if (mode === "required") {
      throw error;
    }
    return undefined;
  }
}

async function normalizeAsset(slot: AssetSlot, generated: GeneratedAsset | undefined, spec: LayoutSpec, outputDir: string): Promise<ResolvedAsset> {
  const size = targetSize(slot);
  const rawBytes = generated?.bytes ? Buffer.from(generated.bytes) : await createDeterministicPng(slot, spec, size.widthPx, size.heightPx);
  const png = await sharp(rawBytes)
    .resize(size.widthPx, size.heightPx, { fit: "cover", position: "center" })
    .png({ compressionLevel: 9 })
    .toBuffer();
  const filePath = path.join(outputDir, `asset-${slot.id.replace(/[^a-z0-9-]+/gi, "-").toLowerCase()}.png`);
  const previewPath = path.join(outputDir, `asset-${slot.id.replace(/[^a-z0-9-]+/gi, "-").toLowerCase()}-preview.png`);
  const preview = await sharp(png)
    .resize({
      width: size.widthPx >= size.heightPx ? 1400 : undefined,
      height: size.heightPx > size.widthPx ? 1400 : undefined,
      fit: "inside",
      withoutEnlargement: true
    })
    .png({ compressionLevel: 8, quality: 85 })
    .toBuffer();
  await fs.writeFile(filePath, png);
  await fs.writeFile(previewPath, preview);

  return {
    slot,
    slotId: slot.id,
    provider: generated?.provider ?? "deterministic",
    mimeType: "image/png",
    bytes: Uint8Array.from(png),
    widthPx: size.widthPx,
    heightPx: size.heightPx,
    effectiveDpi: Math.min(size.widthPx / slot.width, size.heightPx / slot.height),
    minimumDpi: slot.minimumDpi,
    filePath,
    previewPath
  };
}

export async function resolveLayoutAssets(spec: LayoutSpec, outputDir: string) {
  await fs.mkdir(outputDir, { recursive: true });
  const assets: ResolvedAsset[] = [];

  for (const slot of spec.assetSlots) {
    const generated = await tryModelAsset(slot, spec);
    assets.push(await normalizeAsset(slot, generated, spec, outputDir));
  }

  return assets;
}
