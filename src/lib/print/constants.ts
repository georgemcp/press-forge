export const POINTS_PER_INCH = 72;

export const PRODUCT_PROFILES = {
  business_card: {
    id: "business_card",
    label: "Business card",
    trimWidthIn: 3.5,
    trimHeightIn: 2,
    bleedIn: 0.125,
    safeMarginIn: 0.125,
    slugIn: 0.125
  },
  postcard: {
    id: "postcard",
    label: "Postcard",
    trimWidthIn: 6,
    trimHeightIn: 4,
    bleedIn: 0.125,
    safeMarginIn: 0.125,
    slugIn: 0.125
  },
  flyer: {
    id: "flyer",
    label: "Flyer",
    trimWidthIn: 8.5,
    trimHeightIn: 11,
    bleedIn: 0.125,
    safeMarginIn: 0.25,
    slugIn: 0.125
  },
  poster: {
    id: "poster",
    label: "Poster",
    trimWidthIn: 11,
    trimHeightIn: 17,
    bleedIn: 0.125,
    safeMarginIn: 0.5,
    slugIn: 0.125
  },
  brochure: {
    id: "brochure",
    label: "Tri-fold brochure",
    trimWidthIn: 11,
    trimHeightIn: 8.5,
    bleedIn: 0.125,
    safeMarginIn: 0.25,
    slugIn: 0.125
  },
  letterhead: {
    id: "letterhead",
    label: "Letterhead",
    trimWidthIn: 8.5,
    trimHeightIn: 11,
    bleedIn: 0.125,
    safeMarginIn: 0.25,
    slugIn: 0.125
  },
  menu: {
    id: "menu",
    label: "Menu",
    trimWidthIn: 11,
    trimHeightIn: 8.5,
    bleedIn: 0.125,
    safeMarginIn: 0.25,
    slugIn: 0.125
  }
} as const;

export type ProductType = keyof typeof PRODUCT_PROFILES;

export const PRINT_PROFILES = {
  USWebCoatedSWOP: {
    id: "USWebCoatedSWOP",
    label: "US Web Coated SWOP v2",
    market: "US general commercial print"
  },
  GRACoL2013: {
    id: "GRACoL2013",
    label: "GRACoL2013",
    market: "US sheetfed/coated workflows"
  },
  FOGRA39: {
    id: "FOGRA39",
    label: "FOGRA39",
    market: "European coated workflows"
  }
} as const;

export type PrintProfileId = keyof typeof PRINT_PROFILES;

export const PRINT_WORKFLOW_PRESETS = {
  us_commercial: {
    id: "us_commercial",
    label: "US commercial default",
    shortLabel: "US commercial",
    bestFor: "Flyers, postcards, menus, and everyday local print jobs when the printer has not supplied a custom spec.",
    printProfile: "USWebCoatedSWOP",
    pdfxLevel: "PDF/X-1a:2001",
    cropMarks: true,
    colorWorkflow: "CMYK-oriented SWOP output intent for common US commercial print workflows.",
    bleedGuidance: "Keep full-bleed artwork through the product bleed edge.",
    marginGuidance: "Keep text, logos, QR codes, and offer details inside the product safe area."
  },
  sheetfed_coated: {
    id: "sheetfed_coated",
    label: "Sheetfed coated stock",
    shortLabel: "Sheetfed",
    bestFor: "Cards, brochures, and premium pieces printed on coated sheetfed workflows.",
    printProfile: "GRACoL2013",
    pdfxLevel: "PDF/X-4",
    cropMarks: true,
    colorWorkflow: "GRACoL2013 output intent for US sheetfed or coated press work.",
    bleedGuidance: "Use bleed for edge-to-edge color, photos, and background shapes.",
    marginGuidance: "Use the product safe area as the minimum live-text boundary unless the printer asks for more."
  },
  european_coated: {
    id: "european_coated",
    label: "European coated workflow",
    shortLabel: "FOGRA",
    bestFor: "EU vendors or printers that request FOGRA39 / ISO Coated style output intent.",
    printProfile: "FOGRA39",
    pdfxLevel: "PDF/X-4",
    cropMarks: true,
    colorWorkflow: "FOGRA39 output intent for European coated print workflows.",
    bleedGuidance: "Carry artwork through bleed and verify printer-requested millimeter specs before production.",
    marginGuidance: "Keep important content inside the safe area; increase margin if the vendor requests it."
  },
  digital_no_marks: {
    id: "digital_no_marks",
    label: "Digital printer, no marks",
    shortLabel: "No marks",
    bestFor: "Small-run digital printers or online vendors that impose their own marks during ordering.",
    printProfile: "USWebCoatedSWOP",
    pdfxLevel: "PDF/X-1a:2001",
    cropMarks: false,
    colorWorkflow: "CMYK-oriented SWOP output intent while leaving crop marks off for vendor-controlled imposition.",
    bleedGuidance: "Keep bleed in the file when artwork reaches the edge, even when crop marks are off.",
    marginGuidance: "Keep live text inside the safe area because online vendors may trim slightly."
  }
} as const;

export type PrintWorkflowPresetId = keyof typeof PRINT_WORKFLOW_PRESETS;

export function getPrintWorkflowPresetSummary(productType: ProductType, presetId: PrintWorkflowPresetId) {
  const product = PRODUCT_PROFILES[productType];
  const preset = PRINT_WORKFLOW_PRESETS[presetId];

  return {
    trim: `${product.trimWidthIn} x ${product.trimHeightIn} in trim`,
    bleed: `${product.bleedIn} in bleed`,
    safeMargin: `${product.safeMarginIn} in safe area`,
    pdfxLevel: preset.pdfxLevel,
    cropMarks: preset.cropMarks ? "Crop marks on" : "Crop marks off",
    printProfile: PRINT_PROFILES[preset.printProfile].label,
    colorWorkflow: preset.colorWorkflow
  };
}

export function inchesToPoints(inches: number) {
  return inches * POINTS_PER_INCH;
}

export function getPageGeometry(productType: ProductType) {
  const profile = PRODUCT_PROFILES[productType];
  const trimWidth = inchesToPoints(profile.trimWidthIn);
  const trimHeight = inchesToPoints(profile.trimHeightIn);
  const bleed = inchesToPoints(profile.bleedIn);
  const safe = inchesToPoints(profile.safeMarginIn);
  const slug = inchesToPoints(profile.slugIn);
  const mediaWidth = trimWidth + 2 * (bleed + slug);
  const mediaHeight = trimHeight + 2 * (bleed + slug);
  const bleedX = slug;
  const bleedY = slug;
  const trimX = slug + bleed;
  const trimY = slug + bleed;

  return {
    profile,
    bleed,
    safe,
    slug,
    trim: {
      x: trimX,
      y: trimY,
      width: trimWidth,
      height: trimHeight
    },
    bleedBox: {
      x: bleedX,
      y: bleedY,
      width: trimWidth + 2 * bleed,
      height: trimHeight + 2 * bleed
    },
    safeBox: {
      x: trimX + safe,
      y: trimY + safe,
      width: trimWidth - 2 * safe,
      height: trimHeight - 2 * safe
    },
    mediaBox: {
      x: 0,
      y: 0,
      width: mediaWidth,
      height: mediaHeight
    }
  };
}
