"use client";

import Image from "next/image";
import { PRODUCT_PROFILES } from "@/lib/print/constants";
import type { LayoutSpec } from "@/lib/print/layout-spec";

export function ProofPreview({ spec, previewUrl, demoArtWatermarked }: {
  spec: LayoutSpec;
  previewUrl?: string;
  demoArtWatermarked?: boolean;
}) {
  const profile = PRODUCT_PROFILES[spec.productType];
  return (
    <section className="flex min-h-0 flex-1 flex-col border-y border-border bg-surface xl:border-x xl:border-y-0">
      <div className="flex min-h-12 shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2">
        <div>
          <h2 className="font-display text-sm font-semibold text-surface-ink">{profile.label} proof</h2>
          <p className="text-xs text-muted">{profile.trimWidthIn} in × {profile.trimHeightIn} in trim, {profile.bleedIn} in bleed</p>
        </div>
        {previewUrl && demoArtWatermarked ? <span className="text-xs font-semibold text-brand">Watermarked demo</span> : null}
      </div>
      <div className="print-grid flex min-h-64 flex-1 items-center justify-center overflow-auto p-4">
        {previewUrl ? (
          <div className="relative w-full max-w-[860px] bg-white shadow-lg" style={{ aspectRatio: `${profile.trimWidthIn + 0.5} / ${profile.trimHeightIn + 0.5}` }}>
            <Image src={previewUrl} alt="Rendered PDF proof showing the generated text, artwork and page layout" fill unoptimized sizes="(min-width: 1280px) 52vw, 94vw" className="object-contain" />
          </div>
        ) : (
          <p className="max-w-sm text-center text-sm leading-6 text-muted">Generate a proof to see the rendered design. Your preview will appear here when it is ready.</p>
        )}
      </div>
      {previewUrl ? <p className="border-t border-border px-4 py-2 text-xs text-muted">Check the wording, layout and your printer’s requirements before using this file.</p> : null}
    </section>
  );
}
