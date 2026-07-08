import { describe, expect, it } from "vitest";

import { PRODUCT_PROFILES } from "@/lib/print/constants";
import { deriveLayoutSpecFromBrief } from "@/lib/print/brief-layout";
import { sampleBriefs } from "@/lib/print/sample-briefs";

describe("sample briefs", () => {
  it("covers every supported product with a valid derived layout", () => {
    const coveredProducts = new Set(sampleBriefs.map((sample) => sample.productType));

    expect(coveredProducts).toEqual(new Set(Object.keys(PRODUCT_PROFILES)));

    for (const sample of sampleBriefs) {
      const spec = deriveLayoutSpecFromBrief({
        brief: sample.brief,
        productType: sample.productType
      });

      expect(spec.productType).toBe(sample.productType);
      expect(spec.textBlocks.length, sample.id).toBeGreaterThanOrEqual(4);
      expect(spec.assetSlots.length, sample.id).toBeGreaterThanOrEqual(1);
      expect(sample.brief, sample.id).toContain("Brand:");
    }
  });
});
