import { describe, expect, it } from "vitest";
import {
  PRINT_PROFILES,
  PRINT_WORKFLOW_PRESETS,
  getPrintWorkflowPresetSummary,
  type PrintWorkflowPresetId,
} from "@/lib/print/constants";

describe("print workflow presets", () => {
  it("only references supported print profiles and explicit PDF/X targets", () => {
    for (const preset of Object.values(PRINT_WORKFLOW_PRESETS)) {
      expect(preset.printProfile in PRINT_PROFILES).toBe(true);
      expect(["PDF/X-1a:2001", "PDF/X-4"]).toContain(preset.pdfxLevel);
      expect(typeof preset.cropMarks).toBe("boolean");
      expect(preset.colorWorkflow).toMatch(/output intent|CMYK/i);
      expect(preset.bestFor.length).toBeGreaterThan(30);
    }
  });

  it("summarizes trim, bleed, safe area, marks, and color workflow for the selected product", () => {
    const summary = getPrintWorkflowPresetSummary("flyer", "sheetfed_coated");

    expect(summary).toEqual({
      trim: "8.5 x 11 in trim",
      bleed: "0.125 in bleed",
      safeMargin: "0.25 in safe area",
      pdfxLevel: "PDF/X-4",
      cropMarks: "Crop marks on",
      printProfile: "GRACoL2013",
      colorWorkflow: "GRACoL2013 output intent for US sheetfed or coated press work."
    });
  });

  it("keeps the no-marks preset explicit about vendor imposition", () => {
    const presetId: PrintWorkflowPresetId = "digital_no_marks";
    const preset = PRINT_WORKFLOW_PRESETS[presetId];
    const summary = getPrintWorkflowPresetSummary("business_card", presetId);

    expect(preset.cropMarks).toBe(false);
    expect(preset.bestFor).toContain("impose their own marks");
    expect(summary.cropMarks).toBe("Crop marks off");
    expect(summary.safeMargin).toBe("0.125 in safe area");
  });
});
