import { describe, expect, it } from "vitest";
import { getPageGeometry } from "@/lib/print/constants";

describe("print geometry", () => {
  it("computes business-card trim and bleed dimensions in points", () => {
    const geometry = getPageGeometry("business_card");

    expect(geometry.trim.width).toBe(252);
    expect(geometry.trim.height).toBe(144);
    expect(geometry.bleedBox.width).toBe(270);
    expect(geometry.bleedBox.height).toBe(162);
  });
});
